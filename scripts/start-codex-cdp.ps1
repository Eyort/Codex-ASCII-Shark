$ErrorActionPreference = 'Stop'
$port = 9335
$package = Get-AppxPackage -Name 'OpenAI.Codex' | Sort-Object Version -Descending | Select-Object -First 1
if (-not $package -or $package.SignatureKind -ne 'Store') { throw 'A registered Microsoft Store OpenAI.Codex package was not found.' }
$executable = [System.IO.Path]::GetFullPath((Join-Path $package.InstallLocation 'app\ChatGPT.exe'))
if (-not (Test-Path -LiteralPath $executable)) { throw 'The registered Codex package executable could not be found.' }
$manifest = Get-AppxPackageManifest -Package $package
$application = $manifest.Package.Applications.Application | Select-Object -First 1
if (-not $application.Id) { throw 'The package application ID could not be resolved.' }
$aumid = "$($package.PackageFamilyName)!$($application.Id)"

function Get-CodexProcesses {
  @(Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" | Where-Object {
    $_.ExecutablePath -and [System.IO.Path]::GetFullPath($_.ExecutablePath) -ieq $executable
  })
}
function Get-Listeners {
  @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
}
function Test-VerifiedListener {
  $listeners = Get-Listeners
  if ($listeners.Count -eq 0) { return $false }
  foreach ($listener in $listeners) {
    if ($listener.LocalAddress -notin @('127.0.0.1', '::1')) {
      throw "Port $port is listening beyond loopback ($($listener.LocalAddress)); refusing to connect."
    }
    $owner = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue
    if (-not $owner -or -not $owner.ExecutablePath -or [System.IO.Path]::GetFullPath($owner.ExecutablePath) -ine $executable) {
      throw "Port $port is owned by an unverified process; refusing to connect."
    }
  }
  return $true
}
function Start-RegisteredCodex {
  if (-not ('AsciiSharkCodex.PackageLauncher' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
namespace AsciiSharkCodex {
  [ComImport, Guid("2e941141-7f97-4756-ba1d-9decde894a3d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  internal interface IApplicationActivationManager {
    [PreserveSig] int ActivateApplication([MarshalAs(UnmanagedType.LPWStr)] string appUserModelId,
      [MarshalAs(UnmanagedType.LPWStr)] string arguments, uint options, out uint processId);
  }
  [ComImport, Guid("45ba127d-10a8-46ea-8ab7-56ea9078943c")] internal class ApplicationActivationManager { }
  public static class PackageLauncher {
    public static uint Launch(string id, string arguments) {
      var manager = (IApplicationActivationManager)new ApplicationActivationManager();
      try { uint processId; Marshal.ThrowExceptionForHR(manager.ActivateApplication(id, arguments, 0, out processId)); return processId; }
      finally { if (Marshal.IsComObject(manager)) Marshal.FinalReleaseComObject(manager); }
    }
  }
}
'@
  }
  $arguments = "--remote-debugging-address=127.0.0.1 --remote-debugging-port=$port"
  [void][AsciiSharkCodex.PackageLauncher]::Launch($aumid, $arguments)
}

$processes = Get-CodexProcesses
if (-not (Test-VerifiedListener) -and $processes.Count -gt 0) {
  Add-Type -AssemblyName System.Windows.Forms
  $answer = [System.Windows.Forms.MessageBox]::Show(
    'Codex needs one normal restart to enable the local animation connection. Save any unsent text first. Restart Codex now?',
    'ASCII Shark for Codex',
    [System.Windows.Forms.MessageBoxButtons]::YesNo,
    [System.Windows.Forms.MessageBoxIcon]::Warning
  )
  if ($answer -ne [System.Windows.Forms.DialogResult]::Yes) { Write-Host 'Cancelled; Codex was not changed.'; exit 3 }
  $rootProcesses = @($processes | Where-Object { $_.CommandLine -notmatch '(?:^|\s)--type=' })
  if ($rootProcesses.Count -eq 0) { throw 'The main Codex process could not be identified; close Codex normally and try again.' }
  foreach ($process in $rootProcesses) { try { [void](Get-Process -Id $process.ProcessId).CloseMainWindow() } catch {} }
  $deadline = (Get-Date).AddSeconds(15)
  while ((Get-CodexProcesses).Count -gt 0 -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 250 }
  if ((Get-CodexProcesses).Count -gt 0) { throw 'Codex did not close normally. Close its window and run the Codex with ASCII Sharks shortcut again.' }
  Start-RegisteredCodex
}
elseif (-not (Test-VerifiedListener)) {
  if (Get-Listeners) { throw "Port $port is occupied by an unverified listener." }
  Start-RegisteredCodex
}

$deadline = (Get-Date).AddSeconds(45)
do {
  Start-Sleep -Milliseconds 500
  $ready = Test-VerifiedListener
  if ($ready) {
    try {
      $version = Invoke-RestMethod -Uri "http://127.0.0.1:$port/json/version" -TimeoutSec 2
      $url = [Uri]$version.webSocketDebuggerUrl
      if ($url.Scheme -ne 'ws' -or $url.Host -ne '127.0.0.1' -or $url.Port -ne $port -or $url.AbsolutePath -notmatch '^/devtools/browser/[A-Za-z0-9._-]+$') { throw 'CDP returned an unexpected browser identity URL.' }
      $browserId = $url.AbsolutePath -replace '^/devtools/browser/', ''
      break
    } catch { $ready = $false }
  }
} while ((Get-Date) -lt $deadline)
if (-not $browserId) { throw "Codex did not provide a verified loopback CDP endpoint on port $port within 45 seconds." }

$state = [ordered]@{
  browserId = $browserId
  port = $port
  packageFullName = $package.PackageFullName
  executablePath = $executable
}
[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location) '.codex-shark-state.json'),
  ($state | ConvertTo-Json),
  [System.Text.UTF8Encoding]::new($false)
)
Write-Host "Verified $($package.PackageFullName) on 127.0.0.1:$port (browser $browserId)."
Write-Host 'The local Work-page watcher can now attach. Close Codex normally to end the CDP session.'
