import io
import sys
import types
import wave

import numpy as np

from voice import kokoro_tts


def test_unavailable_when_model_files_missing(tmp_path, monkeypatch):
    monkeypatch.setenv("FRIDAY_KOKORO_DIR", str(tmp_path))
    assert kokoro_tts.is_available() is False


def test_available_when_package_and_files_present(tmp_path, monkeypatch):
    monkeypatch.setenv("FRIDAY_KOKORO_DIR", str(tmp_path))
    (tmp_path / kokoro_tts.MODEL_FILE).write_bytes(b"x")
    (tmp_path / kokoro_tts.VOICES_FILE).write_bytes(b"x")
    monkeypatch.setitem(sys.modules, "kokoro_onnx", types.ModuleType("kokoro_onnx"))
    assert kokoro_tts.is_available() is True


def test_synthesize_returns_valid_wav(monkeypatch):
    class FakeEngine:
        def create(self, text, voice, speed, lang):
            self.args = (voice, speed, lang)
            return np.zeros(2400, dtype=np.float32), 24000

    engine = FakeEngine()
    monkeypatch.setattr(kokoro_tts, "_get_engine", lambda: engine)
    wav = kokoro_tts.synthesize("hello", voice="bf_emma", speed=0.9)
    assert engine.args == ("bf_emma", 0.9, "en-gb")
    with wave.open(io.BytesIO(wav)) as w:
        assert w.getframerate() == 24000
        assert w.getnchannels() == 1
        assert w.getnframes() == 2400
