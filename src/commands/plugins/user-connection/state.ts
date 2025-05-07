import TelegramBot from "node-telegram-bot-api";

export const STATE_USER_CONNECTION = "USER_CONNECTION";
export type UserConnectionState = {
    bot: TelegramBot;
    lastUpdate: number;
};

export const getState = (state: Record<string, unknown>): UserConnectionState => {
    if (!state[STATE_USER_CONNECTION]) {
        throw new Error(`State ${STATE_USER_CONNECTION} not found`);
    }
    return state[STATE_USER_CONNECTION] as UserConnectionState;
};
