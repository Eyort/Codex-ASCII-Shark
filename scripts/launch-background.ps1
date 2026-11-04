$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$logRoot = Join-Path $env:LOCALAPPDATA 'ASCIISharkCodex'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
$launcherLog = Join-Path $logRoot 'launcher.log'
$watcherLog = Join-Path $logRoot 'watcher.log'
$watcherErrorLog = Join-Path $logRoot 'watcher-error.log'
$settingsLog = Join-Path $logRoot 'settings-server.log'
$settingsErrorLog = Join-Path $logRoot 'settings-server-error.log'
$stopRequestPath = Join-Path $projectRoot '.codex-shark.stop'
$mutex = [System.Threading.Mutex]::new($false, 'Local\AsciiSharkCodexLauncher')
$ownsMutex = $false

function Write-LauncherLog([string]$message) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $message`r`n"
  [System.IO.File]::AppendAllText($launcherLog, $line, [System.Text.UTF8Encoding]::new($false))
}

function Get-ProjectWatcher {
  $projectPattern = [regex]::Escape($projectRoot)
  return Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -and $_.CommandLine -match $projectPattern -and
      ($_.CommandLine.Contains('src/cli.ts watch') -or $_.CommandLine.Contains('src\cli.ts watch'))
  } | Select-Object -First 1
}

function Test-SettingsApi {
  try {
    $response = Invoke-RestMethod -Uri 'http://127.0.0.1:4181/__ascii-sharks/config' -TimeoutSec 2
    return [bool]$response.config
  } catch { return $false }
}

function Start-SettingsServer([string]$npmPath) {
  $listener = Get-NetTCPConnection -State Listen -LocalPort 4181 -ErrorAction SilentlyContinue
  if ($listener) { throw 'Port 4181 is occupied by a service that is not the ASCII Shark settings page.' }
  Write-LauncherLog 'Starting the local settings page on 127.0.0.1:4181.'
  Start-Process -FilePath $npmPath -ArgumentList 'run dev' -WorkingDirectory $projectRoot -WindowStyle Hidden `
    -RedirectStandardOutput $settingsLog -RedirectStandardError $settingsErrorLog | Out-Null
  $deadline = (Get-Date).AddSeconds(20)
  while ((Get-Date) -lt $deadline) {
    if (Test-SettingsApi) { Write-LauncherLog 'Local settings page is ready.'; return }
    Start-Sleep -Milliseconds 500
  }
  throw 'The settings page did not become ready. Check settings-server-error.log.'
}

try {
  try { $ownsMutex = $mutex.WaitOne(0) }
  catch [System.Threading.AbandonedMutexException] { $ownsMutex = $true }
  if (-not $ownsMutex) {
    Write-LauncherLog 'Another launcher instance is already handling startup.'
    exit 0
  }

  $npm = Get-Command npm.cmd -ErrorAction Stop
  if (-not (Test-SettingsApi)) { Start-SettingsServer $npm.Source }

  $listener = Get-NetTCPConnection -State Listen -LocalPort 9335 -ErrorAction SilentlyContinue
  $watcher = Get-ProjectWatcher
  if ($watcher) {
    if ($listener) {
      Write-LauncherLog 'The verified background watcher is already running.'
      exit 0
    }
    Write-LauncherLog 'Found a stale watcher without a CDP listener; requesting a clean stop.'
    [System.IO.File]::WriteAllText($stopRequestPath, 'stop', [System.Text.UTF8Encoding]::new($false))
    $stopDeadline = (Get-Date).AddSeconds(15)
    while ((Get-ProjectWatcher) -and (Get-Date) -lt $stopDeadline) { Start-Sleep -Milliseconds 300 }
    if (Get-ProjectWatcher) { throw 'The stale watcher did not stop. Check watcher-error.log, then run stop-background.ps1.' }
    Remove-Item -LiteralPath $stopRequestPath -Force -ErrorAction SilentlyContinue
  }

  Write-LauncherLog 'Starting the official Store Codex app with local CDP.'
  $cdpLog = Join-Path $logRoot ("cdp-start-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
  & $npm.Source run cdp:start *> $cdpLog
  $cdpExitCode = $LASTEXITCODE
  if ($cdpExitCode -eq 3) { Write-LauncherLog 'Codex restart was declined.'; exit 3 }
  if ($cdpExitCode -ne 0) { throw "CDP startup failed with exit code $cdpExitCode. Check launcher.log." }

  Write-LauncherLog 'Starting the hidden local watcher.'
  Remove-Item -LiteralPath $stopRequestPath -Force -ErrorAction SilentlyContinue
  Start-Process -FilePath $npm.Source -ArgumentList 'run inject' -WorkingDirectory $projectRoot -WindowStyle Hidden `
    -RedirectStandardOutput $watcherLog -RedirectStandardError $watcherErrorLog | Out-Null
  $deadline = (Get-Date).AddSeconds(15)
  while ((Get-Date) -lt $deadline) {
    if (Get-ProjectWatcher) { Write-LauncherLog 'The background watcher is running.'; exit 0 }
    Start-Sleep -Milliseconds 300
  }
  throw 'The background watcher did not start. Check watcher-error.log.'
}
catch {
  Write-LauncherLog $_.Exception.Message
  try {
    Add-Type -AssemblyName System.Windows.Forms
    [void][System.Windows.Forms.MessageBox]::Show(
      "ASCII Shark could not start:`r`n$($_.Exception.Message)`r`n`r`nLog folder: $logRoot",
      'ASCII Shark for Codex',
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Error
    )
  } catch {}
  exit 1
}
finally {
  if ($ownsMutex) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
