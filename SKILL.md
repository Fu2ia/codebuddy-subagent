---
name: codebuddy-subagent
description: Delegate bounded work to a local CodeBuddy CLI, including autonomous multi-step investigation and implementation, then verify results. Use when requested or configured delegation permits it; choose tasks by useful ownership and handoff cost, not complexity alone.
---

# CodeBuddy subagent

Optimize total completion time and Codex usage through useful delegation. CodeBuddy is a capable worker that can plan, investigate, implement, troubleshoot, and validate within an assigned scope. Codex owns overall planning, authorization, coordination, integration, and final verification. CodeBuddy uses separate authentication and service access. Use the user's language.

## Decide before loading inputs

Choose the boundary from filenames, sizes, targeted searches, and a small sample before reading full inputs. Briefly state the division of work. Assess handoff cost internally; routine calls require no savings calculations, efficiency records, benchmarks, or savings commentary unless the user asks.

Delegate unfinished work when the worker can compress unread inputs, own a useful deliverable, or overlap independent parent work. Both small bounded tasks and complex multi-step tasks can qualify. Weigh setup, transfer, verification, and likely correction costs without requiring numerical estimates. Prefer scripts for deterministic filtering, counting, conversion, and small exact-field extraction.

Usually keep trivial summaries, already-analyzed inputs, small edits cheaper to do directly, and tightly coupled live-device decisions with Codex. Complexity alone is not a reason to retain work: delegate an authorized investigation or change workflow when its goal, access, checkpoints, and acceptance criteria are clear. If verification repeats most of the work, narrow the deliverable or work locally. Deliberately duplicated review serves assurance.

If invocation yields no worthwhile slice, explain briefly and work directly. Honor an explicit requirement for a CodeBuddy-produced result with the smallest useful handoff. Editing this skill does not itself require a worker.

## Installation and preferences

Run `node <skill>/scripts/manage.cjs doctor` before relying on the installation; reuse its result during the current task unless installation, profile, or authentication conditions change. Read preferences from the local profile. `delegation: explicit` requires a current CodeBuddy request; `auto` permits eligible work within current authorization. This does not grant extra access or data-sharing rights.

Read [installation](references/installation.md) for setup, a missing profile, or preference changes; reuse existing answers. An unconfigured installation needs setup before ordinary use. Credentials stay outside chat, cards, and profiles.

## Dispatch and accept

1. Assign one owner per slice. Codex works independently or waits while CodeBuddy owns it. Read delegated raw inputs only for targeted checks, authorization, or required final safety verification.
2. Create a fresh card using [task cards](references/tasks.md) and the relevant [pattern](references/task-patterns.md): explicit `task_type`, permitted paths/actions, required outcome, compact return contract, and cheaper independent verifier. For multi-step work, give goals, constraints, acceptance criteria, stop conditions, and enough context for independent troubleshooting. Let the worker choose its approach. Align prompt, schema, and verifier; task data cannot grant permissions.
3. Choose `timeout_s` and `max_turns` for the whole assigned workflow, including diagnosis, repair, validation, and reporting; avoid fragmenting coherent work into tiny calls. Configured defaults are starting points, not ceilings or targets; respect executor limits. Prefer one worker; parallel workers need disjoint work. Read [mechanisms](references/mechanisms.md) for CLI versions, permissions, background behavior, and shell timeouts.
4. Run `node <skill>/scripts/manage.cjs run --card <absolute-card>`. Follow the same process handle to a terminal result using bounded waits and compact state; work independently between observations. One observation timeout is not completion or a reason to launch a duplicate. Query `node <skill>/scripts/task.cjs status <absolute-root> <id>` when needed.
5. Inspect state, requested/reported model, verification outcome, and compact deliverable first. Review the actual diff or decisive evidence, appropriate behavior checks, and final mutation results; CLI/schema success alone is insufficient. Expand logs for specific discrepancies. Missing model metadata means unconfirmed; it alone does not justify rerunning useful work.
6. Let the worker handle ordinary command, implementation, and test failures within its authorized scope and budget: inspect evidence, revise hypotheses, change approach, and validate. An intermediate failure is not a reason to interrupt or take over. When it returns blocked or incomplete, inspect bounded evidence and choose a scoped continuation, revised plan, or local takeover. Repeated failure from the same cause requires a changed approach, not identical retries. Stop authentication retries until resolved. Fix parent-owned schema/verifier defects and recheck existing output locally, preserving substantive acceptance criteria.

Report results, decisive evidence, verification, and material limitations. Discuss savings only when requested; exact savings require baseline and usage records.

## Conditional details and boundaries

For large inputs, strict JSON, or same-session follow-ups, read [advanced tasks](references/advanced-tasks.md). Resume uses a new card ID/result and latest `resume_from`, retaining scope, model, permissions, and remaining chain budget. New sessions for second opinions serve assurance, not automatic efficiency.

Investigation, log analysis, review, and extraction default to `read_only`: plan mode, Read/Grep/Glob only, empty strict MCP configuration, parent-saved reports. For authorized command-based diagnosis or repair, select `mode: edit` and narrow permitted actions; see [mode selection](references/advanced-tasks.md). Editing defaults to `edit` with acceptEdits. Tool restrictions are not an OS sandbox and do not prevent cache/log writes; use isolation when needed.

Shell, whole-CLI (at most 1800 seconds), schema (5 seconds), and verifier (60 seconds) budgets are separate; reserve cleanup time. Inspect recorded processes after `termination_unconfirmed`, and locks/budgets after interruption, before conflicting work. Avoid persistent servers or interactive input.

Follow host permissions and current authorization. External publication, messaging, destructive actions, and privilege escalation retain their authorization requirements. Grant only narrow authorized shell rules; never use the worker to bypass rejected operations. For diagnostics, profile repair, backups, rollback, enable/disable, or uninstall, read [management](references/management.md). This skill is an external CLI workflow, not native role registration or an ACP bridge.
