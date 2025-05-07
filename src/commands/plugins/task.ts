import { AppPlugin, ContextGenerator, Tool } from "app";
import { Schema, TypeOfSchema } from "schema";
import { ToolUse } from "tool-use";
import md from "utils/md";


type HistoryToolUseEntry = {
    type: "tool_use",
    toolUse: ToolUse,
    result: string,
};

type HistoryMessageEntry = {
    type: "message",
    message: string,
};

type HistoryEntry = (HistoryToolUseEntry | HistoryMessageEntry) & {
    iteration: number,
};



type Task = {
    /**
     * Task system prompt.
     */
    systemPrompt: string,
    history: HistoryEntry[],
};

type TaskState = {
    taskStack: Task[],
};

const STATE_TASK = "task";
const getState = (state: Record<string, unknown>): TaskState => {
    if (!state[STATE_TASK]) {
        throw new Error(`State ${STATE_TASK} not found`);
    }
    return state[STATE_TASK] as TaskState;
};

const getCurrentTask = (state: Record<string, unknown>): Task => {
    const task = getState(state).taskStack.at(-1);
    if (!task) {
        throw new Error("No task in progress");
    }
    return task;
};

const displayHistoryEntry = (entry: HistoryEntry): string => {
    if (entry.type === "message") {
        return md.create(
            entry.message
        );
    }

    return md.create(
        md.details(
            `Use tool "${entry.toolUse.key}" with args`,
            md.jsonBlock(entry.toolUse.args),
        ),
        md.bold("Result:"),
        entry.result
    );
};


const CONTEXT_GENERATOR_HISTORY = {
    generateContextPart: async (app) => {
        const task = getState(app.state).taskStack.at(-1);

        if (!task) {
            throw new Error("No task in progress");
        }

        return md.create(
            md.header(1, "System instructions"),
            task.systemPrompt,
            md.header(1, "Current task progress"),
            md.ul(...task.history.map(displayHistoryEntry)),
        );
    },
} as const satisfies ContextGenerator;


const SCHEMA_COMPLETE_TASK = {
    type: "object",
    properties: {
        result: {
            type: "string",
            description: "Describe the result of the task.",
        },
    },
    additionalProperties: false,
    required: ["result"],
} as const satisfies Schema;
type CompleteTaskArgs = TypeOfSchema<typeof SCHEMA_COMPLETE_TASK>;

const TOOL_COMPLETE_TASK = {
    key: "complete_task",
    description: "Mark current task as completed.",
    schema: SCHEMA_COMPLETE_TASK,
    isAvailable: (app) => getState(app.state).taskStack.length > 1,
    handle: async (app, args: CompleteTaskArgs) => {
        const state = getState(app.state);

        const task = state.taskStack.pop();
        if (!task || state.taskStack.length === 0) {
            // Last task is already completed, we can exit.
            app.exitReason = args.result;

            return md.textBlock("Exiting...");
        }

        return md.details("Task completed", md.textBlock(args.result));
    },
} as const satisfies Tool;

export const PLUGIN_TASK = {
    name: "task",
    contextGenerators: [
        CONTEXT_GENERATOR_HISTORY,
    ],
    tools: [
        TOOL_COMPLETE_TASK,
    ],
    listeners: {
        onInit: (config, state) => {
            (state[STATE_TASK] as TaskState) = {
                taskStack: [
                    {
                        systemPrompt: config.systemPrompt,
                        history: [],
                    },
                ],
            };
        },
        onMessage: (app, message) => {
            const task = getCurrentTask(app.state);

            task.history.push({
                type: "message",
                message,
                iteration: app.iteration,
            });
        },
        onToolUseComplete: (app, toolUse, result) => {
            const task = getCurrentTask(app.state);

            task.history.push({
                type: "tool_use",
                toolUse,
                result,
                iteration: app.iteration,
            });
        },
    }
} as const satisfies AppPlugin;
