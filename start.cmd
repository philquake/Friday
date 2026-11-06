@echo off
cd /d "%~dp0"
rem Use the project venv when it exists, so a double-click does not install into system Python.
set "PY=python"
if exist ".venv\Scripts\python.exe" set "PY=.venv\Scripts\python.exe"
"%PY%" -m pip install -r requirements.txt || goto :fail
call npm --prefix desktop install || goto :fail
"%PY%" main.py --ui
exit /b %errorlevel%
:fail
pause
exit /b 1
