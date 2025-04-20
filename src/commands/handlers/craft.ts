import { AppContext } from "context";
import { handleError } from "handle-error";
import { ObjectSchema, TypeOfSchema } from "schema";

const SCHEMA = {
    type: "object",
    properties: {
        item: { type: "string" },
        count: { type: "number" },
    },
    required: ["item", "count"],
    additionalProperties: false
} as const satisfies ObjectSchema;

export const COMMAND_CRAFT = {
    key: "craft" as const,
    schema: SCHEMA,
    description: "Craft recipe `count` times. Before crafting, calculate the recipe output, for example if you need 10 torches and the recipe output is 4 torches, you need to set `count` to 3.",
    handler: async (
        ctx: AppContext,
        args: TypeOfSchema<typeof SCHEMA>,
    ): Promise<void> => {
        // TODO use crafting table if available
        const item = ctx.state.bot.mcData.itemsByName[args.item];

        if (!item) {
            handleError(ctx, `Item ${JSON.stringify(args.item)} not found in minecraft-data`);
            return;
        }

        const recipe = ctx.providers.bot.recipesFor(item.id, null, 1, false)[0];

        if (!recipe) {
            handleError(ctx, `Recipe for ${args.item} not found`);
            return;
        }

        await ctx.providers.bot.craft(recipe, args.count);
    },
};
