import io
import wave

import numpy as np
import pytest

from voice import whisper_stt


def _wav(samples: np.ndarray, rate: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(samples.astype(np.int16).tobytes())
    return buf.getvalue()


def test_wav_to_float32_range():
    out = whisper_stt.wav_to_float32(_wav(np.array([0, 16384, -32768])))
    assert out.dtype == np.float32
    assert out.tolist() == [0.0, 0.5, -1.0]


def test_wav_to_float32_rejects_stereo():
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00\x00" * 4)
    with pytest.raises(ValueError):
        whisper_stt.wav_to_float32(buf.getvalue())


def test_transcribe_skips_tiny_clips(monkeypatch):
    monkeypatch.setattr(whisper_stt, "_get_model", lambda: pytest.fail("model should not load"))
    assert whisper_stt.transcribe(_wav(np.zeros(100))) == ""


def test_transcribe_joins_segments(monkeypatch):
    class Seg:
        def __init__(self, text, no_speech_prob=0.01, avg_logprob=-0.2):
            self.text = text
            self.no_speech_prob = no_speech_prob
            self.avg_logprob = avg_logprob

    class FakeModel:
        def transcribe(self, audio, **kwargs):
            return [
                Seg(" hello "),
                Seg("world "),
                Seg("Thank you.", no_speech_prob=0.9),
                Seg("uh", avg_logprob=-2),
            ], None

    monkeypatch.setattr(whisper_stt, "_get_model", lambda: FakeModel())
    assert whisper_stt.transcribe(_wav(np.zeros(16000))) == "hello world"
