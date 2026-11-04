import asyncio

import pytest

from core import ui_commands
from plugins.builtins.orb_plugin import FloatingOrbPlugin

pytestmark = pytest.mark.asyncio


async def test_emit_without_server_returns_false():
    ui_commands._loop = None
    ui_commands._broadcast = None
    assert ui_commands.emit("orb", action="show") is False


async def test_plugin_emits_ui_command():
    loop = asyncio.get_running_loop()
    seen: list[tuple[str, dict]] = []

    async def fake_broadcast(event_type: str, data: dict):
        seen.append((event_type, data))

    ui_commands.register(loop, fake_broadcast)
    try:
        result = await asyncio.to_thread(FloatingOrbPlugin().execute, action="pin")
        await asyncio.sleep(0.05)
    finally:
        ui_commands._loop = None
        ui_commands._broadcast = None

    assert result == {"status": "ok", "action": "pin"}
    assert seen == [("ui_command", {"target": "orb", "action": "pin"})]


async def test_plugin_rejects_unknown_action():
    assert "error" in FloatingOrbPlugin().execute(action="explode")


async def test_plugin_schema_lists_actions():
    props = FloatingOrbPlugin().get_parameters_schema()["properties"]
    assert "toggle" in props["action"]["enum"]
