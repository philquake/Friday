"""Display units (currently temperature only), persisted to ``memory_store/units.json``.

Weather is always fetched in Celsius and converted here, so changing the unit never
leaves stale cached values behind.
"""

import json
import os
import threading

_APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_STORE_PATH = os.path.join(_APP_DIR, "memory_store", "units.json")

VALID_TEMPERATURE_UNITS = ("c", "f")
DEFAULT_TEMPERATURE_UNIT = "c"

_lock = threading.Lock()


def get_temperature_unit() -> str:
    """Return ``"c"`` or ``"f"``; Celsius when nothing valid is stored."""
    try:
        with open(_STORE_PATH, encoding="utf-8") as f:
            unit = str(json.load(f).get("temperature", "")).lower()
    except (OSError, ValueError, AttributeError):
        return DEFAULT_TEMPERATURE_UNIT
    return unit if unit in VALID_TEMPERATURE_UNITS else DEFAULT_TEMPERATURE_UNIT


def set_temperature_unit(unit: str) -> str:
    unit = str(unit).lower()
    if unit not in VALID_TEMPERATURE_UNITS:
        raise ValueError(f"temperature unit must be one of {list(VALID_TEMPERATURE_UNITS)}")
    with _lock:
        os.makedirs(os.path.dirname(_STORE_PATH), exist_ok=True)
        with open(_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump({"temperature": unit}, f)
    return unit


def convert_temperature(celsius: float | None, unit: str | None = None) -> float | None:
    """Convert a Celsius reading to ``unit`` (default: the saved unit), rounded to 1 decimal."""
    if celsius is None:
        return None
    unit = unit or get_temperature_unit()
    value = celsius * 9 / 5 + 32 if unit == "f" else celsius
    return round(value, 1)


def temperature_symbol(unit: str | None = None) -> str:
    return "°F" if (unit or get_temperature_unit()) == "f" else "°C"
