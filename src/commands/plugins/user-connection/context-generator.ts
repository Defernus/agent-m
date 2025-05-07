
import md from "utils/md";
import { getState } from "./state";
import { countUnreadMessages } from "utils/tg";
import { ContextGenerator } from "app";

export const CONTEXT_GENERATOR_UNREAD_MESSAGES = {
    generateContextPart: async (app) => {
        const state = getState(app.state);
        const count = await countUnreadMessages(state.bot, app.config.tgChatId, state.lastUpdate);

        return md.create(
            md.header(1, "Telegram"),
            count == 0
                ? "No unread messages"
                : `Unread messages: ${count}`,
        );
    }
} as const satisfies ContextGenerator;
