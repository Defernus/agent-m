import { Tool } from "app";
import md from "utils/md";
import { waitForNewMessages } from "utils/tg";
import { getState } from "./state";
import { Schema, TypeOfSchema } from "schema";
import { Update } from "node-telegram-bot-api";

const displayUpdate = (update: Update): string => {
    if (update.message) {
        return md.create(
            md.bold(update.message.from?.username ?? "No username"),
            update.message?.text ?? "No text",
        );
    }

    return "Unknown update type";
};

const SCHEMA_SEND_MESSAGE = {
    type: "object",
    properties: {
        text: { type: "string" },
        waitForResponse: {
            type: "boolean",
            description: "Whether to wait for a user response"
        }
    },
    additionalProperties: false,
    required: ["text", "waitForResponse"]
} as const satisfies Schema;
type SendMessageArgs = TypeOfSchema<typeof SCHEMA_SEND_MESSAGE>;

export const TOOL_SEND_MESSAGE = {
    key: "send_message",
    description: "Send a message to the user via Telegram, optionally waiting for a response.",
    schema: SCHEMA_SEND_MESSAGE,
    handle: async (app, args: SendMessageArgs) => {
        const state = getState(app.state);

        await state.bot.sendMessage(app.config.tgChatId, args.text);
        if (!args.waitForResponse) {
            return md.textBlock("Message sent");
        }

        const { messages, lastUpdate } = await waitForNewMessages(
            state.bot,
            app.config.tgChatId,
            state.lastUpdate,
        );

        if (lastUpdate !== state.lastUpdate) {
            state.lastUpdate = lastUpdate;
        }

        if (messages.length === 0) {
            return md.textBlock("Waiting for response timed out, no new messages received");
        }

        return md.details(
            "New Messages",
            md.ul(...messages.map(displayUpdate)),
        );
    }
} as const satisfies Tool;
