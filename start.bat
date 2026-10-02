@echo off
title Typer - keep this window open
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0type.ps1" %*
pause
