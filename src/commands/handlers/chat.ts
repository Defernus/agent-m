import { AppContext } from "context";
import { ObjectSchema, TypeOfSchema } from "schema";

const SCHEMA = {
    type: "object",
    properties: {
        message: { type: "string" },
    },
    required: ["message"],
    additionalProperties: false
} as const satisfies ObjectSchema;

export const COMMAND_CHAT = {
    key: "chat" as const,
    schema: SCHEMA,
    description: "Send a message to the chat",
    handler: async (
        ctx: AppContext,
        args: TypeOfSchema<typeof SCHEMA>,
    ): Promise<void> => {
        ctx.providers.bot.chat(args.message);
    },
};
