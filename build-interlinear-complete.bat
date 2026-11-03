@echo off
echo ScriptureScribe — Interlinear Rebuilder
echo ========================================
echo.
echo This will rebuild strongs-greek.json and strongs-hebrew.json
echo from the STEPBible source files in this folder.
echo.

if not exist "%~dp0TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt" (
    if not exist "%~dp0TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt" (
        echo ERROR: No TAGNT source files found in this folder.
        echo Please place this script in the same folder as the STEPBible .txt files.
        echo.
        pause
        exit /b 1
    )
)

python "%~dp0build-interlinear-complete.py"

echo.
pause
