Read CLAUDE.md, every file in docs/, and scan the full source tree. Then run a retrospective.
Step 1 — Identify friction points. Look for evidence of:

Patterns in the code that contradict what CLAUDE.md says
Repeated workarounds or inconsistencies that suggest a missing convention
Anything in the source that would confuse a new session starting from CLAUDE.md alone
Decisions that were made but never documented
Documented constraints that are no longer accurate

Step 2 — Identify gaps. Look for:

Frequently used patterns with no documented convention
IPC channels, utilities, or modules that exist but aren't referenced anywhere in docs
Any architectural drift from docs/ARCHITECTURE.md

Step 3 — Make updates. For each finding:

Update CLAUDE.md if it's a convention, constraint, or command issue
Update the relevant doc in docs/ if it's a documentation accuracy issue
If a finding suggests a new standing rule, add it to CLAUDE.md under the appropriate section

Rules:

Do not add speculative improvements — only document what the codebase actually reflects
Do not restructure files that don't need changes
Do not remove anything unless it is factually wrong

Step 4 — Output a retro summary:

What was found
What was changed and where
What was left alone and why
Anything that needs a human decision (flag these clearly, don't resolve them yourself)