@echo off
cd /d "%~dp0"
if not exist .venv (
  echo Creating venv...
  py -3 -m venv .venv
  call .venv\Scripts\activate.bat
  pip install -r requirements.txt
) else (
  call .venv\Scripts\activate.bat
)
if not exist .env (
  copy .env.example .env
)
uvicorn app.main:app --host 127.0.0.1 --port 8100
pause
