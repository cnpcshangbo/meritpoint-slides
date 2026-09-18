# pygame-ce for optional Python games

This directory vendors the **unmodified pygame-ce 2.4.1 wheel from Pyodide 0.26.2**.
Its SHA-256 matches the existing course runtime's `pyodide-lock.json`.
The binary is for Python 3.12 / `pyodide_2024_0_wasm32`, not native Python.

The wheel is 11,714,657 bytes. Its Pyodide package dependency list is empty;
SDL and its graphics/audio dependencies are already linked into the wheel.
The existing browser runtime is reused. Nothing downloads from a third-party
package CDN while a student starts a game.

`provenance.json` records the upstream download, exact hashes, source archive,
Pyodide build recipe/patches, Emscripten dependency source location, and original
dependency license notices. Pygame-ce 2.4.1 is distributed under LGPL 2.1;
`LICENSE.pygame-ce.txt` contains the upstream license. `licenses/` preserves the
upstream dependency notices (including notices for optional desktop formats).
No upstream library source or binary has been modified.

The course's separate game runner uses `pygame.Surface`, drawing and collision
APIs inside a terminable worker. It transfers RGBA pixels to the page canvas.
Native SDL windows/events/audio are not offered by this browser runner. Keyboard
and touch controls become a `keys` set in `update(dt, keys)`; a host-owned frame
scheduler invokes `draw(screen)`. These course files are separate from pygame.
