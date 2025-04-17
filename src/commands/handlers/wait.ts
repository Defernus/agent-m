import { AppContext } from "context";
import { sleep } from "openai/core";
import { Schema, TypeOfSchema } from "schema";

const SCHEMA = {
    type: "object",
    properties: {
        ms: { type: "number" },
    },
    required: ["ms"],
    additionalProperties: false
} satisfies Schema;

export default {
    key: "wait" as const,
    schema: SCHEMA,
    description: "Do nothing for a specified amount of time (in milliseconds)",
    handler: async (
        _ctx: AppContext,
        args: TypeOfSchema<typeof SCHEMA>,
    ): Promise<void> => {
        await sleep(args.ms);
    },
};
