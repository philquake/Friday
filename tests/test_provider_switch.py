import pytest

from config import providers as cfg_mod


@pytest.fixture(autouse=True)
def isolated(tmp_path, monkeypatch):
    monkeypatch.setattr(cfg_mod, "_OVERRIDE_PATH", str(tmp_path / "active_provider.json"))
    monkeypatch.setattr(cfg_mod, "CONFIG_PATH", str(tmp_path / "missing.toml"))
    for var in ("ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY"):
        monkeypatch.delenv(var, raising=False)


def test_claude_defaults_exist_without_toml_section():
    claude = cfg_mod.load_provider_config()["claude"]
    assert claude["base_url"].startswith("https://api.anthropic.com")
    assert claude["model"].startswith("claude-")
    assert claude["stream_usage"] is False


def test_toml_values_override_defaults(tmp_path, monkeypatch):
    toml = tmp_path / "p.toml"
    toml.write_text('[default]\nprovider = "ollama"\n\n[claude]\nmodel = "claude-haiku-5-5"\n')
    monkeypatch.setattr(cfg_mod, "CONFIG_PATH", str(toml))
    claude = cfg_mod.load_provider_config()["claude"]
    assert claude["model"] == "claude-haiku-5-5"
    assert claude["base_url"].startswith("https://api.anthropic.com")


def test_env_key_configures_claude(monkeypatch):
    assert cfg_mod.is_provider_configured("claude") is False
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    assert cfg_mod.is_provider_configured("claude") is True


def test_ollama_always_configured():
    assert cfg_mod.is_provider_configured("ollama") is True


def test_override_wins_over_toml_default():
    assert cfg_mod.get_active_provider() == "ollama"
    cfg_mod.set_active_provider("openrouter")
    assert cfg_mod.get_active_provider() == "openrouter"


def test_set_rejects_unknown_provider():
    with pytest.raises(ValueError):
        cfg_mod.set_active_provider("skynet")


def test_corrupt_override_is_ignored(tmp_path):
    (tmp_path / "active_provider.json").write_text("{not json")
    assert cfg_mod.get_active_provider() == "ollama"
