import { AppContext } from "context";
import { handleError } from "handle-error";
import { ObjectSchema, TypeOfSchema } from "schema";
import { Vec3 } from "vec3";

const SCHEMA_LOOK_AT_COORD = {
    type: "object",
    properties: {
        targetType: {
            type: "string",
            enum: ["coord"]
        },
        x: { type: "number" },
        y: { type: "number" },
        z: { type: "number" },
    },
    required: ["x", "y", "z"],
    additionalProperties: false
} as const satisfies ObjectSchema;

const SCHEMA_LOOK_AT_ENTITY = {
    type: "object",
    properties: {
        targetType: {
            type: "string",
            enum: ["entity"]
        },
        entityId: { type: "number" },
    },
    required: ["entityId"],
    additionalProperties: false
} as const satisfies ObjectSchema;


const SCHEMA = {
    type: "object",
    properties: {
        target: {
            anyOf: [
                SCHEMA_LOOK_AT_COORD,
                SCHEMA_LOOK_AT_ENTITY,
            ],
        },
    },
    required: ["target"],
    additionalProperties: false
} satisfies ObjectSchema;

export const COMMAND_LOOK_AT = {
    key: "lookAt" as const,
    schema: SCHEMA,
    description: "Look at coordinates or an entity",
    handler: async (
        ctx: AppContext,
        args: TypeOfSchema<typeof SCHEMA>,
    ): Promise<void> => {
        if (args.target.targetType === "coord") {
            await ctx.providers.bot.lookAt(new Vec3(args.target.x, args.target.y, args.target.z), true);
        } else {
            const entity = ctx.providers.bot.entities[args.target.entityId];
            if (!entity) {
                handleError(ctx, `Entity with id ${args.target.entityId} not found`);
                return;
            }
            await ctx.providers.bot.lookAt(entity.position.offset(0, entity.height, 0), true);
        }
    },
};
