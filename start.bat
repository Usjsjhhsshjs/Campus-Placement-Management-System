@echo off
start "BACKEND - band mat karna" /D "%~dp0backend" cmd /k ".venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"
start "FRONTEND - band mat karna" /D "%~dp0frontend" cmd /k "npm run dev"
timeout /t 10 >nul
start http://localhost:5173