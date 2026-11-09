# Task-selected skills

Use `skills` when a delegated task needs instructions from another local skill. Codex selects the relevant skill and dependencies within current authorization, reviews their applicability and tool requirements, and lists them in the task card. Omitted `skills` means no bundled skills for a new task. There is no automatic discovery or inheritance of Codex's skill catalog, conversation, tools, credentials, or connectors.

```json
{
  "skills": [
    {
      "path": "/absolute/skills/example/SKILL.md",
      "files": ["references/checklist.md"]
    }
  ]
}
```

This is a fragment to merge into a normal task card with `id`, `root`, `prompt`, `result_file`, and `verify`. On Windows use a JSON-escaped absolute path such as `C:\\Users\\you\\.codex\\skills\\example\\SKILL.md`. A selector accepts only `path` and optional `files`. `path` names a regular `SKILL.md`; `files` lists relative paths beneath its directory. The skill directory may be outside the task project. Selecting a file authorizes neither additional filesystem access nor external sharing beyond the user's existing authorization.

## Delivery and dependencies

The runner bundles the entry text followed by only the listed dependency text, in card order, into a JSON section identified as selected skill instructions. It always sends prompts containing selected skills through stdin. `input_file` remains a separate, explicitly untrusted task-data section. Bundling transmits instructions; it does not call CodeBuddy's native `Skill` tool or install/register skills.

Select only necessary text. Relative references are not traversed automatically. List needed references or script source explicitly; including source transmits text and does not execute or install it. A selected skill's paths are provenance, not grants to read other files. If the task needs script execution, give the worker an available script path, declare permitted actions and suitable mode/allow rules separately, and verify the outcome. Skill instructions remain subject to the task's scope, permissions, mode, and higher-priority instructions. Codex must resolve conflicting requirements before dispatch; unavailable capabilities or missing dependencies are blockers for the affected work.

Each task permits at most 8 skills, 32 files including entry files, 64 KiB per file, and 256 KiB total raw bytes. Files must contain nonempty UTF-8 text without NUL bytes. Absolute dependency paths, directory traversal, dependency symlinks/junctions that escape the skill directory, entry-file symlinks, duplicate selections/files, and internal job files are rejected before CLI execution. Validation is not an OS sandbox or protection against concurrent filesystem replacement. Use a stable authorized source or an isolated copy where that matters.

Read-only mode retains its existing Read/Grep/Glob-only tool set and denies `Skill`, shell, writes, agents, and MCP tools even when selected text requests them. Edit mode retains its separately declared permissions. A Codex-specific skill requiring unavailable connectors or tools needs adaptation or parent-owned execution; a text bundle cannot supply those capabilities.

## Evidence and continuation

State records `skills`: canonical entry paths and ordered file records with skill-relative `path`, `bytes`, and `sha256`. Each selected task also writes `skills_snapshot` pointing to its private `.handoff/jobs/<id>/skills.json`, containing that manifest plus exact decoded text sent to the worker. Hashes cover original file bytes; snapshot text is UTF-8 decoded (a leading BOM is removed). Keep cards, snapshots, CLI logs, and task artifacts private: they may contain third-party or sensitive instructions. Check sharing rights and license requirements for selected materials; this repository's MIT license does not relicense them.

Resume with omitted `skills` inherits the previous selection and reloads its source files. An explicit selection must produce the identical ordered manifest, including hashes. Adding/removing skills or dependencies, changing file order/content, or losing source files blocks continuation before CLI execution. Restore the unchanged sources or start a separately authorized fresh task for changed instructions. The same-session CLI may retain earlier context; selection changes therefore require a new session rather than an attempted reset with `skills: []`.
