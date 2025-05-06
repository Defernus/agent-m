import { App } from "app";

export const createContext = async (app: App): Promise<string> => {
    const parts = await Promise.all(
        Object
            .values(app.contextGenerators)
            .map((generator) => generator.generateContextPart(app))
    );

    return parts.join("\n\n");
};
