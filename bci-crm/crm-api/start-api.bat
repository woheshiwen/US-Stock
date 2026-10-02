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
  echo Copy .env.example to .env and set crm_app password first.
  pause
  exit /b 1
)
uvicorn app.main:app --host 127.0.0.1 --port 8100
pause
