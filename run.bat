@echo off
cd /d "%~dp0"
start "ETEC server" cmd /k "py -m http.server 8765 || python -m http.server 8765"
ping 127.0.0.1 -n 2 >nul
start "" http://127.0.0.1:8765
