# Terminal Mcp Server

提供执行命令mcp，方便 openclaw、picoclaw 等各机器人使用

> 请注意，命令执行有一定风险，请尽量在沙箱环境或你的机器人部署在 docker 容器中使用，避免造成损失

## Tools

- get_systeminfo: 获取系统信息
- exec_command: 执行命令
- get_datetime: 获取当前时间

## Mcp Config

```json
{
  "mcpServers": {
    "mcp-terminal": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@seepine/mcp-terminal"],
      // 可选，设置默认执行目录
      "env": {
        "DEFAULT_CWD": "/Users/your_name/workspace"
      }
    }
  }
}
```
