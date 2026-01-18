---
name: epic
description: Unified epic workflow - plan and execute large features with spec, research, plan, and execute phases
---

# Epic Workflow

A structured approach to implementing large features by breaking them into phases: spec, research, plan, and execute.

## Working Directory

Epics are stored in `.epics/` relative to a base path. By default, this is the project root.

**If the epic is in a subdirectory** (e.g., `weather-app/.epics/my-feature`), pass the `basePath` parameter to all tools:
- `list_epics(basePath: "weather-app")`
- `get_epic_status(epicName: "my-feature", basePath: "weather-app")`
- `get_available_tasks(epicName: "my-feature", basePath: "weather-app")`
- `build_task_context(epicName: "my-feature", taskId: "01", basePath: "weather-app")`

Determine the correct `basePath` by checking where the `.epics/` directory is located relative to the project root.

---

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

**Use the `list_epics` tool** to quickly get all epics and their status.

Display the results in a formatted list showing:
- Epic name
- Current phase (spec/research/plan/execute/complete)
- Task progress (X/Y done) if in execute phase
- Whether yolo mode is active

**If no epics found:**
> "No epics found. Start one with `/epic <name>`"

---

## Mode: status

**Use the `get_epic_status` tool** to quickly get detailed status.

Display the results showing:
- Current phase
- Which artifacts exist (spec.md, research.md, plan.md)
- Task breakdown: done, in-progress, pending, blocked
- Yolo mode status (if active)
- Suggested next action

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

**Use `get_available_tasks` tool** to quickly see what's ready to run.

**If all tasks done (available and blocked both empty):**
> "All tasks complete! Epic finished."
Stop.

**If tasks remain:**
Show task summary from the tool output and ask:
> "Ready to execute? X tasks remaining:
> - Available now: [from available list]
> - Blocked by dependencies: [from blocked list]"

Wait for confirmation. On "yes" or similar:

**Execute tasks using `build_task_context` + Task tool:**

Tasks with satisfied dependencies can be executed in **parallel** (the `available` list from `get_available_tasks` shows all tasks that are ready). Tasks whose dependencies aren't met yet are in the `blocked` list and must wait.

For each task in the `available` list:
1. Call `build_task_context(epicName, taskId, basePath?)` to get the prompt
2. Call the Task tool with the prompt to spawn a sub-agent
3. After sub-agent(s) complete, call `get_available_tasks` again to refresh the list
4. If a task isn't done, retry up to 3 times, then mark blocked
5. Repeat until all tasks done

**Note:** If executing in parallel, each sub-agent gets the same context snapshot. Their reports will be available for subsequent tasks.

**On task failure (after 3 attempts):**
- Mark task as `blocked` in the task file
- Add `## Blocked Reason: [why]`
- Continue with other available tasks

**On all tasks complete:**
> "Epic complete! All X tasks finished.
> 
> Summary of changes:
> - [file]: [what changed]
> - [file]: [what changed]"

---

## Mode: yolo (full auto)

Full automatic execution with no checkpoints. Requires spec to exist.

**IMPORTANT:** In yolo mode, the Epic plugin monitors for session idle events and automatically continues execution until all tasks are complete. You don't need to worry about session limits - just keep working and the plugin handles continuation.

### If no spec exists:

> "No spec found at `.epics/<name>/spec.md`.
> 
> Create one first:
> - Interactively: `/epic <name> spec`
> - Manually: Create `.epics/<name>/spec.md`"

Stop. Do not proceed.

### If spec exists:

**Step 1: Activate yolo mode in .state**

Read the current `.epics/<name>/.state` file and add the `yolo` configuration:

```json
{
  "name": "<name>",
  "currentPhase": "...",
  "specComplete": true,
  "researchComplete": false,
  "planComplete": false,
  "executeComplete": false,
  "lastUpdated": "<timestamp>",
  "yolo": {
    "active": true,
    "iteration": 1,
    "maxIterations": 100,
    "startedAt": "<current ISO timestamp>"
  }
}
```

This tells the Epic plugin to automatically continue the session when you finish responding.

**Step 2: Run all phases without asking for confirmation:**

1. **Research** (if not done) - explore codebase, save research.md
2. **Plan** (if not done) - create plan.md and task files  
3. **Execute** - use `get_available_tasks` + `build_task_context` + Task tool

**Execute tasks using `build_task_context` + Task tool:**

Tasks with satisfied dependencies can be executed in **parallel** if desired.

1. Call `get_available_tasks(epicName, basePath?)` to get the list of ready tasks
2. For each task in the `available` list (can parallelize):
   - Call `build_task_context(epicName, taskId, basePath?)` to get the prompt
   - Call the Task tool with the prompt to spawn a sub-agent
3. After sub-agent(s) complete, call `get_available_tasks` again to refresh
4. If a task isn't done, retry up to 3 times, then mark blocked
5. Repeat until all tasks done or all blocked

The plugin will automatically continue the session if context fills up.

**On all tasks complete:**
- Update .state: set `executeComplete: true` and `yolo.active: false`
> "Epic complete! All X tasks finished."

**On task blocked (after 3 attempts):**
- Mark as blocked in the task file, continue with others
- If all remaining tasks blocked:
  - Update .state: set `yolo.active: false`
  - Report which tasks are blocked and why

---

## Shared: Task Execution Logic

**IMPORTANT: Use the `build_task_context` tool + Task tool for each task.**

This pattern ensures each task runs with fresh context in a sub-agent:
- Fresh context for each task (no accumulated cruft)
- Proper handoff between tasks via reports
- Consistent execution pattern

### Execution Flow (Orchestrator)

As the orchestrator, you manage the overall flow:

1. **Read plan.md** to understand task order and dependencies
2. **For each available task** (dependencies satisfied, not blocked):
   
   **Step A: Build context**
   ```
   Call build_task_context with:
   - epicName: the epic name  
   - taskId: the task number (e.g., "01", "02")
   ```
   This returns a `prompt` field with the full context.
   
   **Step B: Execute with sub-agent**
   ```
   Call the Task tool with:
   - description: "Execute task {taskId} of epic {epicName}"
   - prompt: [the prompt returned from build_task_context]
   ```
   
3. **After sub-agent completes**, check the task file:
   - If `## Status: done` → Move to next task
   - If not done → Retry (up to 3 times) or mark blocked
4. **Repeat** until all tasks done or all remaining tasks blocked

### What the Sub-Agent Does

The sub-agent (spawned via Task tool) receives full context and:

1. **Reads the context**: spec, research, plan, all previous task files with reports
2. **Executes the task steps**
3. **Updates the task file**:
   - Changes `## Status: pending` to `## Status: done`
   - Adds a `## Report` section (see format below)
4. **May update future tasks** if the plan needs changes
5. **Confirms completion** when done

### Task File Format (with Report)

After completion, a task file should look like:

```markdown
# Task 01: [Name]

## Status: done

## Goal
[What this task accomplishes]

## Files
- path/to/file1.ts
- path/to/file2.ts

## Steps
1. [Concrete step]
2. [Concrete step]

## Done When
- [x] [Criterion - now checked]
- [x] [Criterion - now checked]

## Report

### What Was Done
- Created X component
- Added Y functionality
- Configured Z

### Decisions Made
- Chose approach A over B because [reason]
- Used library X for [reason]

### Issues / Notes for Next Task
- The API returns data in format X, next task should handle this
- Found that Y needs to be done differently than planned

### Files Changed
- src/components/Foo.tsx (new)
- src/hooks/useBar.ts (modified)
- package.json (added dependency)
```

### Handling Failures

When `execute_epic_task` returns `status: "failed"`:

1. **Check the summary** for what went wrong
2. **Decide**:
   - Retry (up to 3 times) if it seems like a transient issue
   - Mark as blocked if fundamentally broken
   - Revise the plan if the approach is wrong

To mark as blocked:
```markdown
## Status: blocked

## Blocked Reason
[Explanation of why this task cannot proceed]
```

### On discovering the plan needs changes:

If during execution you realize:
- A task's approach is fundamentally wrong (not just a bug to fix)
- Tasks are missing that should have been included
- Dependencies are incorrect
- The order should change
- New information invalidates earlier assumptions

**You may update the plan. The plan is a living document, not a rigid contract.**

1. **Update the affected task file(s)** in `tasks/`:
   - Revise steps if the approach needs changing
   - Update "Files" if different files are involved
   - Update "Done When" if criteria need adjusting

2. **Update `plan.md`** if:
   - Adding new tasks (create new task files too)
   - Removing tasks (mark as `## Status: cancelled` with reason)
   - Changing dependencies

3. **Document the change** in the task file:
   ```markdown
   ## Plan Revision
   - Changed: [what changed]
   - Reason: [why the original approach didn't work]
   - Timestamp: [now]
   ```

4. **Continue execution** with the revised plan

**Key principle:** Do NOT keep retrying a broken approach. If something fundamentally doesn't work, adapt the plan. It's better to revise and succeed than to stubbornly fail.

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

**With yolo mode active:**
```json
{
  "name": "<name>",
  "currentPhase": "execute",
  "specComplete": true,
  "researchComplete": true,
  "planComplete": true,
  "executeComplete": false,
  "lastUpdated": "2026-01-16T10:00:00Z",
  "yolo": {
    "active": true,
    "iteration": 1,
    "maxIterations": 100,
    "startedAt": "2026-01-16T10:00:00Z"
  }
}
```

**Yolo fields:**
- `active`: Set to `true` when yolo mode starts, `false` when complete or stopped
- `iteration`: Current iteration count (plugin increments this on each continuation)
- `maxIterations`: Safety limit (default 100). Set to 0 for unlimited.
- `startedAt`: ISO timestamp when yolo mode was activated

Update this file after each phase completes. The Epic plugin reads this file to determine whether to auto-continue.
