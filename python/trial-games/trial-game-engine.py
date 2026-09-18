"""One-frame pygame Surface runner for optional browser games.

Run in a fresh, disposable worker. This is not a security sandbox; the browser
host owns loading/frame deadlines and terminates non-returning student code.
Student code defines update(dt, keys) and draw(screen). No SDL window is opened.
"""
import builtins
import contextlib
import io
import inspect
import json
import math
import traceback

import pygame

WIDTH = 480
HEIGHT = 320
MAX_CODE = 20000
MAX_OUTPUT = 12000
MAX_STATE = 24
KEYS = frozenset({"left", "right", "up", "down", "space"})


class GameOutput(io.TextIOBase):
    def __init__(self):
        self.text = ""
        self.truncated = False

    def writable(self):
        return True

    def write(self, text):
        available = MAX_OUTPUT - len(self.text)
        self.text += text[:available]
        self.truncated = self.truncated or len(text) > available
        return len(text)


def _browser_display(*args, **kwargs):
    raise RuntimeError(
        "This browser game uses update(dt, keys) and draw(screen). "
        "Draw on the supplied screen; do not call pygame.init(), "
        "pygame.display, or pygame.event. Download the desktop program "
        "to use a native pygame window."
    )


def _browser_sound(*args, **kwargs):
    raise RuntimeError("pygame audio is not provided in this browser game. Try a visual effect instead.")


def _browser_input(*args, **kwargs):
    raise RuntimeError("Use the keys set in update(dt, keys) instead of input().")


def configure_browser_pygame():
    # Native SDL video initialization fatally fails in a Pyodide worker.
    # These supported-API guards provide useful errors, not a security boundary.
    pygame.init = _browser_display
    for name in ("init", "set_mode", "flip", "update", "get_surface"):
        setattr(pygame.display, name, _browser_display)
    for name in ("get", "poll", "wait", "pump", "post"):
        setattr(pygame.event, name, _browser_display)
    pygame.mixer.init = _browser_sound


def _scalar_state(namespace):
    state = {}
    count = 0
    for name, value in namespace.items():
        if type(name) is not str or name.startswith("_") or name in {"WIDTH", "HEIGHT"}:
            continue
        kind = type(value)
        if value is None or kind is bool:
            rendered = value
        elif kind is int:
            bits = int.bit_length(value)
            rendered = value if bits <= 53 else str(value) if bits <= 200 else "<integer: %d bits>" % bits
        elif kind is float:
            rendered = value if math.isfinite(value) else str(value)
        elif kind is str:
            rendered = value[:200] + ("…" if len(value) > 200 else "")
        else:
            continue  # Never invoke student __repr__, properties, or iteration.
        count += 1
        if len(state) < MAX_STATE:
            state[name[:80]] = rendered
    return state, count > MAX_STATE


class GameSession:
    def __init__(self, code, width=WIDTH, height=HEIGHT):
        if type(code) is not str or len(code) > MAX_CODE:
            raise ValueError("Keep a game under 20,000 characters.")
        if type(width) is not int or type(height) is not int or (width, height) != (WIDTH, HEIGHT):
            raise ValueError("The browser game canvas is 480 × 320 pixels.")
        self.output = GameOutput()
        self.namespace = {
            "__name__": "__student_game__",
            "__builtins__": dict(vars(builtins), input=_browser_input),
            "WIDTH": width,
            "HEIGHT": height,
        }
        self.screen = pygame.Surface((width, height))
        self.frames = 0
        self.failed = False
        self.error = ""
        with contextlib.redirect_stdout(self.output), contextlib.redirect_stderr(self.output):
            try:
                exec(compile(code, "<my-game>", "exec"), self.namespace, self.namespace)
                for name, signature in (("update", "update(dt, keys)"), ("draw", "draw(screen)")):
                    callback = self.namespace.get(name)
                    if not callable(callback):
                        raise ValueError("Define %s before starting the game." % signature)
                    if inspect.iscoroutinefunction(callback) or inspect.isasyncgenfunction(callback) or inspect.isgeneratorfunction(callback):
                        raise ValueError("Use a regular def %s without async or yield; the page schedules each frame." % signature)
            except BaseException as error:
                self._fail(error)

    def _fail(self, error):
        self.failed = True
        self.error = "".join(traceback.format_exception(type(error), error, error.__traceback__, limit=8))[-6000:]

    def snapshot(self):
        state, truncated = _scalar_state(self.namespace)
        return {
            "ok": not self.failed,
            "width": WIDTH,
            "height": HEIGHT,
            "frame": self.frames,
            "output": self.output.text,
            "outputTruncated": self.output.truncated,
            "state": state,
            "stateTruncated": truncated,
            "error": self.error,
        }

    def tick(self, dt, keys):
        if self.failed:
            return None
        with contextlib.redirect_stdout(self.output), contextlib.redirect_stderr(self.output):
            try:
                if type(dt) not in (int, float) or not math.isfinite(dt) or not 0 <= dt <= 0.1:
                    raise ValueError("Frame time must be a finite number from 0 to 0.1 seconds.")
                if type(keys) is not list or len(keys) > len(KEYS) or any(type(k) is not str or k not in KEYS for k in keys):
                    raise ValueError("Game keys must be left, right, up, down, or space.")
                self.namespace["update"](dt, set(keys))
                self.namespace["draw"](self.screen)
                pixels = pygame.image.tobytes(self.screen, "RGBA")
                if len(pixels) != WIDTH * HEIGHT * 4:
                    raise ValueError("The game changed the canvas size. Keep it at 480 × 320.")
                self.frames += 1
                return pixels
            except BaseException as error:
                self._fail(error)
                return None


_game_session = None
_game_pixels = b""


def game_start_json(code):
    global _game_session, _game_pixels
    _game_pixels = b""
    _game_session = GameSession(code)
    return json.dumps(_game_session.snapshot(), allow_nan=False)


def game_tick_json(dt, keys_json):
    global _game_pixels
    if _game_session is None:
        raise RuntimeError("Start a game before requesting a frame.")
    _game_pixels = _game_session.tick(dt, json.loads(keys_json)) or b""
    return json.dumps(_game_session.snapshot(), allow_nan=False)


def game_pixels():
    return _game_pixels


configure_browser_pygame()
