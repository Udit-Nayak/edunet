@echo off
setlocal

powershell -ExecutionPolicy Bypass -File "%~dp0lint-all.ps1" %*
exit /b %ERRORLEVEL%
