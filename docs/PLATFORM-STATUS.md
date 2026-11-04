# Platform status and handoff

## Windows

Windows 10/11 with the Microsoft Store Codex desktop client is the only supported runtime currently verified. The launcher discovers the installed package at run time and only accepts a CDP listener owned by that package on loopback. Work-page DOM selectors can change when Codex updates.

## macOS

Mac support is planned and not yet tested. The TypeScript animation and web settings preview are platform-neutral, but the current launcher, package discovery, shortcut installation, and stop/recovery scripts use Windows PowerShell and Windows Store app activation. A macOS adapter must be implemented and tested against the actual Codex desktop build before claiming support. Do not reuse the Windows CDP startup assumptions without verifying the Mac app's own debugging behavior.

## Continue on another device

Use this public repository as the project handoff. The source does not include private conversation history, local configuration, browser identifiers, or logs. To continue on a Mac, clone the repo and validate the target app and local CDP launch model first; track the result here without publishing account data or conversation content.
