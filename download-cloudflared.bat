@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "URL=https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
set "DEST=%~dp0tools\cloudflared.exe"

if exist "%DEST%" goto existed
if not exist "%~dp0tools" mkdir "%~dp0tools"

echo 正在下载 cloudflared（约 53 MB，只需一次）...
echo 目标：%DEST%
echo.
curl.exe -L --fail --ssl-no-revoke --retry 2 -o "%DEST%" "%URL%"
if errorlevel 1 goto failed
if not exist "%DEST%" goto failed

echo.
echo 下载完成，正在校验可执行文件 ...
"%DEST%" --version
if errorlevel 1 goto failed
echo.
echo 现在可以双击 start-tunnel.bat。
pause
exit /b 0

:existed
echo 已存在，跳过下载：%DEST%
echo 如需重新下载，请先手动删除上面的文件。
"%DEST%" --version
echo.
echo 现在可以双击 start-tunnel.bat。
pause
exit /b 0

:failed
echo.
echo 下载或校验失败，常见原因：
echo   1. 网络无法访问 github.com，请检查网络或代理；
echo   2. 磁盘空间不足；
echo   3. 安全软件拦截了下载或执行。
echo.
echo 也可以手动下载后另存为：%DEST%
echo 下载地址：%URL%
pause
exit /b 1
