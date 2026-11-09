# Bounded task patterns

Apply the entrypoint's ownership and handoff criteria; both small bounded tasks and complex workflows can qualify. Each pattern assigns unfinished work to the worker and returns only what Codex needs to decide or integrate. Select `task_type` explicitly; use the return contract in [task cards](tasks.md). These patterns grant no additional authority.

## investigation

Delegate an unfamiliar subsystem or bounded question without Codex first reading it in full. Let the worker gather evidence, test hypotheses, and revise its approach. Use `read_only` for file-only investigation; select `mode: edit` with narrow authorized commands when execution is necessary. Return the supported conclusion, evidence, checks performed, and genuine blockers. Codex verifies key claims rather than repeating the diagnosis.

## log_analysis

Delegate a large log set whose relevant sequence has not already been analyzed. Use exact paths and time windows, or a filtered `input_file`; keep raw logs on disk. Return the first supported cause, a few chronological evidence locations, affected components, and unresolved alternatives. Separate observations from hypotheses and name the evidence needed to distinguish them. Codex verifies the decisive sequence, rather than replaying the complete log analysis.

## review

Delegate an independent diff or coverage slice. Return actionable findings with file/line, trigger, evidence, and consequence; an empty findings array is valid. Keep stylistic observations and unsupported guesses out. Codex evaluates findings and relevant integration risks. Deliberately reviewing the same slice twice is an assurance choice; do not present it as a way to save analysis. Use a new session for an independent opinion and resume only for bounded clarification.

## extraction

Use local scripts for counts, filtering, and exact-field extraction with a known schema. Delegate when substantial semantic interpretation or heterogeneous inputs make that approach more expensive. Specify exact fields, source locations, missing-value handling, and a compact result. Large inventories belong in the result artifact; Codex reads decision-relevant aggregates and checks invariants or selected source rows. Required exhaustive checks should be scripted where possible. Avoid a second prose summary of a small configuration already read by Codex.

## isolated_edit

Delegate an independent implementation with permitted files, required behavior, validation commands, and an integration boundary. Let the worker plan, investigate failures, repair its changes, and validate within budget. Codex works elsewhere while the worker owns those files. Return changed paths, behavior, validation outcome, and limitations. Codex reviews the actual diff and suitable checks rather than reconstructing the implementation. Keep parent-owned verifiers outside worker edit scope.

## resume

Resume when the worker can usefully complete the remaining scope, including further troubleshooting. Give the discrepancy/blocker and stable acceptance criteria; let it choose the next approach. Keep original scope, mode, permissions, and model. Use a fresh ID/result, latest `resume_from`, and remaining chain budget as described in [advanced tasks](advanced-tasks.md). Locally recheck existing output for parent-owned verifier/schema defects. New objectives require a separately authorized task.
