import { loadEnvNumberOr, loadEnvString, loadEnvStringOr } from "utils/env";
import fs from "fs";
import toml from "toml";
import { Schema, TypeOfSchema, validateSchema } from "schema";

export type AppConfig = {
    modelsPath: string;
    modelsConfig: ModelsConfig;

    mainModel: string;

    systemPromptReasoning: string;
    systemPromptCommandGeneration: string;

    maxTaskHistory: number;

    iterationDelayMs: number;

    mcServerPort: number;
    mcServerHost: string;
    mcBotUsername: string;
};


const DEFAULT_SYSTEM_PROMPT_REASONING = `
You are a Minecraft player.
Reflect on your actions and the world around you.
Do not make things up, use only the information you provided in the history.
Use your knowledge of Minecraft to reason about the next action to take.
`.trim();

const DEFAULT_SYSTEM_PROMPT_COMMAND_GENERATION = `
Use one of provided function. DO NOT GENERATE ANY RESPONSE, only return the function call.
Any text outside of the function call will be sent to chat.
`.trim();

export const loadAppConfig = (): AppConfig => {
    const modelsPath = loadEnvStringOr("MODELS_PATH", "models.toml");

    const rawModelsConfig = fs.readFileSync(modelsPath, "utf-8");
    const modelsConfig = validateSchema(toml.parse(rawModelsConfig), MODELS_CONFIG_SCHEMA);

    return {
        modelsPath,
        modelsConfig,
        mainModel: loadEnvString("MAIN_MODEL"),
        systemPromptReasoning: loadEnvStringOr("SYSTEM_PROMPT_REASONING", DEFAULT_SYSTEM_PROMPT_REASONING),
        systemPromptCommandGeneration: loadEnvStringOr("SYSTEM_PROMPT_COMMAND_GENERATION", DEFAULT_SYSTEM_PROMPT_COMMAND_GENERATION),
        maxTaskHistory: loadEnvNumberOr("MAX_TASK_HISTORY", 1000),
        iterationDelayMs: loadEnvNumberOr("ITERATION_DELAY", 5000),
        mcServerPort: loadEnvNumberOr("MC_SERVER_PORT", 25565),
        mcServerHost: loadEnvStringOr("MC_SERVER_HOST", "localhost"),
        mcBotUsername: loadEnvStringOr("MC_BOT_USERNAME", "Bot"),
    }
};

type ModelsConfig = TypeOfSchema<typeof MODELS_CONFIG_SCHEMA>;
const MODELS_CONFIG_SCHEMA = {
    type: "object",
    properties: {
        providers: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    key: { type: "string" },
                    endpoint: { type: "string" },
                },
                required: ["name", "key", "endpoint"],
                additionalProperties: false,
            },
        },
        models: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    provider: { type: "string" },
                    model: { type: "string" },
                },
                required: ["name", "provider", "model"],
                additionalProperties: false,
            },
        },
    },
    required: ["providers", "models"],
    additionalProperties: false,
} satisfies Schema;