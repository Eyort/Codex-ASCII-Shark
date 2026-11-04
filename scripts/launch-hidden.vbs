Option Explicit

Dim shell, files, root, script, powershell, command
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
root = files.GetParentFolderName(WScript.ScriptFullName)
script = files.BuildPath(root, "launch-background.ps1")
powershell = shell.ExpandEnvironmentStrings("%WINDIR%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"
command = Chr(34) & powershell & Chr(34) & " -NoProfile -ExecutionPolicy RemoteSigned -WindowStyle Hidden -File " & Chr(34) & script & Chr(34)
shell.Run command, 0, False
