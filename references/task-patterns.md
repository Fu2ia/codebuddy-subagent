# Bounded task patterns

Explicitly choose task_type and actual file scope. Select turns for the work, not a fixed one-turn investigation budget. These patterns do not grant additional authority. Add output_schema for machine-readable outputs and an independent verify for facts.

## investigation

Read only the selected authentication module. Explain entrypoints, credential refresh flow, failure branches, file/line evidence, and uncertainties. Do not edit or invoke another agent. Suggested fields: summary, evidence, uncertainties, next_check. The parent saves the report.

## log_analysis

Analyze a selected stdin log excerpt. Separate the first supported cause from cascading errors. Return root_cause, evidence, affected_files, next_check. Suggest a minimal check without executing it. Verify quotations against the original excerpt and review the inference independently.

## review

Review the specified diff for actual correctness defects. Each finding needs severity, file, line, trigger, evidence, and suggestion. Exclude style-only issues and unsupported guesses. An empty findings array is valid. Use a new session for an independent opinion; resume only to clarify the same bounded finding.

## extraction

Extract exact requested fields, preserve order when required, and report missing data instead of inventing values. For example compute count/sum from supplied numeric records. Return pure schema-conforming JSON and verify by independently recomputing from the input.

## isolated_edit

Modify only the selected parser test cases. Exclude production code and the verifier. Run only authorized target checks, then report changed_files, validation commands/results, and limitations. Default edit mode retains acceptEdits; any shell allow rules must be narrow. Codex reviews diff and behavior.

## resume

Continue the same diagnosis to provide a minimal reproduction for the prior cause; avoid rescanning unrelated areas. Use a fresh ID/result, latest resume_from, original scope/permissions/model, new verify, and the remaining chain budget. New objectives or expanded permissions require a separately authorized task.
