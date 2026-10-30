# Codex 的 CodeBuddy 子代理技能

[English](README.md)

将边界清楚的任务交给本机 CodeBuddy CLI，由 Codex 持续跟进、审阅真实产物并独立验收。本技能通过外部 CLI 协作，不提供 ACP 桥接或原生代理角色注册。

## 功能

- 只读调查、日志分析、变更审查、结构提取与隔离编辑。
- 新任务 ID、明确范围、会话超时与进程树清理。
- stdin 输入、独立 JSON Schema 子集校验和必填业务验收程序。
- 同会话续接、互斥锁与累计 CLI 时间预算。
- 分层诊断、配置所有权、备份、回滚、启停及仅删除自有配置的卸载。
- 安装时选择模型、委派方式、超时、环境和语言；不携带作者个人模型偏好或凭据。

## 安装

需要 Node.js 22+、已安装的 CodeBuddy CLI JS 入口及自己的服务认证。将整个目录复制到 Codex 技能目录，目录名为 `codebuddy-subagent`，保留全部 scripts 和 references 文件。进入安装目录后运行：

```text
node scripts/configure.cjs
node scripts/manage.cjs doctor
```

向导会询问模型 ID、自动或显式委派、CLI 路径、执行预算、认证来源、可选区域/凭据目录和回复语言。让代理协助安装时，应先在对话中收集选择，再使用 `--answers` 或确定性 setup 参数，避免启动无人应答的终端交互。字段说明见[英文安装文档](references/installation.md)。

API Key/Token 应在自己的环境或 CodeBuddy 登录流程中配置，不要发到聊天、答案文件或任务卡。初始建议仅继承环境认证；读取扩展令牌需主动选择。doctor 只做静态检查，不能证明认证和模型调用成功。

## 使用

请 Codex 使用 CodeBuddy 完成一个有明确边界的任务。选择 `delegation=auto` 后，Codex 可在当前授权范围内自行判断是否委派；`explicit` 则需要当前明确请求。Codex 始终负责持续跟进和独立验收。虽然技能指令使用英文，默认仍按用户语言沟通。

也可以直接运行任务卡：

```text
node scripts/manage.cjs run --card <任务卡绝对路径.json>
node scripts/task.cjs status <项目绝对路径> <任务ID>
```

精确行为见[任务卡](references/tasks.md)、[高级字段](references/advanced-tasks.md)和[配置管理](references/management.md)。工具限制和提示中的路径范围不等于操作系统沙箱；发送给 CodeBuddy 的源码/数据仍需符合宿主权限和当前任务授权。

## 离线验证

```text
node tests/management.cjs
node tests/configuration.cjs
node tests/advanced.cjs
node tests/regression.cjs
```

测试仅使用合成数据和假 CLI，不需要 API。Windows 路径测试可能需要符号链接权限，应如实记录跳过项。当前 Windows 验证基线为 CLI 2.177.1、Node.js 22；包含 POSIX 代码路径，但本次未在 POSIX 主机上验证。

## 分享与升级

只上传发布文件，保留 `.local/`、日志、任务产物、答案文件、环境文件、凭据和本机配置在私有位置。`.gitignore` 只能辅助，发布前仍要检查暂存文件。升级已安装技能时保留 `.local/`。仓库不包含个人档案，每位用户安装时自行选择偏好。
