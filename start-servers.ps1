# AI Board Server Starter Script
# Run this in PowerShell: .\start-servers.ps1

$host.ui.RawUI.WindowTitle = "AI Board Server Manager"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "       AI Board Server Starter" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Kill existing Node processes
Write-Host "Stopping existing servers..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Create logs directory
New-Item -ItemType Directory -Force -Path "logs" | Out-Null

Write-Host ""
Write-Host "Starting Next.js Frontend..." -ForegroundColor Green
$nextJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npx next dev 2>&1 | Tee-Object -FilePath "logs/next.log"
}

Start-Sleep -Seconds 3

Write-Host "Starting WebSocket Backend..." -ForegroundColor Green
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npx ts-node --project tsconfig.server.json server/index.ts 2>&1 | Tee-Object -FilePath "logs/server.log"
}

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "       Servers Started!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  Admin:     http://localhost:3000/admin" -ForegroundColor White
Write-Host "  WebSocket: ws://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "  Logs: logs/next.log, logs/server.log" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop servers" -ForegroundColor Yellow
Write-Host ""

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if jobs are still running
        $nextStatus = Receive-Job -Job $nextJob -Keep -ErrorAction SilentlyContinue
        $serverStatus = Receive-Job -Job $serverJob -Keep -ErrorAction SilentlyContinue
        
        if ($nextJob.State -eq "Failed") {
            Write-Host "Next.js crashed! Check logs/next.log" -ForegroundColor Red
        }
        if ($serverJob.State -eq "Failed") {
            Write-Host "Server crashed! Check logs/server.log" -ForegroundColor Red
        }
    }
} finally {
    Write-Host ""
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    Stop-Job -Job $nextJob -ErrorAction SilentlyContinue
    Stop-Job -Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job -Job $nextJob -ErrorAction SilentlyContinue
    Remove-Job -Job $serverJob -ErrorAction SilentlyContinue
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "Servers stopped." -ForegroundColor Green
}
