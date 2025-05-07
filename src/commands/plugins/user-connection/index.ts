import { AppPlugin, ContextGenerator, Tool } from "app";
import { Schema, TypeOfSchema } from "schema";
import md from "utils/md";
import TelegramBot, { Update } from "node-telegram-bot-api";
import { countUnreadMessages, readLatestMessages, waitForNewMessages } from "utils/tg";
import { TOOL_READ_NEW_MESSAGES } from "./tool-read-new-messages";
import { TOOL_SEND_MESSAGE } from "./tool-send-message";
import { CONTEXT_GENERATOR_UNREAD_MESSAGES } from "./context-generator";
import { getState, STATE_USER_CONNECTION, UserConnectionState } from "./state";

export const PLUGIN_USER_CONNECTION = {
    name: "user_connection",
    configDeps: {
        tgBotToken: { type: "string" },
        tgChatId: { type: "number" },
    },
    tools: [TOOL_READ_NEW_MESSAGES, TOOL_SEND_MESSAGE],
    contextGenerators: [CONTEXT_GENERATOR_UNREAD_MESSAGES],
    listeners: {
        onInit: async (config, state) => {
            const bot = new TelegramBot(config.tgBotToken, { polling: false });
            state[STATE_USER_CONNECTION] = {
                bot,
                lastUpdate: 0,
            } satisfies UserConnectionState;
        },
        onMessage: async (app, message) => {
            const state = getState(app.state);
            const chatId = app.config.tgChatId;
            await state.bot.sendMessage(chatId, `[MESSAGE]\n${message}`);
        },
    },
} as const satisfies AppPlugin;
