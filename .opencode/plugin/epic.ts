import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { readdir, readFile, writeFile } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"

/**
 * Epic Workflow Plugin for OpenCode
 *
 * Provides:
 * 1. `build_task_context` tool - Builds context for a task (to be used with Task tool)
 * 2. Yolo mode auto-continue - Keeps the session running until all tasks are done
 *
 * Works with the epic skill (.opencode/skill/epic/SKILL.md) which manages the epic state.
 */

// ============================================================================
// Types
// ============================================================================

interface YoloState {
  active: boolean
  iteration: number
  maxIterations: number
  startedAt: string
}

interface EpicState {
  name: string
  currentPhase: string
  specComplete: boolean
  researchComplete: boolean
  planComplete: boolean
  executeComplete: boolean
  lastUpdated: string
  yolo?: YoloState
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Read a file if it exists, return empty string otherwise
 */
async function readFileIfExists(path: string): Promise<string> {
  if (!existsSync(path)) return ""
  try {
    return await readFile(path, "utf-8")
  } catch {
    return ""
  }
}

/**
 * Get all task files for an epic, sorted by task number
 */
async function getTaskFiles(directory: string, epicName: string): Promise<string[]> {
  const tasksDir = join(directory, ".epics", epicName, "tasks")

  if (!existsSync(tasksDir)) return []

  try {
    const files = await readdir(tasksDir)
    return files
      .filter((f) => f.endsWith(".md"))
      .sort((a, b) => {
        const numA = parseInt(a.match(/^(\d+)/)?.[1] || "0", 10)
        const numB = parseInt(b.match(/^(\d+)/)?.[1] || "0", 10)
        return numA - numB
      })
  } catch {
    return []
  }
}

/**
 * Find the active epic with yolo mode enabled
 */
async function findActiveYoloEpic(
  directory: string
): Promise<{ name: string; state: EpicState } | null> {
  const epicsDir = join(directory, ".epics")

  if (!existsSync(epicsDir)) return null

  try {
    const entries = await readdir(epicsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const statePath = join(epicsDir, entry.name, ".state")
      if (!existsSync(statePath)) continue

      try {
        const content = await readFile(statePath, "utf-8")
        const state = JSON.parse(content) as EpicState

        if (state.yolo?.active) {
          return { name: entry.name, state }
        }
      } catch {
        continue
      }
    }
  } catch {
    return null
  }

  return null
}

/**
 * Count remaining tasks for an epic (pending or in-progress)
 */
async function countRemainingTasks(directory: string, epicName: string): Promise<number> {
  const tasksDir = join(directory, ".epics", epicName, "tasks")

  if (!existsSync(tasksDir)) return 0

  try {
    const files = await readdir(tasksDir)
    const mdFiles = files.filter((f) => f.endsWith(".md"))

    let remaining = 0
    for (const file of mdFiles) {
      const content = await readFile(join(tasksDir, file), "utf-8")
      if (!content.includes("## Status: done") && !content.includes("## Status: blocked")) {
        remaining++
      }
    }
    return remaining
  } catch {
    return 0
  }
}

/**
 * Update the epic's .state file
 */
async function updateEpicState(
  directory: string,
  epicName: string,
  updates: Partial<EpicState>
): Promise<void> {
  const statePath = join(directory, ".epics", epicName, ".state")

  try {
    const content = await readFile(statePath, "utf-8")
    const state = JSON.parse(content) as EpicState

    const newState = { ...state, ...updates, lastUpdated: new Date().toISOString() }

    // Handle nested yolo updates
    if (updates.yolo && state.yolo) {
      newState.yolo = { ...state.yolo, ...updates.yolo }
    }

    await writeFile(statePath, JSON.stringify(newState, null, 2), "utf-8")
  } catch {
    // Ignore errors
  }
}

/**
 * Send a desktop notification (cross-platform)
 */
async function notify($: any, title: string, message: string): Promise<void> {
  try {
    // macOS
    await $`osascript -e 'display notification "${message}" with title "${title}"'`.quiet()
  } catch {
    try {
      // Linux
      await $`notify-send "${title}" "${message}"`.quiet()
    } catch {
      // Fallback: just log
      console.log(`[${title}] ${message}`)
    }
  }
}

/**
 * Get task statistics for an epic
 */
async function getTaskStats(
  directory: string,
  epicName: string
): Promise<{ total: number; done: number; inProgress: number; pending: number; blocked: number }> {
  const tasksDir = join(directory, ".epics", epicName, "tasks")

  if (!existsSync(tasksDir)) {
    return { total: 0, done: 0, inProgress: 0, pending: 0, blocked: 0 }
  }

  try {
    const files = await readdir(tasksDir)
    const mdFiles = files.filter((f) => f.endsWith(".md"))

    let done = 0
    let inProgress = 0
    let pending = 0
    let blocked = 0

    for (const file of mdFiles) {
      const content = await readFile(join(tasksDir, file), "utf-8")
      if (content.includes("## Status: done")) {
        done++
      } else if (content.includes("## Status: in-progress")) {
        inProgress++
      } else if (content.includes("## Status: blocked")) {
        blocked++
      } else {
        pending++
      }
    }

    return { total: mdFiles.length, done, inProgress, pending, blocked }
  } catch {
    return { total: 0, done: 0, inProgress: 0, pending: 0, blocked: 0 }
  }
}

/**
 * Parse dependencies from plan.md
 */
async function parseDependencies(
  directory: string,
  epicName: string
): Promise<Map<string, string[]>> {
  const planPath = join(directory, ".epics", epicName, "plan.md")
  const deps = new Map<string, string[]>()

  if (!existsSync(planPath)) return deps

  try {
    const content = await readFile(planPath, "utf-8")
    const depsMatch = content.match(/## Dependencies\n([\s\S]*?)(?=\n##|$)/)
    if (!depsMatch) return deps

    const lines = depsMatch[1].trim().split("\n")
    for (const line of lines) {
      const match = line.match(/^-\s*(\d+):\s*\[(.*)\]/)
      if (match) {
        const taskId = match[1]
        const depList = match[2]
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d.length > 0)
        deps.set(taskId, depList)
      }
    }
  } catch {
    // Ignore errors
  }

  return deps
}

// ============================================================================
// Plugin
// ============================================================================

export const EpicWorkflowPlugin: Plugin = async ({ directory, client, $ }) => {
  return {
    // ========================================================================
    // Custom Tools
    // ========================================================================
    tool: {
      // ----------------------------------------------------------------------
      // list_epics - Fast listing of all epics
      // ----------------------------------------------------------------------
      list_epics: tool({
        description: `List all epics and their current status.

Returns a list of all epics in .epics/ with their phase and task progress.
Much faster than manually reading files.`,
        args: {
          basePath: tool.schema.string().optional().describe("Base path if epics are in a subdirectory (e.g., 'weather-app'). Omit for project root."),
        },
        async execute(args) {
          const baseDir = args.basePath ? join(directory, args.basePath) : directory
          const epicsDir = join(baseDir, ".epics")

          if (!existsSync(epicsDir)) {
            return JSON.stringify({
              epics: [],
              message: "No epics found. Start one with `/epic <name>`",
            }, null, 2)
          }

          try {
            const entries = await readdir(epicsDir, { withFileTypes: true })
            const epics: Array<{
              name: string
              phase: string
              tasks: { done: number; total: number } | null
              yoloActive: boolean
            }> = []

            for (const entry of entries) {
              if (!entry.isDirectory()) continue

              const statePath = join(epicsDir, entry.name, ".state")
              let phase = "unknown"
              let yoloActive = false

              if (existsSync(statePath)) {
                try {
                  const content = await readFile(statePath, "utf-8")
                  const state = JSON.parse(content) as EpicState
                  phase = state.currentPhase || "unknown"
                  yoloActive = state.yolo?.active || false
                } catch {
                  phase = "unknown"
                }
              } else {
                // No state file - check what exists
                const hasSpec = existsSync(join(epicsDir, entry.name, "spec.md"))
                const hasResearch = existsSync(join(epicsDir, entry.name, "research.md"))
                const hasPlan = existsSync(join(epicsDir, entry.name, "plan.md"))
                const hasTasks = existsSync(join(epicsDir, entry.name, "tasks"))

                if (hasTasks) phase = "execute"
                else if (hasPlan) phase = "plan"
                else if (hasResearch) phase = "research"
                else if (hasSpec) phase = "spec"
                else phase = "new"
              }

              // Get task stats if in execute phase
              let tasks: { done: number; total: number } | null = null
              if (phase === "execute") {
                const stats = await getTaskStats(baseDir, entry.name)
                tasks = { done: stats.done, total: stats.total }
              }

              epics.push({ name: entry.name, phase, tasks, yoloActive })
            }

            return JSON.stringify({ epics }, null, 2)
          } catch (error) {
            return JSON.stringify({ epics: [], error: String(error) }, null, 2)
          }
        },
      }),

      // ----------------------------------------------------------------------
      // get_epic_status - Detailed status for one epic
      // ----------------------------------------------------------------------
      get_epic_status: tool({
        description: `Get detailed status for a specific epic.

Returns phase, artifacts, task breakdown, and available actions.
Much faster than manually reading multiple files.`,
        args: {
          epicName: tool.schema.string().describe("Name of the epic"),
          basePath: tool.schema.string().optional().describe("Base path if epic is in a subdirectory (e.g., 'weather-app'). Omit for project root."),
        },
        async execute(args) {
          const { epicName, basePath } = args
          const baseDir = basePath ? join(directory, basePath) : directory
          const epicDir = join(baseDir, ".epics", epicName)

          if (!existsSync(epicDir)) {
            return JSON.stringify({
              found: false,
              error: `Epic "${epicName}" not found. Start it with \`/epic ${epicName}\``,
            }, null, 2)
          }

          // Check which artifacts exist
          const artifacts = {
            spec: existsSync(join(epicDir, "spec.md")),
            research: existsSync(join(epicDir, "research.md")),
            plan: existsSync(join(epicDir, "plan.md")),
            tasks: existsSync(join(epicDir, "tasks")),
            state: existsSync(join(epicDir, ".state")),
          }

          // Read state
          let state: EpicState | null = null
          if (artifacts.state) {
            try {
              const content = await readFile(join(epicDir, ".state"), "utf-8")
              state = JSON.parse(content)
            } catch {
              state = null
            }
          }

          // Get task stats
          const taskStats = await getTaskStats(baseDir, epicName)

          // Determine current phase
          let currentPhase = state?.currentPhase || "unknown"
          if (currentPhase === "unknown") {
            if (artifacts.tasks) currentPhase = "execute"
            else if (artifacts.plan) currentPhase = "plan"
            else if (artifacts.research) currentPhase = "research"
            else if (artifacts.spec) currentPhase = "spec"
            else currentPhase = "new"
          }

          // Determine next action
          let nextAction = ""
          if (!artifacts.spec) {
            nextAction = `Create spec with \`/epic ${epicName} spec\``
          } else if (!artifacts.research) {
            nextAction = `Run \`/epic ${epicName}\` to start research`
          } else if (!artifacts.plan) {
            nextAction = `Run \`/epic ${epicName}\` to create plan`
          } else if (taskStats.pending > 0 || taskStats.inProgress > 0) {
            nextAction = `Run \`/epic ${epicName}\` to continue execution or \`/epic ${epicName} yolo\` for auto mode`
          } else if (taskStats.blocked > 0) {
            nextAction = `${taskStats.blocked} task(s) blocked - review and unblock`
          } else {
            nextAction = "Epic complete!"
          }

          return JSON.stringify({
            found: true,
            name: epicName,
            currentPhase,
            artifacts,
            tasks: taskStats,
            yolo: state?.yolo || null,
            lastUpdated: state?.lastUpdated || null,
            nextAction,
          }, null, 2)
        },
      }),

      // ----------------------------------------------------------------------
      // get_available_tasks - Tasks ready to execute
      // ----------------------------------------------------------------------
      get_available_tasks: tool({
        description: `Get tasks that are available to execute (dependencies satisfied).

Returns tasks that are pending/in-progress and have all dependencies completed.`,
        args: {
          epicName: tool.schema.string().describe("Name of the epic"),
          basePath: tool.schema.string().optional().describe("Base path if epic is in a subdirectory (e.g., 'weather-app'). Omit for project root."),
        },
        async execute(args) {
          const { epicName, basePath } = args
          const baseDir = basePath ? join(directory, basePath) : directory
          const epicDir = join(baseDir, ".epics", epicName)
          const tasksDir = join(epicDir, "tasks")

          if (!existsSync(tasksDir)) {
            return JSON.stringify({
              available: [],
              blocked: [],
              message: "No tasks directory found",
            }, null, 2)
          }

          // Get all task files
          const taskFiles = await getTaskFiles(baseDir, epicName)
          if (taskFiles.length === 0) {
            return JSON.stringify({
              available: [],
              blocked: [],
              message: "No task files found",
            }, null, 2)
          }

          // Parse dependencies
          const dependencies = await parseDependencies(baseDir, epicName)

          // Read task statuses
          const taskStatuses = new Map<string, string>()
          for (const file of taskFiles) {
            const taskId = file.match(/^(\d+)/)?.[1] || ""
            const content = await readFile(join(tasksDir, file), "utf-8")

            if (content.includes("## Status: done")) {
              taskStatuses.set(taskId, "done")
            } else if (content.includes("## Status: in-progress")) {
              taskStatuses.set(taskId, "in-progress")
            } else if (content.includes("## Status: blocked")) {
              taskStatuses.set(taskId, "blocked")
            } else {
              taskStatuses.set(taskId, "pending")
            }
          }

          // Determine which tasks are available
          const available: Array<{ taskId: string; file: string; status: string }> = []
          const blocked: Array<{ taskId: string; file: string; blockedBy: string[] }> = []

          for (const file of taskFiles) {
            const taskId = file.match(/^(\d+)/)?.[1] || ""
            const status = taskStatuses.get(taskId) || "pending"

            // Skip done or blocked tasks
            if (status === "done" || status === "blocked") continue

            // Check dependencies
            const deps = dependencies.get(taskId) || []
            const unmetDeps = deps.filter((depId) => taskStatuses.get(depId) !== "done")

            if (unmetDeps.length === 0) {
              available.push({ taskId, file, status })
            } else {
              blocked.push({ taskId, file, blockedBy: unmetDeps })
            }
          }

          return JSON.stringify({ available, blocked }, null, 2)
        },
      }),

      // ----------------------------------------------------------------------
      // build_task_context - Build context for task execution
      // ----------------------------------------------------------------------
      build_task_context: tool({
        description: `Build the full context for executing an epic task.

This tool reads the epic's spec, research, plan, and all previous completed tasks,
then returns a complete prompt that should be passed to the Task tool to execute
the task with a fresh sub-agent.

Use this before calling the Task tool for each task execution.`,
        args: {
          epicName: tool.schema.string().describe("Name of the epic (the folder name under .epics/)"),
          taskId: tool.schema
            .string()
            .describe("Task ID - the number prefix like '01', '02', etc."),
          basePath: tool.schema.string().optional().describe("Base path if epic is in a subdirectory (e.g., 'weather-app'). Omit for project root."),
        },
        async execute(args) {
          const { epicName, taskId, basePath } = args
          const baseDir = basePath ? join(directory, basePath) : directory
          const epicDir = join(baseDir, ".epics", epicName)
          const tasksDir = join(epicDir, "tasks")

          // Verify epic exists
          if (!existsSync(epicDir)) {
            return JSON.stringify({
              success: false,
              error: `Epic "${epicName}" not found at ${epicDir}`,
            }, null, 2)
          }

          // Read context files
          const spec = await readFileIfExists(join(epicDir, "spec.md"))
          const research = await readFileIfExists(join(epicDir, "research.md"))
          const plan = await readFileIfExists(join(epicDir, "plan.md"))

          if (!spec) {
            return JSON.stringify({
              success: false,
              error: `No spec.md found for epic "${epicName}"`,
            }, null, 2)
          }

          // Find the task file
          const taskFiles = await getTaskFiles(baseDir, epicName)
          const taskFile = taskFiles.find((f) => f.startsWith(taskId))

          if (!taskFile) {
            return JSON.stringify({
              success: false,
              error: `Task "${taskId}" not found in ${tasksDir}`,
            }, null, 2)
          }

          const taskPath = join(tasksDir, taskFile)
          const taskContent = await readFile(taskPath, "utf-8")

          // Check if task is already done
          if (taskContent.includes("## Status: done")) {
            return JSON.stringify({
              success: true,
              alreadyDone: true,
              message: `Task ${taskId} is already complete`,
            }, null, 2)
          }

          // Read all previous task files (for context)
          const previousTasks: string[] = []
          for (const file of taskFiles) {
            const fileTaskId = file.match(/^(\d+)/)?.[1] || ""
            if (fileTaskId >= taskId) break // Stop at current task

            const content = await readFile(join(tasksDir, file), "utf-8")
            previousTasks.push(`### ${file}\n\n${content}`)
          }

          // Build the sub-agent prompt
          const prompt = `# Execute Epic Task

You are executing task ${taskId} of epic "${epicName}".

## Your Mission

Execute the task described below. When complete:
1. Update the task file's status from "pending" or "in-progress" to "done"
2. Add a "## Report" section at the end of the task file with:
   - **What Was Done**: List the changes you made
   - **Decisions Made**: Any choices you made and why
   - **Issues / Notes for Next Task**: Anything the next task should know
   - **Files Changed**: List of files created/modified

If you discover the task approach is wrong or future tasks need changes, you may update them.
The plan is a living document.

---

## Epic Spec

${spec}

---

## Research

${research || "(No research conducted yet)"}

---

## Plan

${plan || "(No plan created yet)"}

---

## Previous Completed Tasks

${previousTasks.length > 0 ? previousTasks.join("\n\n---\n\n") : "(This is the first task)"}

---

## Current Task to Execute

**File: .epics/${epicName}/tasks/${taskFile}**

${taskContent}

---

## Instructions

1. Read and understand the task
2. Execute the steps described
3. Verify the "Done When" criteria are met
4. Update the task file:
   - Change \`## Status: pending\` or \`## Status: in-progress\` to \`## Status: done\`
   - Add a \`## Report\` section at the end
5. If you need to modify future tasks or the plan, do so
6. When complete, confirm what was done
`

          await client.app.log({
            service: "epic-plugin",
            level: "info",
            message: `Built context for task ${taskId} of epic "${epicName}" (${previousTasks.length} previous tasks)`,
          })

          return JSON.stringify({
            success: true,
            taskFile,
            taskPath,
            prompt,
            message: `Context built for task ${taskId}. Pass the 'prompt' field to the Task tool to execute with a sub-agent.`,
          }, null, 2)
        },
      }),
    },

    // ========================================================================
    // Event Handler: Yolo Mode Auto-Continue
    // ========================================================================
    event: async ({ event }) => {
      if (event.type !== "session.idle") return

      const sessionId = (event as any).properties?.sessionID

      // Find active yolo epic
      const activeEpic = await findActiveYoloEpic(directory)
      if (!activeEpic) return

      const { name: epicName, state } = activeEpic
      const yolo = state.yolo!

      // Check remaining tasks
      const remaining = await countRemainingTasks(directory, epicName)

      // Log progress
      await client.app.log({
        service: "epic-plugin",
        level: "info",
        message: `Epic "${epicName}" yolo check: ${remaining} tasks remaining, iteration ${yolo.iteration}/${yolo.maxIterations || "unlimited"}`,
      })

      // Check if complete
      if (remaining === 0) {
        await updateEpicState(directory, epicName, {
          executeComplete: true,
          yolo: { ...yolo, active: false },
        })

        await notify($, "Epic Complete", `Epic "${epicName}" finished successfully!`)

        await client.app.log({
          service: "epic-plugin",
          level: "info",
          message: `Epic "${epicName}" completed! All tasks done.`,
        })

        return
      }

      // Check max iterations
      if (yolo.maxIterations > 0 && yolo.iteration >= yolo.maxIterations) {
        await updateEpicState(directory, epicName, {
          yolo: { ...yolo, active: false },
        })

        await notify(
          $,
          "Epic Stopped",
          `Epic "${epicName}" hit max iterations (${yolo.maxIterations})`
        )

        await client.app.log({
          service: "epic-plugin",
          level: "warn",
          message: `Epic "${epicName}" stopped: max iterations (${yolo.maxIterations}) reached with ${remaining} tasks remaining`,
        })

        return
      }

      // Continue the epic
      const nextIteration = yolo.iteration + 1
      await updateEpicState(directory, epicName, {
        yolo: { ...yolo, iteration: nextIteration },
      })

      // Send continuation prompt
      if (sessionId) {
        await client.session.send({
          id: sessionId,
          text: `Continue executing epic "${epicName}". ${remaining} task(s) remaining. [Iteration ${nextIteration}${yolo.maxIterations > 0 ? `/${yolo.maxIterations}` : ""}]`,
        })

        await client.app.log({
          service: "epic-plugin",
          level: "info",
          message: `Epic "${epicName}" continuing: iteration ${nextIteration}, ${remaining} tasks remaining`,
        })
      }
    },
  }
}
