# dsh-plus

DeepSeek Harness 增强插件：在 web 界面「设置」里加入 **视觉 / 记忆 / 插件市场 / 本地模型** 四个面板。

> 本插件是第三方插件，与 DeepSeek 官方无关。

## 功能

- **视觉 (modlens)**：配置看图引擎（provider / baseURL / API Key / 模型），API Key 掩码显示。
- **记忆 (mneme)**：配置跨会话记忆（自动注入 / 自动总结 / 做梦整理等阈值）。
- **插件市场**：搜索 GitHub `topic:dsh-plugin` 插件、一键安装、已安装清单、重启生效。
- **本地模型**：自动探测 ollama / LM Studio、列出实际模型、一键添加。
- **重启生效**：一键重启引擎并刷新窗口。

## 安装

```bash
# GitHub（推荐）
dsh plugin --profile web add github:nanbbb/dsh-plus

# npm
dsh plugin --profile web add dsh-plus
```

装完重启引擎生效。桌面端（DSH Desktop）已内置本插件，无需单独安装。

## License

MIT
