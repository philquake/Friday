from main import _launch_ui


def test_launch_ui_builds_commands(monkeypatch):
    """--ui should spawn the API server and frontend dev server, then open the browser."""
    spawned: list[list[str]] = []
    opened: list[str] = []

    class FakeProc:
        def __init__(self, cmd):
            self._cmd = cmd
            self._polls = 0

        def poll(self):
            self._polls += 1
            return None if self._polls < 3 else 0

        def terminate(self):
            self._terminated = True

    def fake_popen(cmd, **kwargs):
        spawned.append(cmd)
        return FakeProc(cmd)

    def fake_sleep(_secs):
        pass

    def fake_open(url):
        opened.append(url)

    monkeypatch.setattr("main.subprocess.Popen", fake_popen)
    monkeypatch.setattr("main.time.sleep", fake_sleep)
    monkeypatch.setattr("main.webbrowser.open", fake_open)
    monkeypatch.setattr("main.os.path.exists", lambda _p: False)  # no Electron installed -> browser fallback

    _launch_ui()

    assert len(spawned) == 2
    assert "api_server.py" in " ".join(spawned[0])
    assert any("dev" in str(c) for c in spawned[1])
    assert opened == ["http://localhost:5173"]


def test_launch_ui_uses_electron_and_logs_when_installed(monkeypatch):
    """With Electron installed, --ui starts it (without ELECTRON_RUN_AS_NODE), logs server output to files, no browser."""
    spawned: list[tuple[list[str], dict]] = []
    opened: list[str] = []

    class FakeProc:
        def __init__(self):
            self._polls = 0

        def poll(self):
            self._polls += 1
            return None if self._polls < 3 else 0

        def terminate(self):
            pass

    class FakeFile:
        def close(self):
            pass

    def fake_popen(cmd, **kwargs):
        spawned.append((cmd, kwargs))
        return FakeProc()

    monkeypatch.setattr("main.subprocess.Popen", fake_popen)
    monkeypatch.setattr("main.time.sleep", lambda _s: None)
    monkeypatch.setattr("main.webbrowser.open", opened.append)
    monkeypatch.setattr("main.os.path.exists", lambda _p: True)
    monkeypatch.setattr("main.os.makedirs", lambda *a, **k: None)
    monkeypatch.setattr("main.open", lambda *a, **k: FakeFile(), raising=False)
    monkeypatch.setenv("ELECTRON_RUN_AS_NODE", "1")

    _launch_ui()

    assert len(spawned) == 3
    api_kwargs, front_kwargs, (electron_cmd, electron_kwargs) = spawned[0][1], spawned[1][1], spawned[2]
    assert (
        api_kwargs["stdout"] is not None and front_kwargs["stdout"] is not None
    )  # output captured for the console drawer
    assert "electron" in electron_cmd[0].lower()
    assert "ELECTRON_RUN_AS_NODE" not in electron_kwargs["env"]
    assert opened == []
