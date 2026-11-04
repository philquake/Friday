"""Thread-safe bridge so tools (running in worker threads) can push UI commands to the frontend over SSE."""

import asyncio
from collections.abc import Awaitable, Callable
from typing import Any

_loop: asyncio.AbstractEventLoop | None = None
_broadcast: Callable[[str, dict], Awaitable[None]] | None = None


def register(loop: asyncio.AbstractEventLoop, broadcast: Callable[[str, dict], Awaitable[None]]) -> None:
    """Called once by the API server with its event loop and broadcaster."""
    global _loop, _broadcast
    _loop, _broadcast = loop, broadcast


def emit(target: str, **data: Any) -> bool:
    """Send a ``ui_command`` event to all connected frontends. Returns False if no server is registered."""
    if _loop is None or _broadcast is None:
        return False
    asyncio.run_coroutine_threadsafe(_broadcast("ui_command", {"target": target, **data}), _loop)
    return True
