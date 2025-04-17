import { Command } from "commands/commands";
import { AppConfig } from "config";
import OpenAI from "openai";
import mineflayer from "mineflayer";
import { BotState, connectBot } from "bot/connect";

export type TaskHistoryEntry = {
    /**
     * represents any events happening in the world since the last command
     */
    worldEvents: string,
    /**
     * Bot reasoning for the command
     */
    reasoning?: string,
    /**
     * Command that was executed
     */
    command?: Command,
    /**
     * Describes current state of the game (e.g. items in the inventory, stats, nearby entities, etc.)
     */
    inGameState: string,
};

export type AppContext = {
    config: AppConfig,
    aiProviders: Record<string, OpenAI>,
    models: Record<string, ModelInfo>,
    bot: BotState,
    taskHistory: TaskHistoryEntry[],
    iteration: number,
};

export type ModelInfo = {
    modelName: string,
    provider: string,
};

export const createAppContext = async (config: AppConfig): Promise<AppContext> => {
    const bot = await connectBot(config);

    const aiProviders = Object.fromEntries(
        config.modelsConfig.providers.map((provider) => {
            const llmClient = new OpenAI({
                apiKey: provider.key,
                baseURL: provider.endpoint,
            });
            return [provider.name, llmClient];
        }),
    );

    const models = Object.fromEntries(
        config.modelsConfig.models.map((model) => [model.name, {
            modelName: model.model,
            provider: model.provider,
        }]),
    );

    return {
        config,
        aiProviders,
        models,
        bot,
        taskHistory: [],
        iteration: 0,
    }
};
