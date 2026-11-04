import pytest

from core import units


@pytest.fixture(autouse=True)
def isolated_store(tmp_path, monkeypatch):
    monkeypatch.setattr(units, "_STORE_PATH", str(tmp_path / "units.json"))


def test_defaults_to_celsius():
    assert units.get_temperature_unit() == "c"


def test_set_and_get_roundtrip():
    assert units.set_temperature_unit("F") == "f"
    assert units.get_temperature_unit() == "f"


def test_rejects_invalid_unit():
    with pytest.raises(ValueError):
        units.set_temperature_unit("kelvin")


def test_corrupt_store_falls_back_to_celsius(tmp_path):
    (tmp_path / "units.json").write_text("{nope")
    assert units.get_temperature_unit() == "c"


@pytest.mark.parametrize(
    ("celsius", "unit", "expected"), [(0, "f", 32.0), (100, "f", 212.0), (22.2, "c", 22.2), (-40, "f", -40.0)]
)
def test_convert(celsius, unit, expected):
    assert units.convert_temperature(celsius, unit) == expected


def test_convert_none_passthrough():
    assert units.convert_temperature(None, "f") is None


def test_symbol():
    assert units.temperature_symbol("f") == "°F"
    assert units.temperature_symbol("c") == "°C"
