# Codex 的 CodeBuddy 子代理技能

[English](README.md)

将边界清楚的任务交给本机 CodeBuddy CLI，包括自主完成多步骤调查和实现。CodeBuddy 可在分配范围内规划、排障、修复和验证；Codex 负责协调、集成与独立验收。本技能通过外部 CLI 协作，不提供 ACP 桥接或原生代理角色注册。

## 功能

- 文件只读调查、日志分析、变更审查、结构提取与隔离编辑；明确限定执行权限后可开展命令诊断。
- 任务卡明确工作归属、验收标准、简明且有证据的返回内容，以及独立验证方式。
- 按任务显式传递其他技能及所选文本依赖，记录内容哈希和私有快照，续接时保持选择不变。
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

根据可独立负责的工作和交接成本决定是否委派。小任务和复杂流程都可能适合：CodeBuddy 能接手尚未完成的工作、压缩尚未阅读的输入，或与 Codex 的独立工作同时推进。简单摘要和小修改若交接成本更高，就直接处理；确定性的过滤、计数和精确字段提取通常交给脚本。日常调用不要求节省统计或效率报告。

多步骤任务应说明目标、允许的路径与动作、验收检查和停止条件。轮次与时间预算覆盖整个流程，包括诊断、失败尝试、修复、验证和汇报。让 CodeBuddy 在该范围内自行处理常规失败，返回简明结论、关键证据和产物路径；Codex 验收前检查真实差异或关键结论，并执行适当验证。

根据所需工具选择模式：仅阅读文件的分析默认使用 `read_only`；需要运行命令的调查使用 `mode: edit`，并明确限定诊断命令和可写路径。模式不会扩大授权。示例见[任务模式](references/task-patterns.md)。

也可以直接运行任务卡：

```text
node scripts/manage.cjs run --card <任务卡绝对路径.json>
node scripts/task.cjs status <项目绝对路径> <任务ID>
```

需要复用其他本地技能的指令时，在完整任务卡中加入显式的 `skills` 数组：

```json
{
  "skills": [{"path": "C:\\Users\\you\\.codex\\skills\\example\\SKILL.md", "files": ["references/checklist.md"]}]
}
```

仅将所选入口和依赖的文本通过 stdin 传入，不会自动发现技能，也不会传递 Codex 的工具、凭据或连接器。原任务范围和模式继续生效。续接时继承技能选择，并要求源文件保持不变。大小限制、路径规则、分享检查和来源记录见[按任务传递技能](references/skills.md)。

精确行为见[任务卡](references/tasks.md)、[高级字段](references/advanced-tasks.md)和[配置管理](references/management.md)。工具限制和提示中的路径范围不等于操作系统沙箱；发送给 CodeBuddy 的源码/数据仍需符合宿主权限和当前任务授权。

## 离线验证

```text
node tests/management.cjs
node tests/configuration.cjs
node tests/advanced.cjs
node tests/regression.cjs
node tests/skills.cjs
```

测试仅使用合成数据和假 CLI，不需要 API。Windows 路径测试可能需要符号链接权限，应如实记录跳过项。当前 Windows 验证基线为 CLI 2.177.1、Node.js 22；包含 POSIX 代码路径，但本次未在 POSIX 主机上验证。

## 分享与升级

只上传发布文件，保留 `.local/`、日志、任务产物、答案文件、环境文件、凭据和本机配置在私有位置。`.gitignore` 只能辅助，发布前仍要检查暂存文件。升级已安装技能时保留 `.local/`。仓库不包含个人档案，每位用户安装时自行选择偏好。

## 许可

本仓库采用 [MIT 许可证](LICENSE)，Copyright (c) 2026 Fu2ia。CodeBuddy CLI、外部服务和另外选择传递的技能仍适用各自的条款及许可证。
