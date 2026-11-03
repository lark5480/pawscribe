@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

if not exist "%~dp0tools\cloudflared.exe" goto noExe

echo [1/3] 检查 3000 端口 ...
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if not errorlevel 1 goto portReady

echo 端口 3000 没有服务，正在新窗口启动 npm run dev ...
start "pawscribe dev" cmd /k "cd /d %~dp0 && npm run dev"
powershell -NoProfile -Command "$ok=$false; for($i=0;$i -lt 90;$i++){ if(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue){ $ok=$true; break }; Start-Sleep -Seconds 1 }; if($ok){ exit 0 } else { exit 1 }"
if errorlevel 1 goto portTimeout
echo 3000 端口已就绪。
goto tunnel

:portReady
echo 3000 端口已有服务，直接复用。

:tunnel
echo.
echo [2/3] 正在建立公网隧道，首次连接约需几秒 ...
echo.
powershell -NoProfile -Command "$script:u=$null; & '%~dp0tools\cloudflared.exe' tunnel --url http://localhost:3000 --no-autoupdate 2>&1 | ForEach-Object { $line = [string]$_; if (-not $script:u -and $line -match 'https://[a-z0-9-]+\.trycloudflare\.com') { $script:u = $Matches[0]; Write-Host ''; Write-Host '==========================================='; Write-Host '  公网链接（已复制到剪贴板）:'; Write-Host ('  ' + $script:u); Write-Host '==========================================='; Write-Host ''; try { Set-Clipboard -Value $script:u } catch { $script:u | clip } }; Write-Host $line }"
echo.
echo [3/3] 隧道已结束。
echo 关掉本窗口即断开公网链接；重新运行脚本会换一个新地址。
pause
exit /b 0

:noExe
echo 缺少 tools\cloudflared.exe，请先下载。
echo 官方地址：https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
echo 保存到：%~dp0tools\cloudflared.exe
pause
exit /b 1

:portTimeout
echo 等待 3000 端口超时，请检查 npm run dev 是否正常启动。
pause
exit /b 1
