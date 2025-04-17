import { AppContext } from "context";
import { handleError } from "handle-error";
import { Schema, TypeOfSchema } from "schema";

const SCHEMA = {
    type: "object",
    properties: {
        item: { type: "string" },
        count: { type: "integer" },
    },
    required: ["item", "count"],
    additionalProperties: false
} satisfies Schema;

export default {
    key: "craft" as const,
    schema: SCHEMA,
    description: "Craft recipe `count` times. Before crafting, calculate the recipe output, for example if you need 10 torches and the recipe output is 4 torches, you need to set `count` to 3.",
    handler: async (
        ctx: AppContext,
        args: TypeOfSchema<typeof SCHEMA>,
    ): Promise<void> => {
        // TODO use crafting table if available
        const item = ctx.bot.mcData.itemsByName[args.item];

        if (!item) {
            handleError(ctx, `Item ${JSON.stringify(args.item)} not found in minecraft-data`);
            return;
        }

        const recipe = ctx.bot.bot.recipesFor(item.id, null, 1, false)[0];

        if (!recipe) {
            handleError(ctx, `Recipe for ${args.item} not found`);
            return;
        }

        await ctx.bot.bot.craft(recipe, args.count);
    },
};
