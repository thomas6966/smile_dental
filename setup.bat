@echo off
chcp 65001 >nul
title Stomatologiya klinikasi - o'rnatish
cd /d "%~dp0"
set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
echo.
echo  [1/5] Paketlar o'rnatilmoqda...
call npm install
echo.
echo  [2/5] Baza jadvallari yaratilmoqda...
call npx prisma migrate deploy
call npx prisma generate
echo.
echo  [3/5] Namuna ma'lumotlar yozilmoqda...
call npm run seed
echo.
echo  [4/5] Mini App va Admin Panel yig'ilmoqda...
call npm run build
echo.
echo  [5/5] Cloudflare Tunnel dasturi tekshirilmoqda...
if not exist bin mkdir bin
if not exist bin\cloudflared.exe curl -L --fail -o bin\cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
echo.
echo  Tayyor! Endi start.bat faylini ishga tushiring.
echo.
pause
