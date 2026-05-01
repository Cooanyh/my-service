@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul

echo ========================================
echo TuneFlow - Step 03 Export Player Map
echo ========================================
echo.

node "%~dp003-export-player-map.mjs"
set EXIT_CODE=%ERRORLEVEL%

echo.
if %EXIT_CODE% EQU 0 (
    echo Export finished.
    echo Output: "%~dp0songs.player-map.json"
) else (
    echo Export failed. Exit code: %EXIT_CODE%
)

echo.
pause
exit /b %EXIT_CODE%
