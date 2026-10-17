@echo off
title Bismillah General Store - Dev Server
cd /d "%~dp0"
echo ============================================================
echo   Bismillah General Store And Kiryana - Dev Server
echo   Open in your browser: http://localhost:5173/
echo ============================================================
echo.
npm.cmd run dev -- --host 0.0.0.0
pause