@echo off
call "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat"
set PATH=C:\Users\freddy.baier\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin;%PATH%
cd /d "C:\Users\freddy.baier\Desktop\Experimental\zynk\zynk-tauri"
call npm run tauri dev
