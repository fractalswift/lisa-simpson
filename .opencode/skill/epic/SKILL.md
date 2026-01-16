---
name: epic
description: Unified epic workflow - plan and execute large features with spec, research, plan, and execute phases
---

# Epic Workflow

A structured approach to implementing large features by breaking them into phases: spec, research, plan, and execute.

## Parse Arguments

The input format is: `<epic-name> [mode]`

**Modes:**
- `list` (no epic name) → List all epics
- `<name>` (no mode) → Default mode with checkpoints
- `<name> spec` → Just create/view spec
- `<name> yolo` → Full auto, no checkpoints
- `<name> status` → Show status

**Examples:**
- `list` → list all epics
- `my-feature` → default mode
- `my-feature spec` → spec only
- `my-feature yolo` → full auto
- `my-feature status` → show status

---

## Mode: list

List all epics in the `.epics/` directory.

For each epic, show:
- Epic name
- Current phase (spec/research/plan/execute/complete)
- Task progress (X/Y done) if in execute phase

**If no `.epics/` directory exists:**
> "No epics found. Start one with `/epic <name>`"

---

## Mode: status

Show detailed status for the specified epic.

Read `.epics/<name>/.state` and all task files.

Display:
- Current phase
- Which artifacts exist (spec.md, research.md, plan.md)
- Task breakdown: done, in-progress, pending, blocked
- What's available to run next

**If epic doesn't exist:**
> "Epic '<name>' not found. Start it with `/epic <name>`"

---

## Mode: spec

Interactive spec creation only. Does NOT continue to research/plan/execute.

### If spec already exists:

Read and display the existing spec, then:

> "Spec already exists at `.epics/<name>/spec.md`. You can:
> - Edit it directly in your editor
> - Delete it and run `/epic <name> spec` again to start over
> - Run `/epic <name>` to continue with research and planning"

### If no spec exists:

Have an interactive conversation to define the spec. Cover:

1. **Goal** - What are we trying to achieve? Why?
2. **Scope** - What's included? What's explicitly out of scope?
3. **Acceptance Criteria** - How do we know when it's done?
4. **Technical Constraints** - Any specific technologies, patterns, or limitations?

Be conversational. Ask clarifying questions. Push back if scope is too large or vague.

**Keep it concise** - aim for 20-50 lines. Focus on "what" and "why", not "how".

### When conversation is complete:

Summarize the spec and ask:

> "Here's the spec:
> 
> [formatted spec]
> 
> Ready to save to `.epics/<name>/spec.md`?"

On confirmation, create the directory and save:

```
.epics/<name>/
  spec.md
  .state
```

**spec.md format:**
```markdown
# Epic: <name>

## Goal
[What we're building and why - 1-2 sentences]

## Scope
- [What's included]
- [What's included]

### Out of Scope
- [What we're NOT doing]

## Acceptance Criteria
- [ ] [Measurable criterion]
- [ ] [Measurable criterion]

## Technical Constraints
- [Any constraints, or "None"]
```

**.state format (JSON):**
```json
{
  "name": "<name>",
  "currentPhase": "spec",
  "specComplete": true,
  "researchComplete": false,
  "planComplete": false,
  "executeComplete": false,
  "lastUpdated": "<timestamp>"
}
```

After saving:
> "Spec saved to `.epics/<name>/spec.md`
> 
> Next steps:
> - Run `/epic <name>` to continue with research and planning
> - Run `/epic <name> yolo` for full auto execution"

---

## Mode: default (with checkpoints)

This is the main interactive mode. It guides you through each phase with approval checkpoints.

### Step 1: Ensure spec exists

**If no spec:**
Run the spec conversation (same as spec mode). After saving, continue to step 2.

**If spec exists:**
Read and briefly summarize it, then continue to step 2.

### Step 2: Research phase

**If research.md already exists:**
> "Research already complete. Proceeding to planning..."
Skip to step 3.

**If research not done:**
> "Ready to start research? I'll explore the codebase to understand what's needed for this epic."

Wait for confirmation. On "yes" or similar:

1. Read spec.md
2. Explore the codebase using available tools (LSP, grep, glob, file reads)
3. Document findings
4. Save to `.epics/<name>/research.md`
5. Update .state

**research.md format:**
```markdown
# Research: <name>

## Overview
[1-2 sentence summary of findings]

## Relevant Files
- `path/to/file.ts` - [why it's relevant]
- `path/to/file.ts` - [why it's relevant]

## Existing Patterns
[How similar things are done in this codebase]

## Dependencies
[External packages or internal modules needed]

## Technical Findings
[Key discoveries that affect implementation]

## Recommendations
[Suggested approach based on findings]
```

After saving:
> "Research complete and saved. Found X relevant files. Key insight: [one line summary]"

### Step 3: Plan phase

**If plan.md already exists:**
> "Plan already complete with X tasks. Proceeding to execution..."
Skip to step 4.

**If plan not done:**
> "Ready to create the implementation plan?"

Wait for confirmation. On "yes" or similar:

1. Read spec.md and research.md
2. Break down into discrete tasks (aim for 1-5 files per task, ~30 min of work each)
3. Define dependencies between tasks
4. Save plan.md and individual task files
5. Update .state

**plan.md format:**
```markdown
# Plan: <name>

## Overview
[1-2 sentence summary of approach]

## Tasks

1. [Task name] - tasks/01-[slug].md
2. [Task name] - tasks/02-[slug].md
3. [Task name] - tasks/03-[slug].md

## Dependencies

- 01: []
- 02: [01]
- 03: [01]
- 04: [02, 03]

## Risks
- [Risk and mitigation, or "None identified"]
```

**Task file format (tasks/XX-slug.md):**
```markdown
# Task X: [Name]

## Status: pending

## Goal
[What this task accomplishes - 1-2 sentences]

## Files
- path/to/file1.ts
- path/to/file2.ts

## Steps
1. [Concrete step]
2. [Concrete step]
3. [Concrete step]

## Done When
- [ ] [Testable criterion]
- [ ] [Testable criterion]
```

After saving:
> "Plan created with X tasks:
> 1. [task 1 name]
> 2. [task 2 name]
> ...
> 
> Saved to `.epics/<name>/plan.md`"

### Step 4: Execute phase

**If all tasks already done:**
> "All tasks complete! Epic finished."
Stop.

**If tasks remain:**
Show task summary and ask:
> "Ready to execute? X tasks remaining:
> - Available now: [tasks with satisfied dependencies]
> - Blocked: [tasks waiting on dependencies]"

Wait for confirmation. On "yes" or similar:

**Execute all available tasks:**
1. Find next task with satisfied dependencies
2. Update task status to `in-progress`
3. Execute the task (make code changes)
4. Verify against "Done When" criteria
5. Update task status to `done`
6. Repeat until all tasks done OR context ~60% full

**On task failure (after 3 attempts):**
- Mark task as `blocked`
- Add note explaining why
- Continue with other available tasks

**On context threshold (~60%):**
- Save progress notes to current task
- Update .state
- Report: "Context filling up. Progress saved. Run `/epic <name>` to continue."

**On all tasks complete:**
> "Epic complete! All X tasks finished.
> 
> Summary of changes:
> - [file]: [what changed]
> - [file]: [what changed]"

---

## Mode: yolo (full auto)

Full automatic execution with no checkpoints. Requires spec to exist.

### If no spec exists:

> "No spec found at `.epics/<name>/spec.md`.
> 
> Create one first:
> - Interactively: `/epic <name> spec`
> - Manually: Create `.epics/<name>/spec.md`"

Stop. Do not proceed.

### If spec exists:

Run all phases without asking for confirmation:

1. **Research** (if not done) - explore codebase, save research.md
2. **Plan** (if not done) - create plan.md and task files
3. **Execute** - run all tasks until done, failed, or context limit

**On context threshold (~60%):**
- Save progress notes
- Update .state
- Report: "Context filling up. Progress saved. Run `/epic <name> yolo` to continue."

**On all tasks complete:**
> "Epic complete! All X tasks finished."

**On task blocked (after 3 attempts):**
- Mark as blocked, continue with others
- If all remaining tasks blocked, report and stop

---

## Shared: Task Execution Logic

When executing a task:

### 1. Read the task file
Parse goal, files, steps, done-when criteria.

### 2. Check dependencies
Read plan.md Dependencies section. Ensure all dependencies have status `done`.

### 3. Update status
Change `## Status: pending` to `## Status: in-progress`

### 4. Execute steps
Follow the steps in the task file. Make the code changes.

### 5. Verify completion
Check each "Done When" criterion. If all pass, task is done.

### 6. Update status
Change `## Status: in-progress` to `## Status: done`

### 7. Report
> "Completed: Task XX - [name]
> Changes: [files modified]
> Now available: [newly unblocked tasks]"

### On failure:
- Retry up to 3 times
- After 3 failures, mark as `## Status: blocked`
- Add `## Blocked Reason: [why]`
- Continue with other available tasks

### On context threshold:
If context is ~60% full mid-task:
- Add progress notes to task file:
```markdown
## Progress Notes
- Completed: [what was done]
- Remaining: [what still needs doing]
- Timestamp: [now]
```
- Save and exit

---

## Shared: Parsing Dependencies

The plan.md Dependencies section looks like:
```markdown
## Dependencies
- 01: []
- 02: [01]
- 03: [01, 02]
```

A task is **available** when:
1. Status is `pending` (or `in-progress` with progress notes)
2. All tasks in its dependency list have status `done`

A task is **blocked** when:
1. Status is `blocked`, OR
2. Any dependency is not `done` and not expected to complete

---

## State File (.state)

Track epic progress in `.epics/<name>/.state`:

```json
{
  "name": "<name>",
  "currentPhase": "execute",
  "specComplete": true,
  "researchComplete": true,
  "planComplete": true,
  "executeComplete": false,
  "lastUpdated": "2026-01-16T10:00:00Z"
}
```

Update this file after each phase completes.
