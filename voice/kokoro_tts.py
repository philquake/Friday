"""Offline neural text-to-speech using Kokoro (kokoro-onnx).

Model files live in ``models/kokoro/`` (override with ``FRIDAY_KOKORO_DIR``). Nothing here
raises at import time; ``is_available()`` reports whether synthesis can run.
"""

import io
import logging
import os
import threading
import wave
from pathlib import Path

logger = logging.getLogger(__name__)

MODEL_FILE = "kokoro-v1.0.int8.onnx"
VOICES_FILE = "voices-v1.0.bin"
_RELEASE_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"

DEFAULT_VOICE = "af_heart"
AVAILABLE_VOICES = [
    "af_heart",
    "af_bella",
    "af_nicole",
    "af_nova",
    "af_sarah",
    "af_sky",
    "bf_emma",
    "bf_isabella",
    "am_onyx",
]

_lock = threading.Lock()
_engine = None


def model_dir() -> Path:
    override = os.environ.get("FRIDAY_KOKORO_DIR")
    if override:
        return Path(override)
    return Path(__file__).resolve().parent.parent / "models" / "kokoro"


def _files_present() -> bool:
    d = model_dir()
    return (d / MODEL_FILE).is_file() and (d / VOICES_FILE).is_file()


def ensure_model() -> bool:
    """Download the model files if missing (~90 MB). Returns True when they are present."""
    if _files_present():
        return True
    import httpx

    d = model_dir()
    d.mkdir(parents=True, exist_ok=True)
    for name in (MODEL_FILE, VOICES_FILE):
        target = d / name
        if target.is_file():
            continue
        logger.info("Downloading Kokoro voice file %s to %s", name, d)
        tmp = target.with_suffix(target.suffix + ".part")
        with httpx.stream("GET", f"{_RELEASE_URL}/{name}", follow_redirects=True, timeout=120) as resp:
            resp.raise_for_status()
            with open(tmp, "wb") as f:
                for chunk in resp.iter_bytes():
                    f.write(chunk)
        tmp.replace(target)
    return _files_present()


def is_available() -> bool:
    """True when the kokoro-onnx package and model files are both present."""
    if not _files_present():
        return False
    try:
        import kokoro_onnx  # noqa: F401
    except ImportError:
        return False
    return True


def _get_engine():
    global _engine
    if _engine is None:
        from kokoro_onnx import Kokoro

        d = model_dir()
        _engine = Kokoro(str(d / MODEL_FILE), str(d / VOICES_FILE))
    return _engine


def synthesize(text: str, voice: str = DEFAULT_VOICE, speed: float = 1.0) -> bytes:
    """Render ``text`` to 16-bit mono WAV bytes. Blocking; call via ``asyncio.to_thread``."""
    import numpy as np

    lang = "en-gb" if voice.startswith("b") else "en-us"
    with _lock:
        samples, rate = _get_engine().create(text, voice=voice, speed=speed, lang=lang)
    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()
