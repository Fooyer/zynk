@echo off
REM Gera o instalador (NSIS/MSI) e publica como GitHub Release (draft) em
REM Fooyer/zynk-tauri. Precisa de um .env com GH_TOKEN=... na raiz do projeto
REM (ver RELEASING.md). Mesma correção de PATH do run-tauri-dev.bat — sem ela
REM o "npm run tauri build" nem acha o cargo/link.exe certos.
call "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat"
set PATH=C:\Users\freddy.baier\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin;%PATH%
cd /d "C:\Users\freddy.baier\Desktop\Experimental\zynk\zynk-tauri"

call npm run tauri build
if errorlevel 1 exit /b 1

call node --env-file=.env scripts\publish-release.js
