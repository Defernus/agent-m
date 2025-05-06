import { AppConfig } from "config";
import { Schema } from "schema";
import { ToolUse } from "tool-use";

export type OnInit = (config: AppConfig, state: Record<string, unknown>) => Promise<void>;
export type OnToolUseComplete = (app: App, toolUse: ToolUse, result: string) => Promise<void>;
export type OnMessage = (app: App, reasoning: string) => Promise<void>;
export type OnReasoning = (app: App) => Promise<void>;
export type OnContextGenerated = (app: App, context: string) => Promise<void>;
export type OnIterationEnd = (app: App) => Promise<void>;

export type App = {
    config: AppConfig,

    contextGenerators: ContextGenerator[],

    listeners: {
        onToolUseComplete: OnToolUseComplete[],
        onMessage: OnMessage[],
        onReasoning: OnReasoning[],
        onContextGenerated: OnContextGenerated[],
        onIterationEnd: OnIterationEnd[],
    },

    tools: Record<string, Tool>,

    state: Record<string, unknown>,

    iteration: number,
    startTime: number,

    /**
     * The app will exit in next iteration if this is set to a non-null value.
     */
    exitReason: string | null,
};

export type ContextGenerator = {
    generateContextPart: (app: App) => Promise<string>,
};

export type Tool = {
    key: string,
    description: string,
    schema: Schema,
    handle: (app: App, args: any) => Promise<string>,
};

export type AppPlugin = {
    name: string,
    configDeps?: Record<string, Schema>,
    tools?: Tool[],
    contextGenerators?: ContextGenerator[],

    listeners?: {
        onInit?: OnInit,
        onToolUseComplete?: OnToolUseComplete,
        onMessage?: OnMessage,
        onReasoning?: OnReasoning,
        onContextGenerated?: OnContextGenerated,
        onIterationEnd?: OnIterationEnd,
    }
};
