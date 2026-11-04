$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$logRoot = Join-Path $env:LOCALAPPDATA 'ASCIISharkCodex'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
$log = Join-Path $logRoot 'settings-server.log'
$errorLog = Join-Path $logRoot 'settings-server-error.log'

function Test-SettingsApi {
  try {
    $response = Invoke-RestMethod -Uri 'http://127.0.0.1:4181/__ascii-sharks/config' -TimeoutSec 2
    return [bool]$response.config
  } catch { return $false }
}

try {
  if (-not (Test-SettingsApi)) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort 4181 -ErrorAction SilentlyContinue
    if ($listener) { throw 'Port 4181 is occupied by another service.' }
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
    Start-Process -FilePath $npm -ArgumentList 'run dev' -WorkingDirectory $projectRoot -WindowStyle Hidden `
      -RedirectStandardOutput $log -RedirectStandardError $errorLog | Out-Null
    $deadline = (Get-Date).AddSeconds(20)
    while ((Get-Date) -lt $deadline -and -not (Test-SettingsApi)) { Start-Sleep -Milliseconds 500 }
    if (-not (Test-SettingsApi)) { throw 'The settings page did not start. Check settings-server-error.log.' }
  }
  Start-Process 'http://127.0.0.1:4181/'
}
catch {
  try {
    Add-Type -AssemblyName System.Windows.Forms
    [void][System.Windows.Forms.MessageBox]::Show(
      "Could not open ASCII Shark settings:`r`n$($_.Exception.Message)`r`n`r`nLog folder: $logRoot",
      'ASCII Shark Settings',
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Error
    )
  } catch {}
  exit 1
}
