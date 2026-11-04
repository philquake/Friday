from core import ui_commands
from plugins.base import ToolPlugin

ORB_ACTIONS = ["show", "hide", "toggle", "pin", "unpin"]


class FloatingOrbPlugin(ToolPlugin):
    name = "toggle_floating_orb"
    description = (
        "Show, hide or toggle the floating 3D orb widget on the user's desktop, or pin/unpin it so it stays on top "
        "of other windows. Use when the user says things like 'float the orb', 'show your orb on my desktop', "
        "'hide the orb' or 'keep the orb on top'."
    )
    category = "system"

    def get_parameters_schema(self):
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ORB_ACTIONS,
                    "description": "show/hide/toggle the floating orb, or pin/unpin always-on-top. Default: toggle.",
                }
            },
            "required": [],
        }

    def execute(self, action: str = "toggle", **kwargs) -> dict:
        if action not in ORB_ACTIONS:
            return {"error": f"Unknown action '{action}'. Use one of: {', '.join(ORB_ACTIONS)}"}
        if not ui_commands.emit("orb", action=action):
            return {"error": "The Friday desktop UI is not running, so the orb cannot be controlled."}
        return {"status": "ok", "action": action}
