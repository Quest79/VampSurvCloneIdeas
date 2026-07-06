@echo off
cd /d "%~dp0"
start "VampSurv Local Server" /min python -m http.server 8000 --bind 127.0.0.1
timeout /t 1 /nobreak >nul
start "" firefox "http://127.0.0.1:8000/VampireSurvivorsClone.html"
