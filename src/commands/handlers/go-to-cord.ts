import { AppContext } from "context";
import { goals } from "mineflayer-pathfinder";
import { Schema, TypeOfSchema } from "schema";

const SCHEMA = {
    type: "object",
    properties: {
        x: { type: "integer" },
        y: { type: "integer" },
        z: { type: "integer" },
        range: { type: "integer" },
    },
    required: ["x", "y", "z", "range"],
    additionalProperties: false
} satisfies Schema;

export default {
    key: "goToCord" as const,
    schema: SCHEMA,
    description: "Go to a specific location, stop when within the \"range\" number of blocks",
    handler: async (
        ctx: AppContext,
        args: TypeOfSchema<typeof SCHEMA>,
    ): Promise<void> => {
        await ctx.bot.bot.pathfinder.goto(new goals.GoalNear(args.x, args.y, args.z, args.range));
    },
};
