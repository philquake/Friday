from collections.abc import Generator

from providers import get_provider

_provider = None


def _ensure_provider():
    global _provider
    if _provider is None:
        _provider = get_provider()
    return _provider


def reset_provider() -> None:
    """Drop the cached provider so the next chat() call builds the currently selected one."""
    global _provider
    _provider = None


def chat(
    messages: list[dict],
    tools: list[dict] | None = None,
) -> Generator[dict, None, None]:
    provider = _ensure_provider()
    yield from provider.chat(messages, tools=tools)
