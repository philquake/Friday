"""Offline speech-to-text using faster-whisper, for clients without a working Web Speech API (Electron)."""

import io
import threading
import wave

import numpy as np

MODEL_NAME = "base.en"  # ~145 MB, downloaded from Hugging Face on first use
NO_SPEECH_MAX = 0.6
LOGPROB_MIN = -1.0

_lock = threading.Lock()
_model = None


def is_available() -> bool:
    try:
        import faster_whisper  # noqa: F401
    except ImportError:
        return False
    return True


def _get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        _model = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8")
    return _model


def wav_to_float32(wav_bytes: bytes) -> np.ndarray:
    """Decode 16-bit mono PCM WAV (16 kHz expected) to float32 in [-1, 1]."""
    with wave.open(io.BytesIO(wav_bytes)) as w:
        if w.getsampwidth() != 2 or w.getnchannels() != 1:
            raise ValueError("expected 16-bit mono WAV")
        frames = w.readframes(w.getnframes())
    return np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0


def transcribe(wav_bytes: bytes) -> str:
    """Blocking; call via ``asyncio.to_thread``."""
    audio = wav_to_float32(wav_bytes)
    if audio.size < 1600:  # < 0.1 s
        return ""
    with _lock:
        segments, _ = _get_model().transcribe(audio, language="en", beam_size=1, vad_filter=True)
        # Whisper invents phrases ("Thank you.") from noise; drop segments it itself rates as non-speech.
        kept = [s.text.strip() for s in segments if s.no_speech_prob < NO_SPEECH_MAX and s.avg_logprob > LOGPROB_MIN]
        return " ".join(kept).strip()
