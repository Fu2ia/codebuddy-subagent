# CodeBuddy Subagent for Codex

[简体中文](README.zh-CN.md)

Delegate bounded work to a local CodeBuddy CLI, keep Codex in charge of review, and check the actual result before accepting it. This is an external CLI integration, not an ACP bridge or native agent registration.

## Features

- Read-only investigation, log analysis, review, extraction, and isolated editing.
- Fresh task IDs, explicit scopes, bounded CLI execution and process-tree cleanup.
- Stdin input, independent JSON Schema subset validation, and a required business verifier.
- Same-session continuation with locks and cumulative CLI budgets.
- Layered diagnostics and owned profiles with backup, rollback, enable/disable, and narrow uninstall.
- Installation-time model, delegation, timeout, environment, and language choices; no bundled personal model or credentials.

## Install

Prerequisites: Node.js 22+, an installed CodeBuddy CLI JS entry, and your own service credentials. Copy this directory as `codebuddy-subagent` into your Codex skills directory, preserving every scripts/reference file. From the installed directory run:

```text
node scripts/configure.cjs
node scripts/manage.cjs doctor
```

The wizard asks for your model ID, auto/explicit delegation, CLI path, execution budgets, credential source, optional region/directory, and response language. For agent-assisted installation, ask the agent to collect these choices first; use `--answers` or deterministic setup flags instead of leaving a terminal prompt unattended. See [installation choices](references/installation.md).

Configure API keys/tokens in your environment or supported CodeBuddy login flow, never in chat, answer files, or task cards. Environment-only authentication is the initial suggestion; extension-token fallback requires an explicit choice. doctor is static and does not prove authentication or model availability.

## Use

Ask Codex to use CodeBuddy for a bounded task. With `delegation=auto`, Codex can choose suitable subtasks within your current authorization; `explicit` requires a current request. Codex remains responsible for monitoring and independent review. The skill communicates in your language by default, even though its instructions are English.

For direct task-card use:

```text
node scripts/manage.cjs run --card <absolute-task-card.json>
node scripts/task.cjs status <absolute-project-root> <task-id>
```

Read [task cards](references/tasks.md), [advanced fields](references/advanced-tasks.md), and [management](references/management.md) for precise behavior. Tool restrictions and scope prompts are not an OS sandbox. Sending source/data to CodeBuddy must comply with your host permissions and the task's authorization.

## Offline verification

```text
node tests/management.cjs
node tests/configuration.cjs
node tests/advanced.cjs
node tests/regression.cjs
```

Tests use synthetic data and fake CLI entries; they require no API access. Windows symlink privileges can affect path tests; report skips accurately. CLI 2.177.1 and Node.js 22 were the Windows compatibility baseline. POSIX code paths are included but have not been validated on a POSIX host in this release.

## Sharing and upgrades

Only share the distribution files. `.local/`, logs, task artifacts, answer files, environment files, credentials, and machine-specific settings must stay private. The included `.gitignore` helps, but inspect staged files before publishing. When upgrading an installed copy, preserve `.local/`. Profiles are not included in this repository; installation asks each user for their own choices.
