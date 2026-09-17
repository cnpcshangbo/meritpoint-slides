"""Small, traceable Python teaching world.

This is an educational interpreter wrapper, NOT a security sandbox. The browser
must run it in a disposable worker and terminate that worker on a time limit.
"""

import contextlib
import io
import itertools
import json
import math
import sys
import types


CODE_LIMIT = 16000
OUTPUT_LIMIT = 8000
MOVE_LIMIT = 100
ACTION_LIMIT = 500
DEFAULT_LINE_LIMIT = 1000
STUDENT_FILENAME = "<student>"
JS_SAFE_INTEGER = (1 << 53) - 1
API_NAMES = frozenset(("move_forward", "turn_left", "turn_right", "is_blocked",
                       "at_goal", "say", "get_position", "get_moves"))


class StepLimitError(RuntimeError):
    """The program executed too many lines for a short classroom animation."""


class MoveLimitError(RuntimeError):
    """The program requested more successful moves than the world allows."""


class CollisionError(RuntimeError):
    """The robot tried to enter a wall or leave the board."""


def _short(text, limit=240):
    return text if len(text) <= limit else text[:limit - 1] + "…"


def _integer_repr(value):
    # CPython limits decimal conversion to 4300 digits by default. Keep values
    # exact up to 4000 digits; explicitly omit extreme values instead of rounding.
    if value.bit_length() > 13287:
        return f"<int with {value.bit_length()} bits; display limit reached>"
    try:
        return repr(value)
    except ValueError:
        return f"<int with {value.bit_length()} bits; decimal display unavailable>"


def _bounded_repr(value, depth=0, seen=None, budget=None, limit=400):
    """Bounded Python notation for collections JSON cannot faithfully express.

    Built-in repr(container) can run a student's arbitrary __repr__ while our
    tracer is suspended. Format built-in containers ourselves instead.
    """
    if seen is None:
        seen = set()
    if budget is None:
        budget = [128]
    if budget[0] <= 0:
        return "…"
    budget[0] -= 1
    kind = type(value)
    if value is None or kind in (bool, float):
        return repr(value)
    if kind is int:
        return _short(_integer_repr(value), limit)
    if kind in (str, bytes):
        text = repr(value[:limit])
        return _short(text, limit) + ("…" if len(value) > limit and len(text) < limit else "")
    if kind in (dict, list, tuple, set, frozenset):
        if id(value) in seen:
            return "{...}" if kind in (dict, set, frozenset) else "[...]" if kind is list else "(...)"
        if depth >= 4:
            return "<" + kind.__name__ + ": …>"
        seen = seen | {id(value)}
        if kind is set and not value:
            return "set()"
        if kind is frozenset and not value:
            return "frozenset()"
        if kind is dict:
            entries = list(itertools.islice(value.items(), 24))
        else:
            entries = list(itertools.islice(value, 24))
        parts = []
        for item in entries:
            if budget[0] <= 0:
                parts.append("…")
                break
            if kind is dict:
                key, item = item
                parts.append(_bounded_repr(key, depth + 1, seen, budget, limit) + ": " +
                             _bounded_repr(item, depth + 1, seen, budget, limit))
            else:
                parts.append(_bounded_repr(item, depth + 1, seen, budget, limit))
            if sum(map(len, parts)) >= limit:
                if len(parts) < len(value):
                    parts.append("…")
                break
        if len(value) > 24 and (not parts or parts[-1] != "…"):
            parts.append("…")
        body = ", ".join(parts)
        if kind is dict or kind is set:
            rendered = "{" + body + "}"
        elif kind is frozenset:
            rendered = "frozenset({" + body + "})"
        elif kind is list:
            rendered = "[" + body + "]"
        else:
            rendered = "(" + body + ("," if len(value) == 1 else "") + ")"
        return _short(rendered, limit)
    if kind is types.FunctionType:
        return "<function " + value.__name__ + ">"
    if kind is types.ModuleType:
        return "<module " + value.__name__ + ">"
    if kind is type:
        return "<class " + value.__name__ + ">"
    return _short(object.__repr__(value), min(limit, 160))


def _safe_value(value, depth=0, seen=None, budget=None):
    """Copy values now so later mutation cannot rewrite an earlier event."""
    if seen is None:
        seen = set()
    if budget is None:
        budget = [128]
    if budget[0] <= 0:
        return "<more values>"
    budget[0] -= 1
    kind = type(value)
    if value is None or kind is bool:
        return value
    if kind is int:
        return value if -JS_SAFE_INTEGER <= value <= JS_SAFE_INTEGER else _integer_repr(value)
    if kind is float:
        return value if math.isfinite(value) else str(value)
    if kind is str:
        return _short(value, 400)
    if kind in (list, tuple, dict, set, frozenset):
        if id(value) in seen:
            return "<circular reference>"
        if depth >= 4:
            return "<" + kind.__name__ + ": …>"
        if kind in (set, frozenset):
            return _bounded_repr(value, depth, seen, budget)
        if kind is dict and any(type(key) is not str or len(key) > 160 for key in value):
            return _bounded_repr(value, depth, seen, budget)
        seen = seen | {id(value)}
        if kind is dict:
            result = {}
            for index, (key, item) in enumerate(value.items()):
                if index >= 24 or budget[0] <= 0:
                    result["…"] = "<more entries>"
                    break
                result[key] = _safe_value(item, depth + 1, seen, budget)
            return result
        values = value[:24] if kind in (list, tuple) else list(itertools.islice(value, 24))
        result = []
        for item in values:
            if budget[0] <= 0:
                result.append("<more values>")
                break
            result.append(_safe_value(item, depth + 1, seen, budget))
        if len(value) > 24:
            result.append("<more entries>")
        return result
    if kind is types.FunctionType:
        return "<function " + value.__name__ + ">"
    if kind is types.ModuleType:
        return "<module " + value.__name__ + ">"
    if kind is type:
        return "<class " + value.__name__ + ">"
    # Never call a student's __repr__ while the tracer is suspended.
    return _short(object.__repr__(value), 160)


def _snapshot_locals(frame):
    result = {}
    budget = [256]
    for name, value in frame.f_locals.copy().items():
        if name.startswith("__") or name in API_NAMES:
            continue
        if len(result) >= 40:
            result["…"] = {"type": "notice", "value": "More variables omitted"}
            break
        result[name] = {"type": type(value).__name__, "value": _safe_value(value, budget=budget)}
    return result


class _Output(io.TextIOBase):
    def __init__(self):
        self.text = ""
        self.truncated = False

    def writable(self):
        return True

    def write(self, text):
        if not isinstance(text, str):
            raise TypeError("write() argument must be str")
        original_length = len(text)
        if not self.truncated:
            available = OUTPUT_LIMIT - len(self.text)
            if len(text) <= available:
                self.text += text
            else:
                marker = "\n… Output limit reached."
                self.text = (self.text + text)[:OUTPUT_LIMIT - len(marker)] + marker
                self.truncated = True
        return original_length

    def flush(self):
        pass


def _integer(value, name, minimum, maximum):
    if type(value) is not int or not minimum <= value <= maximum:
        raise ValueError(f"{name} must be an integer from {minimum} to {maximum}.")
    return value


class _World:
    def __init__(self, config, output):
        if not isinstance(config, dict):
            raise ValueError("config must be a dictionary.")
        self.width = _integer(config.get("width", 6), "width", 1, 30)
        self.height = _integer(config.get("height", 6), "height", 1, 30)
        self.x, self.y = self._point(config.get("start", [0, self.height - 1]), "start")
        self.goal = self._point(config.get("goal", [self.width - 1, 0]), "goal")
        self.direction = _integer(config.get("direction", 0), "direction", 0, 3)
        self.walls = {tuple(self._point(point, "wall")) for point in config.get("walls", [])}
        if (self.x, self.y) in self.walls or tuple(self.goal) in self.walls:
            raise ValueError("The start and goal cells cannot contain walls.")
        self.trail = [[self.x, self.y]]
        self.moves = 0
        self.speech = ""
        self.output = output
        self.events = []
        self.executed_lines = 0
        self.actions = 0
        self.unwinding = set()
        requested_limit = config.get("max_steps", DEFAULT_LINE_LIMIT)
        if type(requested_limit) is not int:
            raise ValueError("max_steps must be an integer.")
        self.line_limit = max(500, min(1500, requested_limit))
        self.last_line = None

    def _point(self, point, label):
        if not isinstance(point, (list, tuple)) or len(point) != 2:
            raise ValueError(f"{label} must be [x, y].")
        return [_integer(point[0], label + ".x", 0, self.width - 1),
                _integer(point[1], label + ".y", 0, self.height - 1)]

    def snapshot(self):
        return {"width": self.width, "height": self.height, "x": self.x, "y": self.y,
                "direction": self.direction, "goal": self.goal[:],
                "walls": [list(point) for point in sorted(self.walls)],
                "trail": [point[:] for point in self.trail], "moves": self.moves,
                "speech": self.speech}

    def event(self, frame, phase, message=""):
        line = frame.f_lineno if frame is not None else self.last_line
        self.events.append({"line": line, "phase": phase, "message": _short(message, 500),
                            "locals": _snapshot_locals(frame) if frame is not None else {},
                            "world": self.snapshot(), "output": self.output.text})

    def _action(self, message):
        self.actions += 1
        if self.actions > ACTION_LIMIT:
            raise StepLimitError("This run reached the limit of 500 actions. Shorten the program and try again.")
        frame = sys._getframe(1)
        while frame is not None and frame.f_code.co_filename != STUDENT_FILENAME:
            frame = frame.f_back
        self.event(frame, "action", message)

    def _next_position(self):
        dx, dy = ((1, 0), (0, -1), (-1, 0), (0, 1))[self.direction]
        return self.x + dx, self.y + dy

    def is_blocked(self):
        x, y = self._next_position()
        return not (0 <= x < self.width and 0 <= y < self.height) or (x, y) in self.walls

    def at_goal(self):
        return [self.x, self.y] == self.goal

    def get_position(self):
        return self.x, self.y

    def get_moves(self):
        return self.moves

    def move_forward(self, steps=1):
        if type(steps) is not int or steps < 0:
            raise ValueError("The steps argument of move_forward(steps) must be a non-negative integer.")
        for _ in range(steps):
            if self.moves >= MOVE_LIMIT:
                raise MoveLimitError("This run reached the limit of 100 forward moves. Shorten the route and try again.")
            if self.is_blocked():
                raise CollisionError("There is a wall or map boundary ahead. Check is_blocked() or turn first.")
            self.x, self.y = self._next_position()
            self.moves += 1
            self.trail.append([self.x, self.y])
            self._action(f"Move to ({self.x}, {self.y})")

    def turn_left(self):
        self.direction = (self.direction + 1) % 4
        self._action("Turn left 90°")

    def turn_right(self):
        self.direction = (self.direction - 1) % 4
        self._action("Turn right 90°")

    def say(self, value):
        message = str(value)
        self.speech = _short(message, 240)
        self.output.write(message + "\n")
        self._action(self.speech)

    def trace(self, frame, event, arg):
        if frame.f_code.co_filename != STUDENT_FILENAME:
            return None
        if event == "line":
            self.unwinding.discard(id(frame))
            self.last_line = frame.f_lineno
            self.executed_lines += 1
            if self.executed_lines > self.line_limit:
                raise StepLimitError(f"The program executed {self.line_limit} lines. Check the loop's stopping condition and try again.")
            self.event(frame, "before", f"About to execute line {frame.f_lineno}")
        elif event == "exception":
            self.unwinding.add(id(frame))
        elif event == "return":
            if id(frame) in self.unwinding:
                self.unwinding.discard(id(frame))
                return self.trace
            name = frame.f_code.co_name
            if name == "<module>":
                message = "Program finished"
            else:
                message = f"{name} returns {_short(str(_safe_value(arg)), 160)}"
            self.event(frame, "return", message)
        return self.trace


def _error_details(exc, fallback_line=None):
    line = getattr(exc, "lineno", None) if isinstance(exc, SyntaxError) else None
    traceback = exc.__traceback__
    while traceback is not None:
        if traceback.tb_frame.f_code.co_filename == STUDENT_FILENAME:
            line = traceback.tb_lineno
        traceback = traceback.tb_next
    try:
        message = str(exc)
    except BaseException:
        message = "Exception details could not be displayed."
    return {"type": type(exc).__name__, "message": _short(message, 1000),
            "line": line if line is not None else fallback_line}


def run_student(code, config=None):
    """Execute actual Python, returning finite trace snapshots and final state.

    Result: {ok: bool, events: [event], world: snapshot | None,
             output: str, error: {type, message, line} | None}.
    max_steps is clamped to 500..1500 executed student lines. The host worker
    timeout is still required for blocking/native code and deliberate misuse.
    """
    output = _Output()
    world = None
    error = None
    try:
        if not isinstance(code, str):
            raise TypeError("code must be a string.")
        if len(code) > CODE_LIMIT:
            raise ValueError("Code must contain no more than 16000 characters.")
        world = _World({} if config is None else config, output)
        compiled = compile(code, STUDENT_FILENAME, "exec")
        namespace = {"__name__": "__main__", "__builtins__": __builtins__}
        namespace.update({name: getattr(world, name) for name in API_NAMES})
        previous_trace = sys.gettrace()
        try:
            with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
                sys.settrace(world.trace)
                exec(compiled, namespace, namespace)
        finally:
            sys.settrace(previous_trace)
    except BaseException as exc:
        error = _error_details(exc, world.last_line if world is not None else None)
        if world is not None:
            frame = None
            traceback = exc.__traceback__
            while traceback is not None:
                if traceback.tb_frame.f_code.co_filename == STUDENT_FILENAME:
                    frame = traceback.tb_frame
                traceback = traceback.tb_next
            world.event(frame, "error", error["type"] + ": " + error["message"])
            world.events[-1]["line"] = error["line"]
    return {"ok": error is None, "events": world.events if world else [],
            "world": world.snapshot() if world else None,
            "output": output.text, "error": error}


def run_student_json(payload):
    """JSON bridge used by worker.js; no student text enters Python source."""
    arguments = json.loads(payload)
    return json.dumps(run_student(arguments.get("code"), arguments.get("config")),
                      ensure_ascii=False, allow_nan=False)
