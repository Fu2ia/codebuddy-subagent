# Modes, stdin, schemas, and continuation

## Modes

`read_only` uses plan mode, `--tools Read,Grep,Glob`, matching allow rules, explicit denial of write/shell/agent/REPL/Skill tools, and an empty strict MCP configuration. Additional allowed_tools cannot extend this set. The parent saves the final report; do not open write tools merely to deliver it. This restricts task tools, not the CLI's own caches/logs or parent artifact writes.

`edit` uses acceptEdits and the caller's narrow authorized allow rules. Neither mode is OS isolation. Use an appropriate sandbox or working copy when file isolation is required.

## input_file

Optional `input_file` must be existing UTF-8 text inside root and outside internal jobs, at most 1 MiB, with no NUL bytes or invalid UTF-8. Select authorized excerpts before passing them. The executor sends prompt plus input through stdin, marking the input as untrusted task data. Without input_file, prompts over 12000 characters also use stdin. State records transport, input path, size, and SHA256. Stdin avoids argument-size limits, not model token usage or CLI logging.

## output_schema

Optional `output_schema` checks pure JSON independently before the business verifier. In read-only mode, structured_output is preferred if available, otherwise final result text is saved. In edit mode the report file is checked. Invalid JSON or structure prevents the verifier from running.

Supported strict subset: type (including type arrays), properties, required, additionalProperties, items, minItems/maxItems/uniqueItems, minLength/maxLength/pattern, minimum/maximum/exclusiveMinimum/exclusiveMaximum, enum, const, allOf/anyOf/oneOf, and boolean schemas. title, description, default, examples, $schema, and $id are annotations only. Unsupported keywords such as $ref or format are rejected before dispatch, not silently ignored.

Schema size is limited to 64 KiB and nesting to 24; schema-checked reports are at most 1 MiB. Parsing and validation run in a separate process with a 5-second deadline and 64 MiB heap, bounding pathological regular expressions. Cleanup may add approximately five seconds. State records schema_validated, schema_timed_out, schema_pid, and termination diagnostics as needed. The runner does not automatically pass --json-schema to the CLI, keeping its structured-output tools separate from the read-only tool set.

```json
{
  "type": "object",
  "properties": {"count": {"type": "integer"}, "sum": {"type": "number"}},
  "required": ["count", "sum"],
  "additionalProperties": false
}
```

Structural validity does not prove factual correctness; verify must compute or check the facts independently.

## scope and resume_from

Set a concrete, immutable scope in the first task to make it resumable. Use same-session continuation for a follow-up or bounded correction, and a new session for independent opinions or new objectives.

Create a new card with a fresh ID/result, the latest terminal parent's `resume_from`, a new prompt, and a fresh verify. Use `manage.cjs resume --card <card>` (or `task.cjs resume <card>` for direct execution), not run. Each attempt supplies its own output_schema; it is not inherited.

Continuation preserves the actual CLI session ID, scope, mode, model, and allow rules. It cannot widen permissions, change scope/model, branch from an obsolete attempt, reuse reports, or reset the cumulative budget. session.lock prevents concurrent continuations. The first timeout_s establishes total CLI time; each attempt uses the lesser of its requested budget and remaining chain time. Human gaps, authentication preparation, schema checks, and per-attempt verification are outside cumulative CLI time and have their own limits.

State includes chain_id, attempt, cli_session_id, resume_from, total_timeout_s, chain_cli_elapsed_ms, and remaining_cli_budget_s. Old jobs, missing scope, and unconfirmed termination cannot be resumed directly. External termination may leave incomplete budget records/locks; inspect processes and artifacts before recovery. A new ID is not permission to evade a user restriction.
