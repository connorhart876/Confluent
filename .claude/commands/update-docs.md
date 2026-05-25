Read docs/brainstorm.md and docs/project_spec.md in full. Then update the following documentation files to reflect their current state. Do not invent information — only write what is derivable from the source documents and the current state of the codebase.

Update each file as follows:

**CLAUDE.md** — Update if the stack, architecture, data model, project policies, coding standards, or file pointers have changed. Do not rewrite sections that are still accurate.

**docs/ARCHITECTURE.md** — Update if the process model, IPC layer, data layer, file system layout, or frontend structure has changed. The stack diagram should reflect the current architecture.

**docs/CHANGELOG.md** — Add any new entries under [Unreleased] for changes made since the last review. Each entry format: `date | what changed | why it matters`. If a milestone has shipped, move its entries from [Unreleased] to a new versioned section. Do not remove existing entries.

**docs/STATUS.md** — Check off any MVP checklist items that are now complete. Update the "Status" line under Current Milestone to reflect actual progress (e.g., "Not started", "In progress", "Complete"). Do not uncheck items that were previously checked.

**docs/REFERENCE.md** — Update any section whose behavior, constraints, or edge cases have changed. Add new sections for any features that now exist but are not yet documented.

Rules that apply to all docs:

Do not remove content unless it is factually wrong
Do not add content that isn't reflected in the codebase
Do not reformat or restructure docs that don't need changes
If a doc is already accurate, leave it alone and say so

After updating, report which files were changed and what was updated in each.
