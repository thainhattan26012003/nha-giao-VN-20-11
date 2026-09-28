@echo off
chcp 65001 >nul
rem Xem thu thiep 20/11 tren may truoc khi dua len mang.
rem Khong mo truc tiep file index.html duoc (trinh duyet chan code khi mo file truc tiep),
rem nen file nay bat mot may chu nho roi mo trinh duyet o http://localhost:8766
rem Meo: them #skip vao cuoi link de vao thang lop hoc 3D, #all de coi nhu da tim du 6 dieu bi mat.
cd /d "%~dp0"
node --no-warnings kiem-tra-config.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
cd /d "%~dp0thiep-20-11"
start "Xem thu thiep 20-11 - dong cua so nay de tat" python -m http.server 8766
timeout /t 2 >nul
start "" "http://localhost:8766/"
