import { Tool } from "app";
import { Schema, TypeOfSchema } from "schema";
import md from "utils/md";
import { getState } from "./state";
import { readLatestMessages } from "utils/tg";

const SCHEMA_READ_NEW_MESSAGES = {
    type: "object",
    properties: {},
    additionalProperties: false,
    required: []
} as const satisfies Schema;
type OpenReadNewMessages = TypeOfSchema<typeof SCHEMA_READ_NEW_MESSAGES>;

export const TOOL_READ_NEW_MESSAGES = {
    key: "read_new_messages",
    description: "Read new Telegram messages.",
    schema: SCHEMA_READ_NEW_MESSAGES,
    handle: async (app, _args: OpenReadNewMessages) => {
        const state = getState(app.state);
        const result = await readLatestMessages(
            state.bot,
            app.config.tgChatId,
            state.lastUpdate,
        );

        if (result.lastUpdate !== state.lastUpdate) {
            state.lastUpdate = result.lastUpdate;
        }

        if (result.messages.length === 0) {
            return md.textBlock("No new messages");
        }

        const items = result.messages.map((u) => md.create(
            md.bold(u.message?.from?.username ?? "No username"),
            u.message?.text ?? "No text",
        ));

        return md.details(
            "New Messages",
            md.ul(...items),
        );
    }
} as const satisfies Tool;
