export type RegularSchema = {
    type: "number" | "boolean" | "null",
    description?: string,
}

export type StringSchema = {
    type: "string",
    enum?: string[],
    description?: string,
}


export type ArraySchema = {
    type: "array",
    items: Schema,
    description?: string,
}

export type ObjectSchema = {
    type: "object",
    properties: {
        [key: string]: Schema,
    },
    required: string[],
    additionalProperties: false,
    description?: string,
}

export type AnyOfSchema = {
    anyOf: Schema[],
}

export type Schema = RegularSchema | StringSchema | ObjectSchema | ArraySchema | AnyOfSchema;

export type TypeOfSchema<T> =
    T extends RegularSchema ? (
        T["type"] extends "number" ? number :
        T["type"] extends "boolean" ? boolean :
        T["type"] extends "null" ? null :
        never
    ) :
    T extends StringSchema ? (
        T["enum"] extends string[] ? T["enum"][number] :
        string
    ) :
    T extends ArraySchema ? TypeOfSchema<T["items"]>[] :
    T extends ObjectSchema ? {
        [K in keyof T["properties"]]: TypeOfSchema<T["properties"][K]>;
    } :
    T extends AnyOfSchema ? TypeOfSchema<T["anyOf"][number]> :
    never;


export const validateBySchema = <S extends Schema>(data: unknown, schema: S): TypeOfSchema<S> => {
    validateBySchemaUntyped(data, schema);
    return data as TypeOfSchema<S>;
};

export const validateBySchemaUntyped = <S extends Schema>(data: unknown, schema: S) => {
    if ("anyOf" in schema) {
        for (const subSchema of schema.anyOf) {
            try {
                validateBySchemaUntyped(data, subSchema);
                return;
            } catch (e) {
                // Ignore error and try next schema
            }
        }
        throw new Error(`No matching schema found for data: ${JSON.stringify(data)}`);
    }

    if (schema.type === "string") {
        if (typeof data !== "string") {
            throw new Error(`Expected string, got ${typeof data}`);
        }
        return;
    }
    if (schema.type === "null") {
        if (data !== null) {
            throw new Error(`Expected null, got ${typeof data}`);
        }
        return;
    }
    if (schema.type === "number") {
        if (typeof data !== "number") {
            throw new Error(`Expected number, got ${typeof data}`);
        }
        return;
    }
    if (schema.type === "boolean") {
        if (typeof data !== "boolean") {
            throw new Error(`Expected boolean, got ${typeof data}`);
        }
        return;
    }
    if (schema.type === "array") {
        if (!Array.isArray(data)) {
            throw new Error(`Expected array, got ${typeof data}`);
        }
        data.forEach((item) => validateBySchemaUntyped(item, schema.items));
        return;
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
            validateBySchemaUntyped(obj[key], schema.properties[key]);
        }
        if (schema.additionalProperties !== false) {
            throw new Error(`additionalProperties should be false`);
        }
        return;
    }

    throw new Error(`Unknown schema type: ${schema.type}`);
};

export const validateSchemaDescription = (schema: Schema) => {
    if ("anyOf" in schema) {
        for (const subSchema of schema.anyOf) {
            validateSchemaDescription(subSchema);
        }
        return;
    }

    if (schema.type === "string" || schema.type === "number" || schema.type === "boolean") {
        return;
    }

    if (schema.type === "array") {
        if (!schema.items) {
            throw new Error(`"items" is missing in array schema`);
        }
        validateSchemaDescription(schema.items);
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
