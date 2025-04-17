import { AppConfig } from "config";
import mineflayer from "mineflayer";
import { logDebug } from "utils/logger";
import mcData from "minecraft-data";
import { pathfinder } from "mineflayer-pathfinder";

export type WorldEvent = {
    type: string;
    content: string;
};

export type BotState = {
    disconnectReason?: string;
    unhandledWorldEvents: WorldEvent[];
    bot: mineflayer.Bot;
    mcData: mcData.IndexedData;
};


export const connectBot = async (config: AppConfig): Promise<BotState> => {
    const bot = mineflayer.createBot({
        host: config.mcServerHost,
        port: config.mcServerPort,
        username: config.mcBotUsername,
        auth: "offline",
    });
    bot.loadPlugin(pathfinder);

    logDebug(`[BOT] Connecting to ${config.mcServerHost}:${config.mcServerPort} as ${config.mcBotUsername}`);
    await new Promise<void>((resolve, reject) => {
        bot.once("spawn", () => {
            logDebug(`[BOT] "spawn" event`);
            resolve();
        });
        bot.once("error", (err) => {
            logDebug(`[BOT] "error" event on connection: ${err}`);
            reject(err);
        });
        bot.once("kicked", (reason, loggedIn) => {
            logDebug(`[BOT] "kicked" event on connection. Reason: ${reason}, Logged in: ${loggedIn}`);
            reject(new Error(`kicked: ${reason}`));
        });
    });

    const currentMcData = mcData(bot.version);

    logDebug("[BOT] Connected.");

    const state: BotState = {
        disconnectReason: undefined,
        unhandledWorldEvents: [],
        bot,
        mcData: currentMcData,
    };

    const onError = (err: any) => {
        logDebug(`[BOT] "error" event: ${err}`);
        state.unhandledWorldEvents.push({
            type: "error",
            content: `Error: ${err}`,
        });
    };
    bot.on("error", onError);

    const onChat = (
        username: string,
        message: string,
        _translate: unknown,
        _jsonMsg: unknown,
        _matches: unknown,
    ) => {
        const content = `<${username}> ${message}`;
        logDebug(`[BOT]: "message" event: ${content}`);
        state.unhandledWorldEvents?.push({
            type: "chat",
            content,
        });
    };
    bot.on("chat", onChat);

    const unsubscribe = () => {
        bot.off("error", onError);
        bot.off("chat", onChat);
    };

    bot.once("kicked", (reason: any, loggedIn: boolean) => {
        logDebug(`[BOT] "kicked" event. Reason: ${reason}, Logged in: ${loggedIn}`);
        state.disconnectReason = `kicked: ${reason}`;

        unsubscribe();
    });

    bot.once("end", (reason) => {
        logDebug(`[BOT] "ent" event. Reason: ${reason}`);
        state.disconnectReason = `end: ${reason}`;

        unsubscribe();
    });

    return state;
};
