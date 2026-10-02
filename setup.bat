@echo off
rem One-time setup: lets the React Compiler Start button launch the keep-awake helper.
rem Keep this folder where it is afterwards; the helper runs from here.
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
reg delete "HKCU\Software\Classes\allnotes" /f >nul 2>&1
reg add "HKCU\Software\Classes\reactcompiler" /ve /d "URL:React Compiler" /f >nul
reg add "HKCU\Software\Classes\reactcompiler" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\reactcompiler\shell\open\command" /ve /d "\"%PS%\" -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%~dp0awake.ps1\" \"%%1\"" /f >nul
echo Done. Open https://varsansri.github.io/react-compiler/ and press Start.
echo The first time, the browser asks to open the helper: tick "Always allow" and press Open.
pause
