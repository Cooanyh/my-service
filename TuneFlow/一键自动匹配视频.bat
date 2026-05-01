@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul

echo ========================================
echo TuneFlow - Step 02 Auto Match Bilibili Videos
echo ========================================
echo.

node "%~dp002-auto-match-bilibili.mjs" --debug
set EXIT_CODE=%ERRORLEVEL%

echo.
if %EXIT_CODE% EQU 0 (
    echo Auto match finished.
    echo Output: "%~dp0songs.matched.json"
) else (
    echo Auto match failed. Exit code: %EXIT_CODE%
)

echo.
pause
exit /b %EXIT_CODE%
