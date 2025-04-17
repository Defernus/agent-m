export type RegularSchema = {
    type: "string" | "number" | "boolean",
}

export type ArraySchema = {
    type: "array",
    items: Schema,
}

export type ObjectSchema = {
    type: "object",
    properties: {
        [key: string]: Schema,
    },
    required: string[],
    additionalProperties?: boolean,
}

export type Schema = RegularSchema | ObjectSchema | ArraySchema;

export type TypeOfSchema<T> =
    T extends RegularSchema ? (
        T["type"] extends "string" ? string :
        T["type"] extends "number" ? number :
        T["type"] extends "boolean" ? boolean :
        never
    ) :
    T extends ArraySchema ? TypeOfSchema<T["items"]>[] :
    T extends ObjectSchema ? {
        [K in keyof T["properties"]]: TypeOfSchema<T["properties"][K]>;
    } :
    never;


export const validateBySchema = <S extends Schema>(data: unknown, schema: S): TypeOfSchema<S> => {
    if (schema.type === "string") {
        if (typeof data !== "string") {
            throw new Error(`Expected string, got ${typeof data}`);
        }
        return data as any;
    }
    if (schema.type === "number") {
        if (typeof data !== "number") {
            throw new Error(`Expected number, got ${typeof data}`);
        }
    }
    if (schema.type === "boolean") {
        if (typeof data !== "boolean") {
            throw new Error(`Expected boolean, got ${typeof data}`);
        }
        return data as any;
    }
    if (schema.type === "array") {
        if (!Array.isArray(data)) {
            throw new Error(`Expected array, got ${typeof data}`);
        }
        return data.map((item) => validateBySchema(item, schema.items)) as any;
    }
    if (schema.type === "object") {
        if (typeof data !== "object" || data === null) {
            throw new Error(`Expected object, got ${typeof data}`);
        }
        const obj = data as Record<string, unknown>;
        for (const key in schema.properties) {
            if (!schema.required.includes(key)) {
                throw new Error(`${JSON.stringify(key)} is missing in "required"`);
            }
            validateBySchema(obj[key], schema.properties[key]);
        }
        if (schema.additionalProperties !== false) {
            throw new Error(`additionalProperties should be false`);
        }
        return obj as any;
    }
    throw new Error(`Unknown schema type: ${schema.type}`);
};




export const validateSchema = (schema: Schema) => {
    if (schema.type === "string" || schema.type === "number" || schema.type === "boolean") {
        return;
    }

    if (schema.type === "array") {
        if (!schema.items) {
            throw new Error(`"items" is missing in array schema`);
        }
        validateSchema(schema.items);
        return;
    }

    if (schema.type === "object") {
        for (const key in schema.properties) {
            if (!schema.required.includes(key)) {
                throw new Error(`${JSON.stringify(key)} is missing in "required"`);
            }
        }
        if (schema.additionalProperties !== false) {
            throw new Error(`additionalProperties should be false`);
        }
        return;
    }

    throw new Error(`Unknown schema type: ${schema.type}`);
};
