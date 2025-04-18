import { loadEnvNumberOr, loadEnvString, loadEnvStringOr } from "utils/env";
import fs from "fs";
import toml from "toml";
import { Schema, TypeOfSchema, validateBySchema } from "schema";

export type AppConfig = {
    modelsPath: string;
    modelsConfig: ModelsConfig;
    models: Record<string, ModelInfo>,

    mainModel: string;

    systemPrompt: string;

    maxTaskHistory: number;

    iterationDelayMs: number;

    mcServerPort: number;
    mcServerHost: string;
    mcBotUsername: string;
};

export type ModelInfo = {
    modelName: string,
    provider: string,
};


const DEFAULT_SYSTEM_PROMPT = `
You are a Minecraft player.
Reflect on your actions and the world around you.
Do not make things up, use only the information you provided in the history.
You do not have any visual input, only text. But you can use commands to interact and explore the world.
Use your knowledge of Minecraft to reason about the next action to take.

The bad thing is you don't have any useful commands yet, ask me and i will add them for you (you already can use chat).

After reasoning call one of the provided functions.
`.trim();

export const loadAppConfig = (): AppConfig => {
    const modelsPath = loadEnvStringOr("MODELS_PATH", "models.toml");

    const rawModelsConfig = fs.readFileSync(modelsPath, "utf-8");
    const modelsConfig: ModelsConfig = validateBySchema(toml.parse(rawModelsConfig), MODELS_CONFIG_SCHEMA);

    const models = Object.fromEntries(
        modelsConfig.models.map((model) => [model.name, {
            modelName: model.model,
            provider: model.provider,
        }]),
    );

    return {
        modelsPath,
        modelsConfig,
        models,
        mainModel: loadEnvString("MAIN_MODEL"),
        systemPrompt: loadEnvStringOr("SYSTEM_PROMPT", DEFAULT_SYSTEM_PROMPT),
        maxTaskHistory: loadEnvNumberOr("MAX_TASK_HISTORY", 1000),
        iterationDelayMs: loadEnvNumberOr("ITERATION_DELAY", 0),
        mcServerPort: loadEnvNumberOr("MC_SERVER_PORT", 25565),
        mcServerHost: loadEnvStringOr("MC_SERVER_HOST", "127.0.0.1"),
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