$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$projectPattern = [regex]::Escape($projectRoot)

function Get-ProjectWatcher {
  return Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -and $_.CommandLine -match $projectPattern -and
      ($_.CommandLine.Contains('src/cli.ts watch') -or $_.CommandLine.Contains('src\cli.ts watch'))
  } | Select-Object -First 1
}

$watcher = Get-ProjectWatcher
if ($watcher) {
  [System.IO.File]::WriteAllText((Join-Path $projectRoot '.codex-shark.stop'), 'stop', [System.Text.UTF8Encoding]::new($false))
  $deadline = (Get-Date).AddSeconds(15)
  while ((Get-ProjectWatcher) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 300 }
  if (Get-ProjectWatcher) { throw 'Watcher did not stop within 15 seconds; it was not force-terminated.' }
  Write-Host 'ASCII Shark animation stopped and removed from Codex pages.'
  exit 0
}

& npm.cmd run remove
if ($LASTEXITCODE -ne 0) { throw "Could not remove the live animation (exit $LASTEXITCODE)." }
Write-Host 'No watcher was running; removed any current animation layer.'
