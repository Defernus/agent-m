import { AppContext } from "context";


export default {
    key: "chat" as const,
    schema: {
        type: "object",
        properties: {
            message: { type: "string" },
        },
        required: ["message"],
        additionalProperties: false
    },
    description: "Send a message to the chat",
    handler: async (
        ctx: AppContext,
        args: {
            message: string,
        },
    ): Promise<void> => {
        ctx.bot.bot.chat(args.message);
    },
};
