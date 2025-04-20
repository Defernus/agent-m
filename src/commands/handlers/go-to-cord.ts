import { AppContext } from "context";
import { goals } from "mineflayer-pathfinder";
import { ObjectSchema, TypeOfSchema } from "schema";

const SCHEMA = {
    type: "object",
    properties: {
        x: { type: "number" },
        y: { anyOf: [{ type: "number" }, { type: "null" }] },
        z: { type: "number" },
        range: { type: "number" },
    },
    required: ["x", "y", "z", "range"],
    additionalProperties: false
} as const satisfies ObjectSchema;

export const COMMAND_GO_TO_CORD = {
    key: "goToCord" as const,
    schema: SCHEMA,
    description: "Go to a specific location, stop when within the \"range\" number of blocks. Only 2 axis are required, y can be null.",
    handler: async (
        ctx: AppContext,
        args: TypeOfSchema<typeof SCHEMA>,
    ): Promise<void> => {
        const goal = args.y === null
            ? new goals.GoalNearXZ(args.x, args.z, args.range)
            : new goals.GoalNear(args.x, args.y, args.z, args.range);
        await ctx.providers.bot.pathfinder.goto(goal);
    },
};
