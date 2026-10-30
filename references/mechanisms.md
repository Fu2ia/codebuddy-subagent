# CLI compatibility and execution mechanisms

The historical compatibility baseline is CodeBuddy CLI 2.177.1 on Windows with `-p --output-format json` and Node.js 22. These observations are version-specific, not promises for every platform. The runner includes POSIX process-group cleanup, but this distribution was validated on Windows; test your own platform and CLI version. No Git Bash is required.

## Shell and background behavior

The inspected PowerShell tool defaulted to 120000 ms, capped explicit timeouts at 600000 ms, and could return a background task_id after a foreground timeout. Explicit run_in_background=true was rejected in print+JSON mode. A controlled 310-second command completed with timeout=400000, showing that a universal 300-second shell ceiling was incorrect. Tool timeout, CLI budget, and host observation wait are independent.

Installation asks for reference shell limits and an ordinary command target. These values only shape the worker reminder; they do not change CodeBuddy's tools. Check active tool descriptions and installed source after upgrades. A command exceeding the reference default needs an explicit appropriate timeout. A returned task_id may represent live work; follow it with bounded TaskOutput waits, then check the result and stop unfinished work before declaring completion.

Do not use CLI --bg for ordinary delegated jobs. Keep the host's live process handle until terminal completion. Foreground servers and unbounded polling do not fit bounded task execution. If the host externally kills its wrapper, automatic cleanup is not guaranteed: inspect the CLI and descendants before retrying.

## Permissions and output

acceptEdits does not grant arbitrary shell access. Exact allow rules can depend on command-parser normalization, including removal of quotes. Prefer stable relative arguments where appropriate; diagnose mismatches rather than broadening to bypassPermissions or global approval. Only use rules justified by the user's authorization.

The runner expects explicit successful final JSON result data, not a marker in arbitrary stdout. It records providerData.model, requestModelId, and requestModelName when present. These are client request/response identifiers, not independent proof of backend physical deployment. CodeBuddy's internal Agent tool may select another model; do not infer its model from the parent session.

Read-only mode explicitly limits tools and empties MCP configuration. It is not a claim of filesystem sandboxing. The package does not implement ACP transport or register a native host agent type.

For a new CLI version, verify JS entry discovery, --version, a synthetic read-only task, model metadata, schema/verifier behavior, same-session continuation, and bounded timeout cleanup before relying on compatibility. Use the included offline tests first; live tests need the user's service access and authorized input.
