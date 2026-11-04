param(
  [switch]$Remove
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$desktop = [Environment]::GetFolderPath('DesktopDirectory')
$startMenu = Join-Path ([Environment]::GetFolderPath('Programs')) 'ASCII Shark for Codex'
$targets = @(
  (Join-Path $desktop 'Codex with ASCII Sharks.lnk'),
  (Join-Path $startMenu 'Codex with ASCII Sharks.lnk'),
  (Join-Path $desktop 'ASCII Shark Settings.lnk'),
  (Join-Path $startMenu 'ASCII Shark Settings.lnk')
)
if ($Remove) {
  foreach ($path in $targets) { if (Test-Path -LiteralPath $path) { [System.IO.File]::Delete($path) } }
  if (Test-Path -LiteralPath $startMenu) { [System.IO.Directory]::Delete($startMenu, $false) }
  Write-Host 'Removed only the shortcuts created by this project. The official Codex shortcut was not changed.'
  exit 0
}
if (-not (Test-Path -LiteralPath (Join-Path $root 'node_modules'))) {
  throw 'Dependencies are missing. Run npm ci from the project folder first.'
}
New-Item -ItemType Directory -Force $startMenu | Out-Null
$wscript = Join-Path $env:WINDIR 'System32\wscript.exe'
$icon = Join-Path $root 'assets\codex-icon.ico'
$shell = New-Object -ComObject WScript.Shell
$items = @(
  @{ Path = $targets[0]; Script = 'launch-hidden.vbs'; Name = 'Codex with ASCII Sharks' },
  @{ Path = $targets[1]; Script = 'launch-hidden.vbs'; Name = 'Codex with ASCII Sharks' },
  @{ Path = $targets[2]; Script = 'settings-hidden.vbs'; Name = 'ASCII Shark Settings' },
  @{ Path = $targets[3]; Script = 'settings-hidden.vbs'; Name = 'ASCII Shark Settings' }
)
foreach ($item in $items) {
  $shortcut = $shell.CreateShortcut($item.Path)
  $shortcut.TargetPath = $wscript
  $shortcut.Arguments = '"' + (Join-Path $PSScriptRoot $item.Script) + '"'
  $shortcut.WorkingDirectory = $root
  $shortcut.IconLocation = $icon + ',0'
  $shortcut.Description = $item.Name + ' (local reversible animation launcher)'
  $shortcut.Save()
}
Write-Host 'Created project-specific Desktop and Start Menu shortcuts. Existing official shortcuts were left untouched.'
