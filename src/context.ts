import { Command } from "commands/commands";
import { AppConfig } from "config";
import OpenAI from "openai";
import mineflayer from "mineflayer";
import { BotState, connectBot } from "bot/connect";

export type TaskHistoryEntry = {
    /**
     * Bot reasoning for the command
     */
    reasoning?: string,
    /**
     * Command that was executed
     */
    command?: Command,
    /**
     * represents any events happening in the world since the last command
     */
    worldEvents?: string,
    /**
     * Describes current state of the game (e.g. items in the inventory, stats, nearby entities, etc.)
     */
    inGameState?: string,
};

export type AppContext = {
    // immutable values loaded on app start
    config: AppConfig,
    // various API providers
    providers: AppProviders,
    // mutable state of the app
    state: AppState,
};

export type AppProviders = {
    aiProviders: Record<string, OpenAI>,
    bot: mineflayer.Bot;
}

export type AppState = {
    bot: BotState,
    taskHistory: TaskHistoryEntry[],
    iteration: number,
}

export const createAppContext = async (config: AppConfig): Promise<AppContext> => {
    const { bot, botState } = await connectBot(config);

    const aiProviders = Object.fromEntries(
        config.modelsConfig.providers.map((provider) => {
            const llmClient = new OpenAI({
                apiKey: provider.key,
                baseURL: provider.endpoint,
            });
            return [provider.name, llmClient];
        }),
    );

    return {
        config,
        providers: {
            aiProviders,
            bot,
        },
        state: {
            bot: botState,
            taskHistory: [],
            iteration: 0,
        }
    } satisfies AppContext;
};
