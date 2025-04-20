import { AppContext } from "context";
import { Schema, validateBySchema } from "schema";

import fs from "fs";
import path from "path";
import { COMMAND_CRAFT } from "./handlers/craft";
import { COMMAND_CHAT } from "./handlers/chat";
import { COMMAND_GO_TO_CORD } from "./handlers/go-to-cord";
import { COMMAND_WAIT } from "./handlers/wait";

export type CommandInfo = {
    key: string;
    schema: Schema,
    description: string;
    handler: (ctx: AppContext, args: any) => Promise<void>;
}

export const COMMAND_LIST = [
    COMMAND_CRAFT,
    COMMAND_CHAT,
    COMMAND_GO_TO_CORD,
    COMMAND_WAIT,
];


export type Command = {
    key: string;
    args: unknown;
};

export const handleCommand = async (ctx: AppContext, command: Command): Promise<void> => {
    const commandInfo = COMMAND_LIST.find(({ key }) => key == command.key);
    if (!commandInfo) {
        throw new Error(`Command handler not found for key: ${command.key}`);
    }

    validateBySchema(command.args, commandInfo.schema);

    // TODO get rid of `as any`
    await commandInfo.handler(ctx, command.args as any);
};
