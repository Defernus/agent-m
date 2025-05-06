import { loadEnvNumberOr, loadEnvString, loadEnvStringOr } from "utils/env";
import toml from "toml";
import { Schema, TypeOfSchema, validateBySchema, validateBySchemaUntyped } from "schema";
import OpenAI from "openai";
import Dockerode from "dockerode";
import fs from "fs/promises";

export type AppConfig = {
    modelsPath: string,
    modelsConfig: ModelsConfig,
    models: Record<string, ModelInfo>,

    mainModel: string,

    systemPrompt: string,

    iterationDelayMs: number,

    aiProviders: Record<string, OpenAI>,

    containerName: string,

    dockerSocket: string,

    docker: Dockerode,

    pathToLogs: string,
};

export type ModelInfo = {
    modelName: string,
    provider: string,
};


export const loadAppConfig = async (): Promise<AppConfig> => {
    const modelsPath = loadEnvStringOr("MODELS_PATH", "models.toml");

    const rawModelsConfig = await fs.readFile(modelsPath, "utf-8");
    const modelsConfig: ModelsConfig = validateBySchema(toml.parse(rawModelsConfig), MODELS_CONFIG_SCHEMA);

    const models = Object.fromEntries(
        modelsConfig.models.map((model) => [model.name, {
            modelName: model.model,
            provider: model.provider,
        }]),
    );

    const aiProviders = Object.fromEntries(
        modelsConfig.providers.map((provider) => {
            const llmClient = new OpenAI({
                apiKey: provider.key,
                baseURL: provider.endpoint,
            });
            return [provider.name, llmClient];
        }),
    );

    const dockerSocket = loadEnvStringOr("DOCKER_SOCKET", "/var/run/docker.sock");

    try {
        await fs.access(dockerSocket, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
        throw new Error(`Docker socket is not accessible: ${dockerSocket}`);
    }

    const docker = new Dockerode({
        socketPath: dockerSocket,

    });

    return {
        modelsPath,
        modelsConfig,
        models,
        mainModel: loadEnvString("MAIN_MODEL"),
        systemPrompt: loadEnvString("SYSTEM_PROMPT"),
        iterationDelayMs: loadEnvNumberOr("ITERATION_DELAY", 0),
        aiProviders,
        containerName: loadEnvStringOr("CONTAINER_NAME", "agent"),
        pathToLogs: loadEnvStringOr("PATH_TO_LOGS", "logs"),
        dockerSocket,
        docker,
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

export const checkConfigDeps = (config: AppConfig, deps: Record<string, Schema>) => {
    for (const [key, schema] of Object.entries(deps)) {
        const value = (config as Record<string, unknown>)[key];
        try {
            validateBySchemaUntyped(value, schema);
        } catch (error) {
            throw new Error(`Config dependency "${key}" does not match schema: ${error}`);
        }
    }
};
