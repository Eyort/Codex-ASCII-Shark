$ErrorActionPreference = 'Stop'
$source = Join-Path (Get-Location) '.codex-shark.config.example.json'
$destination = Join-Path (Get-Location) '.codex-shark.config.json'
Copy-Item -LiteralPath $source -Destination $destination -Force
Write-Host 'Restored the example shark configuration.'
