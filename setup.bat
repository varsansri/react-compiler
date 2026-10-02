@echo off
rem One-time setup: lets the All Project Notes Start button launch the keep-awake helper.
rem Keep this folder where it is afterwards; the helper runs from here.
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
reg add "HKCU\Software\Classes\allnotes" /ve /d "URL:All Project Notes" /f >nul
reg add "HKCU\Software\Classes\allnotes" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\allnotes\shell\open\command" /ve /d "\"%PS%\" -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%~dp0awake.ps1\" \"%%1\"" /f >nul
echo Done. Open https://varsansri.github.io/all-project-notes/ and press Start.
echo The first time, the browser asks to open the helper: tick "Always allow" and press Open.
pause
