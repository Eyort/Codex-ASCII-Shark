$ErrorActionPreference = 'Stop'
$stateFile = Join-Path (Get-Location) '.codex-shark-state.json'
if (-not (Test-Path -LiteralPath $stateFile)) { Write-Host 'No Codex CDP session state was found.'; exit 0 }
$state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
$package = Get-AppxPackage -Name 'OpenAI.Codex' | Where-Object { $_.PackageFullName -ceq $state.packageFullName } | Select-Object -First 1
if (-not $package -or [System.IO.Path]::GetFullPath((Join-Path $package.InstallLocation 'app\ChatGPT.exe')) -ine [System.IO.Path]::GetFullPath($state.executablePath)) {
  throw 'Current registered Codex package does not match the saved session; state was preserved.'
}
$processes = @(Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" | Where-Object {
  $_.ExecutablePath -and [System.IO.Path]::GetFullPath($_.ExecutablePath) -ieq [System.IO.Path]::GetFullPath($state.executablePath)
})
foreach ($process in $processes) { try { [void](Get-Process -Id $process.ProcessId).CloseMainWindow() } catch {} }
$deadline = (Get-Date).AddSeconds(15)
while ((Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" | Where-Object {
  $_.ExecutablePath -and [System.IO.Path]::GetFullPath($_.ExecutablePath) -ieq [System.IO.Path]::GetFullPath($state.executablePath)
}).Count -gt 0 -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 250 }
if (Get-NetTCPConnection -State Listen -LocalPort ([int]$state.port) -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -in $processes.ProcessId }) {
  throw 'Codex did not close normally; close it manually. No process was force-terminated.'
}
Remove-Item -LiteralPath $stateFile -Force
Write-Host 'Codex closed normally. Its loopback CDP listener is no longer active.'
