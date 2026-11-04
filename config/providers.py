import json
import os
import tomllib
from typing import Any

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "providers.toml")


# ─── Env var helpers ─────────────────────────────────────────────
def _load_dotenv():
    """Load .env file from project root if present."""
    root = os.path.dirname(os.path.dirname(__file__))
    env_path = os.path.join(root, ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key, val = key.strip(), val.strip().strip("\"'")
            if not os.environ.get(key):
                os.environ[key] = val


_load_dotenv()


def _resolve_api_key(toml_key: str, env_var: str) -> str:
    """Resolve an API key: env var takes precedence, fall back to toml value."""
    return os.environ.get(env_var, "") or os.environ.get(toml_key, "")


# Built-in defaults so a providers.toml without a [claude] section still works.
# Claude is reached through Anthropic's OpenAI-compatible endpoint.
_SECTION_DEFAULTS: dict[str, dict[str, Any]] = {
    "claude": {
        "api_key": "",
        "base_url": "https://api.anthropic.com/v1/",
        "model": "claude-sonnet-5-5",
        "fallback_model": "claude-haiku-5-5",
        "temperature": 0.7,
        "max_tokens": 4096,
        "timeout": 60,
        "stream_usage": False,
        "provider_name": "claude",
    },
}

# Providers the user can switch between at runtime (UI / voice command), with display labels.
SWITCHABLE_PROVIDERS: dict[str, str] = {"claude": "Claude", "ollama": "Ollama", "openrouter": "OpenRouter"}

_ENV_KEYS = {
    "openai": "OPENAI_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "claude": "ANTHROPIC_API_KEY",
}

# The runtime choice lives outside providers.toml so switching never rewrites the user's config.
_OVERRIDE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "memory_store", "active_provider.json")


def load_provider_config() -> dict[str, Any]:
    cfg: dict[str, Any] = {"default": {"provider": "ollama"}}
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "rb") as f:
            cfg = tomllib.load(f)

    for section, defaults in _SECTION_DEFAULTS.items():
        cfg[section] = {**defaults, **cfg.get(section, {})}

    # Override API keys from environment variables
    for section, env_var in _ENV_KEYS.items():
        if section in cfg and "api_key" in cfg[section]:
            resolved = _resolve_api_key("api_key", env_var)
            if resolved:
                cfg[section]["api_key"] = resolved

    return cfg


def _read_override() -> str | None:
    try:
        with open(_OVERRIDE_PATH, encoding="utf-8") as f:
            name = json.load(f).get("provider")
    except (OSError, ValueError, AttributeError):
        return None
    return name if name in SWITCHABLE_PROVIDERS else None


def get_active_provider(config: dict[str, Any] | None = None) -> str:
    override = _read_override()
    if override:
        return override
    if config is None:
        config = load_provider_config()
    return config.get("default", {}).get("provider", "ollama")


def set_active_provider(name: str) -> None:
    if name not in SWITCHABLE_PROVIDERS:
        raise ValueError(f"Cannot switch to '{name}'. Choose from: {list(SWITCHABLE_PROVIDERS)}")
    os.makedirs(os.path.dirname(_OVERRIDE_PATH), exist_ok=True)
    with open(_OVERRIDE_PATH, "w", encoding="utf-8") as f:
        json.dump({"provider": name}, f)


def is_provider_configured(name: str, config: dict[str, Any] | None = None) -> bool:
    """Ollama is local and needs no key; cloud providers need an API key."""
    if name == "ollama":
        return True
    if config is None:
        config = load_provider_config()
    return bool(config.get(name, {}).get("api_key"))


def get_provider_config(name: str | None = None) -> dict[str, Any]:
    config = load_provider_config()
    if name is None:
        name = get_active_provider(config)
    return config.get(name, {})
