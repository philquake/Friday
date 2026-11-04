import sys
import threading

_tts_engine = None
_tts_lock = threading.Lock()
_speaking = False
_stop_flag = False

_FEMALE_VOICE_HINTS = ("zira", "hazel", "susan", "aria", "jenny", "samantha", "female")


def _init_tts():
    global _tts_engine
    try:
        import pyttsx3

        _tts_engine = pyttsx3.init(driverName="sapi5")
        _tts_engine.setProperty("rate", 180)
        _tts_engine.setProperty("volume", 0.9)
        for v in _tts_engine.getProperty("voices") or []:
            if any(h in (v.name or "").lower() for h in _FEMALE_VOICE_HINTS):
                _tts_engine.setProperty("voice", v.id)
                break
    except Exception:
        pass


def _kokoro_wav(text: str, persona: str) -> bytes | None:
    """Synthesize with Kokoro on Windows (winsound plays it); None means use the pyttsx3 fallback."""
    if sys.platform != "win32":
        return None
    try:
        from core.persona import get_persona_config
        from voice import kokoro_tts

        if not kokoro_tts.is_available():
            return None
        cfg = get_persona_config(persona)
        return kokoro_tts.synthesize(text, cfg.get("tts_voice", kokoro_tts.DEFAULT_VOICE), cfg.get("tts_rate", 1.0))
    except Exception:
        return None


def _play_wav(wav: bytes) -> None:
    import winsound

    winsound.PlaySound(wav, winsound.SND_MEMORY)


def speak(text: str, persona: str = "friday") -> dict:
    def _say():
        global _speaking
        with _tts_lock:
            _speaking = True
            try:
                wav = _kokoro_wav(text, persona)
                if wav is not None:
                    _play_wav(wav)
                    return
                if _tts_engine is None:
                    _init_tts()
                if _tts_engine is not None:
                    _tts_engine.say(text)
                    _tts_engine.runAndWait()
            except Exception:
                pass
            finally:
                _speaking = False

    if _tts_engine is None:
        _init_tts()
    if _tts_engine is None and sys.platform != "win32":
        return {"success": False, "error": "TTS not available"}

    threading.Thread(target=_say, daemon=True).start()
    return {"success": True, "message": "Speaking..."}


def speak_interruptible(text: str, persona: str = "friday") -> dict:
    if _tts_engine is None:
        _init_tts()
    if _tts_engine is None and sys.platform != "win32":
        return {"success": False, "error": "TTS not available"}

    global _stop_flag
    _stop_flag = False

    def _say():
        global _speaking, _stop_flag
        with _tts_lock:
            _speaking = True
            sentences = text.replace("? ", ". ").replace("! ", ". ").split(". ")
            for sentence in sentences:
                if _stop_flag:
                    break
                if not sentence.strip():
                    continue
                try:
                    wav = _kokoro_wav(sentence.strip(), persona)
                    if wav is not None:
                        _play_wav(wav)
                    elif _tts_engine is not None:
                        _tts_engine.say(sentence.strip())
                        _tts_engine.runAndWait()
                except Exception:
                    pass
            _speaking = False

    threading.Thread(target=_say, daemon=True).start()
    return {"success": True, "message": "Speaking (interruptible)..."}


def stop_speaking() -> dict:
    global _stop_flag
    _stop_flag = True
    if sys.platform == "win32":
        try:
            import winsound

            winsound.PlaySound(None, winsound.SND_PURGE)
        except Exception:
            pass
    return {"success": True, "message": "Speech stopped"}


def is_speaking() -> bool:
    return _speaking
