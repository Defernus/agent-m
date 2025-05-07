import TelegramBot, { Update } from "node-telegram-bot-api";
import { sleep } from "openai/core";

export const readLatestMessages = async (
    bot: TelegramBot,
    chatId: number,
    lastUpdate: number,
): Promise<{ messages: TelegramBot.Update[], lastUpdate: number }> => {
    let updates: Update[] = [];
    try {
        updates = await bot.getUpdates({ offset: lastUpdate + 1 });
    } catch (error) {
        throw new Error(`Failed to get updates to read messages: ${error}`);
    }

    const messages = updates.filter(
        (u) => u.message?.chat?.id === chatId,
    );

    if (messages.length === 0) {
        return { messages: [], lastUpdate };
    }

    const maxId = Math.max(...updates.map((u) => u.update_id));
    return { messages, lastUpdate: maxId };
};

export const countUnreadMessages = async (
    bot: TelegramBot,
    chatId: number,
    lastUpdate: number,
): Promise<number> => {
    let updates: Update[] = [];

    try {
        updates = await bot.getUpdates({ offset: lastUpdate + 1 });
    } catch (error) {
        throw new Error(`Failed to get updates to count messages: ${error}`);
    }

    const messages = updates.filter((u) => u.message?.chat?.id === chatId);

    return messages.length;
}

export const waitForNewMessages = async (
    bot: TelegramBot,
    chatId: number,
    lastUpdate: number,
    maxAttempts: number = 0,
    attemptDelayMs: number = 1000,
): Promise<{ messages: Update[], lastUpdate: number }> => {
    let attempts = 0;

    while (maxAttempts == 0 || attempts < maxAttempts) {
        const result = await readLatestMessages(bot, chatId, lastUpdate);
        if (result.messages.length > 0) {
            return result;
        }

        attempts++;
        await sleep(attemptDelayMs);
    }

    return { messages: [], lastUpdate };
}