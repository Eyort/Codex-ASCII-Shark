$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$Host.UI.RawUI.WindowTitle = 'Codex with ASCII Shark Background'
$projectPattern = [regex]::Escape($projectRoot)
$activeWatcher = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object {
  $_.CommandLine -and $_.CommandLine -match $projectPattern -and
    ($_.CommandLine.Contains('src/cli.ts watch') -or $_.CommandLine.Contains('src\cli.ts watch'))
} | Select-Object -First 1
if ($activeWatcher) {
  Write-Host 'The ASCII Shark watcher is already running for this project.' -ForegroundColor Yellow
  exit 0
}

try {
  Write-Host 'Starting official Codex with local-only CDP...' -ForegroundColor Cyan
  & npm.cmd run cdp:start
  if ($LASTEXITCODE -ne 0) { throw "CDP startup failed with exit code $LASTEXITCODE." }

  Write-Host ''
  Write-Host 'Starting the reversible Work-page injector. Press Ctrl+C to remove it.' -ForegroundColor Cyan
  & npm.cmd run inject
  if ($LASTEXITCODE -ne 0) { throw "Injector stopped with exit code $LASTEXITCODE." }
}
catch {
  Write-Host ''
  Write-Host "ASCII Shark launcher stopped: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host 'Read the README troubleshooting section, then close this window.' -ForegroundColor Yellow
  [void](Read-Host 'Press Enter to close')
  exit 1
}
