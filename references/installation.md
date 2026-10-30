# Installation and local choices

Copy the complete `codebuddy-subagent` directory into the host's skill directory, then run:

```text
node <installed-skill>/scripts/configure.cjs
node <installed-skill>/scripts/manage.cjs doctor
```

Use Node.js 22 or later and an already installed CodeBuddy CLI with a JavaScript entrypoint. Installation does not install CodeBuddy, purchase service access, or configure secrets. The shipped tests are offline; run a separately authorized minimal live task to verify authentication and model availability.

The terminal wizard asks these questions. During agent-assisted installation, ask in chat instead and apply the choices with setup flags. Reuse choices the user already supplied. Initial installation must choose a model; the package contains no personal default.

| Choice | Flag | Meaning / initial suggestion |
| --- | --- | --- |
| Model | `--model` | Required model ID supported by the user's endpoint; no implicit fallback |
| Delegation | `--delegation` | `explicit` (initial suggestion) or `auto`; auto covers only current authorized work |
| CLI JS entry | `--cli` | Absolute path, or omit to discover the npm entry through PATH |
| Whole CLI budget | `--timeout-s` | 600 seconds initially, range 1..1800; per-card override supported |
| Model turns | `--max-turns` | 80 initially, range 1..200; tune per task |
| Ordinary shell target | `--command-target-s` | 240 seconds initially; operational advice, not a tool setting |
| Shell reference limits | `--shell-default-ms`, `--shell-max-ms` | 120000 / 600000 initially, observed in CLI 2.177.1; verify for the installed shell/version |
| Authentication source | `--auth-mode` | `environment` initially, or opt into `environment_or_extension` |
| Credential directory | `--credential-dir` | Optional absolute extension credential directory, never a key |
| Region | `--region` | Optional non-secret region identifier; omitted means inherit environment |
| Response language | `--language` | `auto` initially; a language code such as `en` or `zh-CN` |

For a terminal-free installation, write the collected choices as JSON and run `configure.cjs --answers <file>`. Keys are the flag names converted to underscores without leading dashes, except `cli`, `model`, `delegation`, `region`, and `language`. Example: `{"model":"example-model","delegation":"explicit","timeout_s":300}`. This example model is a placeholder, not a service recommendation. Unknown fields, including API keys, are rejected. Keep answer files outside the public repository.

Alternatively apply explicit flags:

```text
node <skill>/scripts/manage.cjs setup --model <chosen-model> --delegation <auto-or-explicit>
```

The wizard requires a real interactive terminal unless `--answers` is supplied. An agent must collect choices rather than launching an interactive process and leaving it waiting. Existing settings supply wizard defaults; setup/repair preserve unspecified preferences and the current enabled state.

Settings are in `<installed-skill>/.local/profile.json`, excluded from Git. `CODEBUDDY_SUBAGENT_HOME` selects an alternate absolute private directory for both the manager and executor. `manage.cjs --home <absolute-directory>` overrides it for that invocation and passes the directory to the worker process. Direct `task.cjs` calls use the environment override or installed `.local`, not a previous manager invocation's home.

To migrate an old manager profile stored elsewhere, use its absolute directory explicitly. Profiles without preferences remain readable, but require a chosen model before setup is considered complete. Existing profiles and backups are not silently moved or overwritten. When upgrading files, preserve the installed `.local` directory; never include it in a public copy.

Authentication inherits `CODEBUDDY_API_KEY` / `CODEBUDDY_AUTH_TOKEN` and other CLI environment settings. If both exist, the skill reports both without asserting server precedence. With extension fallback explicitly enabled, the runner may read `auth.accessToken` from `Tencent-Cloud.coding-copilot.info` in `CODEBUDDY_CRED_DIR` or the Windows extension location under LOCALAPPDATA, checking available expiry information. It does not decrypt desktop-app credentials. In environment-only mode no extension token is read. No credential value is written by configuration management.
