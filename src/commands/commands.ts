import { AppContext } from "context";
import { Schema, TypeOfSchema } from "schema";
import { logDebug } from "utils/logger";

import fs from "fs";
import path from "path";

export type CommandInfo = {
    key: string;
    schema: Schema,
    description: string;
    handler: (ctx: AppContext, args: any) => Promise<void>;
}

export const COMMAND_LIST: CommandInfo[] = [];

const COMMANDS_LOCATION = path.join(__dirname, "handlers");
for (const file of fs.readdirSync(COMMANDS_LOCATION)) {
    if (file.endsWith(".ts")) {
        const command = require(`commands/handlers/${file}`).default;
        COMMAND_LIST.push(command);
    }
}

export const COMMAND_BY_KEY: Record<string, CommandInfo> = Object.fromEntries(
    COMMAND_LIST.map((command) => [command.key, command])
);


export type Command = {
    key: string;
    args: unknown;
};

export const handleCommand = async (ctx: AppContext, command: Command): Promise<void> => {
    const commandInfo = COMMAND_BY_KEY[command.key];
    if (!commandInfo) {
        throw new Error(`Command handler not found for key: ${command.key}`);
    }

    logDebug(`[COMMAND]\n${JSON.stringify(command.args, null, 2)}`);

    await commandInfo.handler(ctx, command.args as unknown as any);
};
