# ASCII Shark Chat Background

[English](#english) | [简体中文](#简体中文)

<a name="简体中文"></a>
## 简体中文

把 ASCII 鲨鱼游动动画作为低对比度背景，显示在 **Codex 桌面端 Work 页面** 的聊天主内容区后方。项目使用本地回环 CDP 将动画可撤销地注入页面，不修改官方安装包、`app.asar` 或签名文件。

动画灵感与核心 OceanEngine、World 和角色绘制逻辑来自 [stackedlol/ascii-sharks](https://github.com/stackedlol/ascii-sharks)。本项目保留了上游 MIT 许可文本，详见 [`src/animation/LICENSE.ascii-sharks`](src/animation/LICENSE.ascii-sharks)。本项目自身代码采用 MIT 许可。

### 功能

- Canvas 鲨鱼动画，初始 3 条；支持 1–12 条、透明度、速度、颜色、暂停、总开关和恢复默认。
- 可视化设置与独立动画预览：`http://127.0.0.1:4181/`。
- 只在可识别的 Codex Work 主内容区注入；Canvas 不接收鼠标事件、不处理键盘输入。
- 页面重载及聊天切换时由 watcher 重新定位；关闭 watcher 可清除注入。
- 本地 CDP 和设置服务仅监听 `127.0.0.1`。
- 附带桌面快捷方式图标；图标权利说明见 [`assets/ASSET-NOTICE.md`](assets/ASSET-NOTICE.md)。

### Windows 安装与启动

要求 Windows 10/11、Microsoft Store 版 Codex 桌面客户端、Node.js 22 或更新版本。

```powershell
npm ci
npm run setup:windows
```

安装脚本会在桌面和开始菜单创建 **Codex with ASCII Sharks** 与 **ASCII Shark Settings** 快捷方式，不会覆盖官方 Codex 快捷方式。之后使用带鲨鱼的快捷方式打开 Codex Work 页面；设置快捷方式可调参数。若系统弹出安全提示，请先检查项目来源和脚本内容，再由你自行决定是否运行。

也可从项目目录启动：

```powershell
npm run dev       # 演示/设置页
npm run cdp:start # 启动或复用带本机 CDP 的 Codex
npm run inject    # 启动可撤销注入 watcher
```

首次启用 CDP 时，如果 Codex 已在普通模式运行，启动流程可能请求正常重启客户端。请先保存未发送的输入。CDP 端口 `9335` 仅绑定回环地址；不要自行将其改为 `0.0.0.0`。

### 配置示例

复制 `.codex-shark.config.example.json` 为 `.codex-shark.config.json`，或使用可视化设置页面。用户配置不会提交到 Git。

```json
{
  "enabled": true,
  "paused": false,
  "count": 3,
  "opacity": 0.32,
  "speed": 0.55,
  "color": "#718a99",
  "port": 9335,
  "pollIntervalMs": 1200
}
```

### 关闭与恢复

- 执行 `npm run stop:background`：停止 watcher 并清理页面注入。
- 执行 `npm run cdp:stop`：请求正常关闭带 CDP 的 Codex 会话。
- 执行 `npm run config:reset`：恢复默认动画配置。
- 执行 `powershell -NoProfile -ExecutionPolicy RemoteSigned -File scripts/install-windows-shortcuts.ps1 -Remove`：只移除此项目创建的快捷方式。
- 日志位于 `%LOCALAPPDATA%\ASCIISharkCodex\`。

### 支持范围与限制

| 平台/页面 | 状态 |
|---|---|
| Windows 10/11 的 Microsoft Store Codex，Work 主内容页 | 当前验证目标 |
| ChatGPT 普通聊天、其他 Codex 页面 | 不保证 DOM 一致，不自动注入 |
| macOS Codex | 尚未实现启动适配，也未在 Mac 上验证 |

Codex 更新可能更改页面 DOM 或启动方式，届时需要重新验证定位逻辑。当前验证不覆盖所有窗口尺寸、DPI、多窗口和客户端版本。详细交接信息见 [`docs/PLATFORM-STATUS.md`](docs/PLATFORM-STATUS.md)。注入器无法识别页面时会跳过，不读取聊天正文、Cookie 或访问令牌。

### 开发与验收

```powershell
npm run typecheck
npm test
npm run build
npm run dev
```

维护者在 Windows 设备已检查设置页、动画预览、配置边界测试、构建和一次 Work 页面挂载/重载清理流程。不同 Codex 版本和机器的实际页面行为仍需自行验收。

---

<a name="english"></a>
## English

Add a subtle ASCII shark swimming animation behind the main content area of the **Codex desktop Work page**. The project injects a Canvas layer through local loopback CDP and can remove it again. It does not modify the official app package, `app.asar`, or signature files.

The animation is inspired by and reuses the core OceanEngine, World, and character-drawing logic from [stackedlol/ascii-sharks](https://github.com/stackedlol/ascii-sharks). Its MIT notice is retained at [`src/animation/LICENSE.ascii-sharks`](src/animation/LICENSE.ascii-sharks). This project's own code is MIT licensed.

### Features

- Canvas animation with 3 sharks by default; configure 1–12 sharks, opacity, speed, color, pause, enable/disable, and reset.
- Visual settings and a standalone animation preview at `http://127.0.0.1:4181/`.
- Injection is limited to a recognized Codex Work content area. The canvas does not receive pointer events or handle keyboard input.
- A local watcher reattaches after page reloads and chat switches; stopping it removes the injected layer.
- CDP and the settings server bind to `127.0.0.1` only.
- Includes a desktop shortcut icon. See [`assets/ASSET-NOTICE.md`](assets/ASSET-NOTICE.md) for its separate rights notice.

### Windows setup

Requires Windows 10/11, the Microsoft Store Codex desktop client, and Node.js 22 or later.

```powershell
npm ci
npm run setup:windows
```

The setup script creates **Codex with ASCII Sharks** and **ASCII Shark Settings** shortcuts on the Desktop and in the Start Menu. It does not replace the official Codex shortcut. Use the project shortcut to launch Codex with the local animation watcher; use the settings shortcut to adjust the animation. Review the source and origin of scripts before running them if Windows displays a security prompt.

You can also start from the project folder:

```powershell
npm run dev       # settings and preview
npm run cdp:start # launch/reuse Codex with local CDP
npm run inject    # start the reversible injection watcher
```

If Codex is already running without CDP, first-time setup may request a normal app restart. Save any unsent input first. CDP port `9335` binds to loopback only; do not change it to `0.0.0.0`.

### Example configuration

Copy `.codex-shark.config.example.json` to `.codex-shark.config.json`, or use the visual settings page. Personal configuration is excluded from Git.

```json
{
  "enabled": true,
  "paused": false,
  "count": 3,
  "opacity": 0.32,
  "speed": 0.55,
  "color": "#718a99",
  "port": 9335,
  "pollIntervalMs": 1200
}
```

### Stop and restore

- `npm run stop:background` stops the watcher and removes the injected layer.
- `npm run cdp:stop` requests a normal close of the Codex CDP session.
- `npm run config:reset` restores default animation settings.
- Run `powershell -NoProfile -ExecutionPolicy RemoteSigned -File scripts/install-windows-shortcuts.ps1 -Remove` to remove only shortcuts created by this project.
- Logs are stored in `%LOCALAPPDATA%\ASCIISharkCodex\`.

### Compatibility and limitations

| Platform/page | Status |
|---|---|
| Windows 10/11, Microsoft Store Codex, Work content page | Current verified target |
| Regular ChatGPT chats and other Codex pages | DOM may differ; injection is not guaranteed |
| Codex for macOS | Launcher adapter is not implemented and Mac has not been tested |

Codex updates may change the page DOM or startup behavior and require selector revalidation. Current verification does not cover every window size, DPI setting, multi-window setup, or app version. See [`docs/PLATFORM-STATUS.md`](docs/PLATFORM-STATUS.md) for the handoff. If a page cannot be identified, the injector skips it. It does not read chat text, cookies, or access tokens.

### Development and verification

```powershell
npm run typecheck
npm test
npm run build
npm run dev
```

The maintainer has checked the settings page, animation preview, configuration-boundary tests, build, and one Work-page attach/reload/cleanup flow on Windows. Actual behavior still needs verification across Codex versions and machines.
