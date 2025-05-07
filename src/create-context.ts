import { App } from "app";
import md from "utils/md";

export const createContext = async (app: App): Promise<string> => {
    let parts: string[] = [];

    for (const generator of app.contextGenerators) {
        const part = await generator.generateContextPart(app);
        parts.push(part);
    }

    return md.create(...parts);
};
