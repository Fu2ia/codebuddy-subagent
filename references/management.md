# Diagnostics and profile lifecycle

## Status layers

`node <skill>/scripts/manage.cjs doctor` (`status` is an alias) checks required components, resolves the CLI JS entry, runs a bounded 5-second --version, and reports credential candidates without values. Version output is reduced to a version token, not arbitrary CLI text. Exit 0 means static checks passed, 1 means incomplete static checks, and 2 means invalid arguments, profile conflict, or I/O failure.

`installation_complete` means a local model preference is set; it does not mean the model is available. `authentication: not_live_verified` is intentional: variable/file presence is not authentication. doctor shows normalized preferences so the agent can respect delegation and language choices. Optional `--root <absolute-project> --id <task-id>` reads selected historical task evidence. It is a mutable local record, not a live credential check or a substitute for inspecting artifacts.

To verify live access, run an authorized minimal synthetic task with a random challenge, schema, independent verify, and model-metadata inspection. Retain its process handle. This is different from version checks, fixed echo markers, and ACP handshakes.

## Commands and configuration

Read [installation](installation.md) for initial choices and their flags. Every command accepts `--home <absolute-private-directory>`. Default is the installed skill's ignored `.local` directory; CODEBUDDY_SUBAGENT_HOME overrides it. This is the skill's management directory, not CODEBUDDY_HOME.

```text
manage.cjs setup --model <chosen-model> --delegation <auto-or-explicit>
manage.cjs repair [installation choice flags]
manage.cjs disable
manage.cjs enable
manage.cjs run --card <absolute-card>
manage.cjs resume --card <absolute-card>
manage.cjs rollback --backup <UUID.json>
manage.cjs uninstall
```

Prefix commands with `node <skill>/scripts/`. Profiles contain owner, revision, enabled, cli, and preferences; they never contain credentials. Setup/repair preserve unspecified preferences and existing enabled state. CLI precedence is environment CODEBUDDY_CLI, profile cli, npm discovery through PATH. Region and credential directory similarly use existing environment values before profile values. Card model overrides user model; resume otherwise preserves the parent model. CLI arguments never include authentication values.

run/resume delegate to the existing task executor with the selected profile directory and inherited environment, forwarding output and exit codes. Disabled/unconfigured profiles block new managed calls. Disabling does not terminate in-flight work or change direct task.cjs behavior. Direct execution retains the lower-level compatibility interface and still uses local preferences, but the agent must respect user delegation and enable/disable intent.

## Ownership, backups, and recovery

Mutations take operation.lock exclusively and reload the profile under it. An existing lock stops the operation; inspect the owner process before manually handling a stale lock. Unknown ownership/fields and malformed JSON remain untouched; repair never force-adopts them. Locks coordinate this script's operations, not other programs or malicious concurrent changes.

Before replacing/deleting an owned profile, save an exclusively created backups/UUID.json snapshot. Then atomically replace the profile. The returned backup names the pre-change state. Explicit rollback validates ownership/schema, backs up the current state, restores choices, and assigns a new revision. Uninstall deletes only the owned profile, retains backups/unrelated files, and permits explicit later restore. For malformed/foreign current files, manually inspect and move them aside before restoring a known backup.

Management paths reject symlinks/junctions. These checks are not OS isolation or protection from all concurrent path substitution. Uninstall never removes a directory tree, CodeBuddy settings, environment credentials, extension login files, or native agent declarations. Authentication changes happen through the user's own environment/login flow.
