@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\tools\start-local-db.ps1"
if errorlevel 1 goto fin
call npm.cmd start
:fin
pause
