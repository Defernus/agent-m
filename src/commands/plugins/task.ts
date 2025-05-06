import { AppPlugin, Tool } from "app";
import { Schema, TypeOfSchema } from "schema";
import md from "utils/md";

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
    description: "Mark current task as completed and stop the agent.",
    schema: SCHEMA_COMPLETE_TASK,
    handle: async (app, args: CompleteTaskArgs) => {
        app.exitReason = args.result;

        return md.textBlock("Exiting...");
    }
} as const satisfies Tool;

export const PLUGIN_TASK = {
    name: "task",
    tools: [
        TOOL_COMPLETE_TASK,
    ],
} as const satisfies AppPlugin;
