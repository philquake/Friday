@echo off
cd /d "%~dp0"
python -m pip install -r requirements.txt || exit /b 1
call npm --prefix desktop install || exit /b 1
python main.py --ui
