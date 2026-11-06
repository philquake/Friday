# PR descriptions (paste into each pull request; delete this file afterwards)

Open the PRs from your fork against `alimaandev/Friday` `main`, in this order. They merge cleanly in any order.
Each body follows `.github/PULL_REQUEST_TEMPLATE.md`. Tick the checklist boxes you have verified yourself;
`npm run build` was not run for these branches.

---

## 1. `feat/tts-kokoro`  —  feat(voice): offline Kokoro text-to-speech with per-persona voices

## Description

Adds a local neural TTS engine (kokoro-onnx) with a distinct voice per persona (JARVIS `bf_emma`, FRIDAY `af_heart`,
Cortana `af_bella`; change `tts_voice` in `core/persona.py`). The desktop app plays audio from the new `POST /tts`
endpoint (`GET /tts/status` tells the UI whether it is available). If Kokoro is missing, it falls back to the
browser/SAPI voice, and the fallback now prefers a female English voice.

The model files (~90 MB) are **not** in the repo: `models/` is git-ignored and `kokoro_tts.ensure_model()` downloads
them on demand (`FRIDAY_KOKORO_DIR` overrides the location).

## Type of Change

- [ ] Bug fix
- [x] New feature

## Additional Context

Adds the `kokoro-onnx` dependency. New tests: `tests/test_kokoro_tts.py`, `/tts` API tests, a persona voice assertion,
and a vitest for the browser-voice fallback.

---

## 2. `feat/whisper-stt-electron`  —  feat(voice): offline Whisper speech-to-text so listening works in Electron

## Description

Electron has no Google speech keys, so the Web Speech API fails with a `network` error and listening flashes on and
off. This records the mic in the renderer, detects utterances, and transcribes them on the backend with faster-whisper
(`POST /stt`, `GET /stt/status`). It switches to this path automatically in Electron or after a Web Speech network
error.

Also included, all in the same hook:
- mute the mic while Friday speaks (plus 0.8 s) so she does not hear herself
- drop Whisper segments it rates as non-speech (the usual "Thank you." hallucinations)
- ignore events from an aborted recognizer, which could kill the live session

The Whisper model (`base.en`, ~145 MB) is downloaded by faster-whisper on first use and is not part of the repo.

## Type of Change

- [ ] Bug fix
- [x] New feature

## Additional Context

Adds the `faster-whisper` dependency. Transcription runs on CPU, so there is a short delay after you stop speaking.
Not covered by automated tests: the real microphone path.

---

## 3. `fix/ambient-listening-state`  —  fix(voice): stop ambient and hands-free listening from flipping state

## Description

- The top-bar AMBIENT / SPEAKING / AWAITING label is debounced; the recognizer restarts constantly and the raw status
  made it flicker.
- Hands-free auto-entry no longer re-fires whenever ambient exits (the x button, push-to-talk, the silence timeout),
  which caused an enter/exit loop. Hands-free mode now skips the silence timeout.
- The wake-word handler sets the ambient ref that the auto-send and silence effects check, so they run after
  "Hey Friday".
- The same phrase can be sent twice in a row.

## Type of Change

- [x] Bug fix
- [ ] New feature

## Additional Context

Adds `TopBarAmbient.test.tsx` for the label debounce.

---

## 4. `feat/llm-provider-switching`  —  feat: switch between Claude, Ollama and OpenRouter at runtime

## Description

Adds a Claude provider (Anthropic's OpenAI-compatible endpoint) and lets the user switch the active LLM from the
command palette, Settings -> AI Model, or by saying/typing "switch to Claude", "use Ollama", "change mode to
OpenRouter". Only a whole utterance matches, so "use Claude to write a poem" is still sent as chat.

- `GET/PUT /provider`; the choice is stored in `memory_store/active_provider.json`, so `providers.toml` is never rewritten
- a provider without an API key returns a message naming the missing key (`ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`)
- cloud providers are refused while Blackout mode is on

## Type of Change

- [ ] Bug fix
- [x] New feature

## Additional Context

The Claude option uses Anthropic's OpenAI-compatible endpoint, which Anthropic describes as intended for testing. It
has not been run against the live API (no key was available), only against mocked calls. A native provider would be
the follow-up if this endpoint proves limiting.

---

## 5. `feat/temperature-unit-setting`  —  feat: add a temperature unit setting (°C / °F)

## Description

Adds a °C / °F setting in Settings and the command palette. Weather is still fetched in Celsius and converted in the
new `core/units.py`, so the choice applies to the weather panel, the orb chip, the morning briefing and the quick
weather reply. The unit is stored in `memory_store/units.json` (`GET/PUT /units`) and defaults to Celsius, so
behaviour is unchanged unless the user opts in. `/weather` now returns the converted values plus a `unit` field.

## Type of Change

- [ ] Bug fix
- [x] New feature
