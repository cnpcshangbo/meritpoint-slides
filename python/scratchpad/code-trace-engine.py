"""Bounded Python execution snapshots for the courseware code visualizer.

This is an educational tracer, not a security sandbox. Run it in a disposable
browser worker with a host-owned wall-clock timeout. ``run_code_trace_json``
returns {ok, status, steps, error, limits}. A step has event, line, globals,
frames, heap and cumulative stdout. Bindings are {name, value}; values are
{kind: 'value', type, text} or {kind: 'ref', id}. Heap records have id, type and
items (sequences), entries (dict [key, value] pairs), or attributes (bindings).
Heap/frame identities are stable within one run. A 'line' step is BEFORE that
line executes; 'done' is the completed state. Calls, returns, generator yields
and resumes are distinct events. 'unwind' means an exception leaves a frame.
Caught exceptions are ordinary 'exception' steps, and only a terminal 'error'
means the program failed.
"""

import builtins
import contextlib
import dis
import io
import itertools
import json
import sys
import types


STUDENT_FILENAME = "<courseware>"
MAX_CODE = 20000
MAX_STEPS = 500
MAX_OUTPUT = 12000
MAX_ITEMS = 30
MAX_OBJECTS = 80
MAX_BINDINGS = 60
MAX_FRAMES = 32
MAX_TEXT = 400
MAX_VALUES = 1000
_TYPE_NAME = type.__dict__["__name__"]
_TYPE_MRO = type.__dict__["__mro__"]
_TYPE_DICT = type.__dict__["__dict__"]


class _TraceLimit(BaseException):
    """Stop short classroom examples without being caught by except Exception."""


def _short(text, limit=MAX_TEXT):
    return text if len(text) <= limit else text[:limit - 1] + "…"


def _type_name(value):
    # Bypass custom metaclass __getattribute__ methods AND properties.
    return _short(_TYPE_NAME.__get__(type(value)), 100)


def _one_of(kind, *choices):
    # Class equality itself can execute a custom metaclass method.
    return any(kind is candidate for candidate in choices)


def _leaf(value):
    """Return a display leaf, or None for an identity-bearing heap value.

    Only exact built-in types get repr; a student's repr/property must never
    run inside a trace callback, where tracing and step limits are suspended.
    """
    kind = type(value)
    text = None
    if value is None or _one_of(kind, bool, float, complex):
        text = repr(value)
    elif kind is int:
        if int.bit_length(value) > 1200:
            text = "<int: " + str(int.bit_length(value)) + " bits>"
        else:
            text = repr(value)
    elif _one_of(kind, str, bytes):
        text = _short(repr(value[:MAX_TEXT]))
        if len(value) > MAX_TEXT:
            text = _short(text, MAX_TEXT - 1) + "…"
    elif kind is types.FunctionType:
        text = "<function " + _short(value.__name__, 100) + ">"
    elif kind is types.BuiltinFunctionType:
        text = "<built-in function " + _short(value.__name__, 100) + ">"
    elif kind is types.MethodType:
        function = value.__func__
        name = function.__name__ if type(function) is types.FunctionType else _type_name(function)
        text = "<method " + _short(name, 100) + ">"
    elif kind is types.ModuleType:
        name = value.__dict__.get("__name__")
        text = "<module " + (_short(name, 100) if type(name) is str else "?") + ">"
    elif any(base is type for base in _TYPE_MRO.__get__(kind)):
        text = "<class " + _short(_TYPE_NAME.__get__(value), 100) + ">"
    elif kind is range:
        parts = [_leaf(value.start)["text"], _leaf(value.stop)["text"]]
        if value.step != 1:
            parts.append(_leaf(value.step)["text"])
        text = "range(" + ", ".join(parts) + ")"
    if text is None:
        return None
    return {"kind": "value", "type": _type_name(value), "text": _short(text)}


def _notice(text):
    return {"kind": "value", "type": "notice", "text": text}


def _instance_attributes(value):
    """Read stored fields using real descriptors, never user properties."""
    attributes = []
    names = set()
    kind = type(value)
    classes = _TYPE_MRO.__get__(kind)[:MAX_FRAMES]
    for cls in classes:
        namespace = _TYPE_DICT.__get__(cls)
        descriptor = namespace.get("__dict__")
        if type(descriptor) is types.GetSetDescriptorType:
            try:
                stored = descriptor.__get__(value, kind)
            except (AttributeError, TypeError):
                stored = None
            if type(stored) is dict:
                for name, item in itertools.islice(stored.items(), MAX_ITEMS + 1):
                    if type(name) is str and name not in names:
                        names.add(name)
                        attributes.append((name, item))
                        if len(attributes) > MAX_ITEMS:
                            return attributes
                break
    for cls in classes:
        namespace = _TYPE_DICT.__get__(cls)
        # Bound descriptor inspection as well as the resulting attributes.
        for name, descriptor in itertools.islice(namespace.items(), MAX_BINDINGS):
            if type(descriptor) is not types.MemberDescriptorType or name in names:
                continue
            try:
                item = descriptor.__get__(value, kind)
            except (AttributeError, TypeError):
                continue
            names.add(name)
            attributes.append((name, item))
            if len(attributes) > MAX_ITEMS:
                return attributes
    return attributes


class _Snapshot:
    def __init__(self, owner):
        self.owner = owner
        self.heap = []
        self.queued = []
        self.seen = set()
        self.values_left = MAX_VALUES
        self.truncated = False

    def value(self, value):
        if self.values_left <= 0:
            self.truncated = True
            return _notice("More values omitted")
        self.values_left -= 1
        leaf = _leaf(value)
        if leaf is not None:
            return leaf
        identity = id(value)
        if identity in self.seen:
            return {"kind": "ref", "id": self.owner.objects[identity][0]}
        if len(self.seen) >= MAX_OBJECTS:
            self.truncated = True
            return _notice("More objects omitted")
        if identity not in self.owner.objects:
            # Hold a strong reference for this run so Python cannot reuse ids.
            self.owner.objects[identity] = ("o" + str(len(self.owner.objects) + 1), value)
        label = self.owner.objects[identity][0]
        self.seen.add(identity)
        record = {"id": label, "type": _type_name(value)}
        self.heap.append(record)
        self.queued.append((value, record))
        return {"kind": "ref", "id": label}

    def bindings(self, values):
        result = []
        inspected = 0
        for name, value in values.items():
            inspected += 1
            if inspected > MAX_BINDINGS * 2:
                self.truncated = True
                result.append({"name": "…", "value": _notice("More variables omitted")})
                break
            if type(name) is not str or name.startswith("__"):
                continue
            if len(result) >= MAX_BINDINGS or self.values_left <= 0:
                self.truncated = True
                result.append({"name": "…", "value": _notice("More variables omitted")})
                break
            result.append({"name": _short(name, 100), "value": self.value(value)})
        return result

    def finish(self):
        # Iterate a queue to support deep graphs and cycles without recursion.
        index = 0
        while index < len(self.queued):
            value, record = self.queued[index]
            index += 1
            kind = type(value)
            mro = _TYPE_MRO.__get__(kind)
            container = next((base for base in mro if _one_of(base, list, tuple, set, frozenset, dict)), None)
            if container in (list, tuple, set, frozenset):
                record["items"] = [self.value(item) for item in itertools.islice(container.__iter__(value), MAX_ITEMS)]
                record["size"] = container.__len__(value)
                record["truncated"] = record["size"] > MAX_ITEMS
                if container is not kind:
                    record["containerType"] = _TYPE_NAME.__get__(container)
            elif container is dict:
                record["entries"] = [
                    [self.value(key), self.value(item)]
                    for key, item in itertools.islice(dict.items(value), MAX_ITEMS)
                ]
                record["size"] = dict.__len__(value)
                record["truncated"] = record["size"] > MAX_ITEMS
                if container is not kind:
                    record["containerType"] = "dict"
            else:
                attributes = _instance_attributes(value)
                record["attributes"] = [
                    {"name": _short(name, 100), "value": self.value(item)}
                    for name, item in attributes[:MAX_ITEMS]
                ]
                record["truncated"] = len(attributes) > MAX_ITEMS
            self.truncated = self.truncated or record["truncated"]
        return self.heap


class _Output(io.TextIOBase):
    def __init__(self):
        self.text = ""

    def writable(self):
        return True

    def write(self, value):
        if not isinstance(value, str):
            raise TypeError("write() argument must be str")
        available = MAX_OUTPUT - len(self.text)
        self.text += value[:available]
        if len(value) > available:
            raise _TraceLimit("Output limit reached (12,000 characters). Shorten the program or its output.")
        return len(value)


def _no_input(*args, **kwargs):
    raise RuntimeError("input() is not supported in the visualizer. Assign a sample value in the code instead.")


def _error_details(error, line=None):
    kind = _type_name(error)
    try:
        args = BaseException.args.__get__(error, type(error))
    except (AttributeError, TypeError):
        args = ()
    parts = []
    for arg in args[:3]:
        if type(arg) is str:
            parts.append(_short(arg))
        else:
            leaf = _leaf(arg)
            parts.append(leaf["text"] if leaf else "<" + _type_name(arg) + ">")
    return {"type": kind, "message": _short("; ".join(parts) or kind), "line": line}


class _Trace:
    def __init__(self, namespace, output):
        self.namespace = namespace
        self.output = output
        self.steps = []
        self.objects = {}
        self.frame_ids = {}
        self.frame_exceptions = {}
        self.suspended_frames = set()
        self.last_line = None

    def capture(self, event, frame=None, arg=None, message=None, terminal=False):
        if not terminal and len(self.steps) >= MAX_STEPS - 1:
            raise _TraceLimit("Step limit reached (500 steps). Use a smaller example or fewer loop iterations.")
        snapshot = _Snapshot(self)
        line = frame.f_lineno if frame is not None else self.last_line
        if line is not None and line <= 0:
            line = None
        step = {"event": event, "line": line, "globals": snapshot.bindings(self.namespace),
                "frames": [], "stdout": self.output.text}
        chain = []
        cursor = frame
        inspected = 0
        while cursor is not None and inspected < MAX_FRAMES * 4:
            inspected += 1
            if cursor.f_code.co_filename == STUDENT_FILENAME and cursor.f_code.co_name != "<module>":
                chain.append(cursor)
            cursor = cursor.f_back
        if cursor is not None:
            snapshot.truncated = True
        if len(chain) > MAX_FRAMES:
            chain = chain[:MAX_FRAMES]
            snapshot.truncated = True
        for active in reversed(chain):
            identity = id(active)
            if identity not in self.frame_ids:
                # Retain frames until recording finishes to prevent id reuse.
                self.frame_ids[identity] = ("f" + str(len(self.frame_ids) + 1), active)
            step["frames"].append({"id": self.frame_ids[identity][0],
                                   "name": _short(active.f_code.co_name, 100),
                                   "line": active.f_lineno,
                                   "locals": snapshot.bindings(active.f_locals)})
        if event == "return":
            step["returnValue"] = snapshot.value(arg)
        if event == "yield":
            step["yieldValue"] = snapshot.value(arg)
        if message:
            step["message"] = message
        step["heap"] = snapshot.finish()
        if snapshot.truncated:
            step["truncated"] = True
        self.steps.append(step)
        self.last_line = line

    def callback(self, frame, event, arg):
        if frame.f_code.co_filename != STUDENT_FILENAME:
            return None
        if event == "call" and frame.f_code.co_name == "<module>":
            return self.callback
        if event == "return" and frame.f_code.co_name == "<module>":
            return self.callback
        if event == "call" and id(frame) in self.suspended_frames:
            self.suspended_frames.remove(id(frame))
            self.capture("resume", frame)
        elif event == "exception":
            if any(base is _TraceLimit for base in _TYPE_MRO.__get__(type(arg[1]))):
                return self.callback
            detail = _error_details(arg[1], frame.f_lineno)
            self.frame_exceptions[id(frame)] = detail["type"] + ": " + detail["message"]
            self.capture(event, frame, message=detail["type"] + ": " + detail["message"])
        elif event == "return":
            # Python also emits 'return', with None, when an exception unwinds
            # a frame. A pending exception alone is insufficient: finally can
            # execute more lines before re-raising or deliberately returning.
            opcode = dis.opname[frame.f_code.co_code[frame.f_lasti]]
            # Python 3.13 points at the RESUME after YIELD_VALUE; 3.12 and
            # earlier point at YIELD_VALUE itself.
            if opcode == "RESUME" and frame.f_lasti >= 2:
                previous = dis.opname[frame.f_code.co_code[frame.f_lasti - 2]]
                if previous in ("YIELD_VALUE", "YIELD_FROM"):
                    opcode = previous
            exception = self.frame_exceptions.pop(id(frame), None)
            if opcode in ("YIELD_VALUE", "YIELD_FROM"):
                self.suspended_frames.add(id(frame))
                self.capture("yield", frame, arg)
            elif opcode not in ("RETURN_VALUE", "RETURN_CONST"):
                self.capture("unwind", frame, message=exception or "An exception is leaving this frame.")
            else:
                self.capture(event, frame, arg)
        elif event in ("line", "call", "return"):
            self.capture(event, frame, arg)
        return self.callback


def run_code_trace_json(code):
    """Execute one snippet and return a JSON string of bounded snapshots."""
    output = _Output()
    student_builtins = dict(vars(builtins))
    student_builtins["input"] = _no_input
    namespace = {"__name__": "__main__", "__builtins__": student_builtins}
    trace = _Trace(namespace, output)
    error = None
    status = "complete"
    terminal_frame = None
    previous_trace = sys.gettrace()
    try:
        if type(code) is not str:
            raise TypeError("Code must be a string.")
        if len(code) > MAX_CODE:
            raise ValueError("Code is too long. Use a snippet under 20,000 characters.")
        compiled = compile(code, STUDENT_FILENAME, "exec")
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            try:
                sys.settrace(trace.callback)
                exec(compiled, namespace, namespace)
            finally:
                sys.settrace(previous_trace)
    except _TraceLimit as exc:
        status = "limit"
        error = _error_details(exc, trace.last_line)
        error["type"] = "TraceLimit"
        tb = BaseException.__traceback__.__get__(exc)
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == STUDENT_FILENAME:
                terminal_frame = tb.tb_frame
            tb = tb.tb_next
    except BaseException as exc:
        status = "error"
        line = exc.lineno if _one_of(type(exc), SyntaxError, IndentationError, TabError) else trace.last_line
        tb = BaseException.__traceback__.__get__(exc)
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == STUDENT_FILENAME:
                line = tb.tb_lineno
                terminal_frame = tb.tb_frame
            tb = tb.tb_next
        error = _error_details(exc, line)
        if _one_of(type(exc), SyntaxError, IndentationError, TabError):
            error["message"] = _short(exc.msg)
        trace.last_line = line
    trace.capture("done" if status == "complete" else status, frame=terminal_frame,
                  message=None if error is None else error["type"] + ": " + error["message"],
                  terminal=True)
    result = {"ok": status == "complete", "status": status, "steps": trace.steps,
              "error": error, "limits": {"maxSteps": MAX_STEPS, "maxOutput": MAX_OUTPUT,
                                         "maxItems": MAX_ITEMS, "maxObjects": MAX_OBJECTS}}
    # Clear retained frames/objects after immutable snapshots have been made.
    trace.frame_ids.clear()
    trace.frame_exceptions.clear()
    trace.suspended_frames.clear()
    trace.objects.clear()
    return json.dumps(result, ensure_ascii=True, allow_nan=False)
