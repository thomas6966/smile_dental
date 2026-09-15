@echo off
chcp 65001 >nul
title Stomatologiya klinikasi - server
cd /d "%~dp0"
set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"

:start
echo.
echo  Dastur ishga tushirilmoqda... Bu oynani yopmang!
echo.
node src\index.js
if "%errorlevel%"=="2" goto already
echo.
echo  Dastur to'xtadi. 15 soniyadan keyin qayta ishga tushiriladi...
echo  (Butunlay to'xtatish uchun shu oynani yoping.)
ping -n 16 127.0.0.1 >nul
goto start

:already
echo.
echo  Dastur allaqachon ishlab turibdi. Ikkinchi marta ochish shart emas.
echo  Bu oyna 10 soniyadan keyin o'zi yopiladi.
ping -n 11 127.0.0.1 >nul
exit
