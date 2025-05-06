import { AppPlugin, ContextGenerator } from "app";
import { ToolUse } from "tool-use";
import md from "utils/md";


export type HistoryToolUseEntry = {
    type: "tool_use",
    toolUse: ToolUse,
    result: string,
};

export type HistoryMessageEntry = {
    type: "message",
    message: string,
};

export type HistoryEntry = (HistoryToolUseEntry | HistoryMessageEntry) & {
    iteration: number,
};


export const STATE_HISTORY = "HISTORY";
export type StateHistory = HistoryEntry[]

const CONTEXT_GENERATOR_HISTORY = {
    generateContextPart: async (app) => {
        const history = (app.state[STATE_HISTORY] as StateHistory).map((entry) => {
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
        });
        return md.create(
            md.header(1, "History"),
            md.ul(...history)
        );
    },
} as const satisfies ContextGenerator;

export const PLUGIN_HISTORY = {
    name: "history",
    contextGenerators: [
        CONTEXT_GENERATOR_HISTORY,
    ],
    listeners: {
        onInit: async (_config, state) => {
            (state[STATE_HISTORY] as StateHistory) = [];
        },
        onMessage: async (app, message) => {
            const history = app.state[STATE_HISTORY] as StateHistory;
            history.push({
                type: "message",
                message,
                iteration: app.iteration,
            });
        },
        onToolUseComplete: async (app, toolUse, result) => {
            const history = app.state[STATE_HISTORY] as StateHistory;
            history.push({
                type: "tool_use",
                toolUse,
                result,
                iteration: app.iteration,
            });
        },
    },
} as const satisfies AppPlugin;
