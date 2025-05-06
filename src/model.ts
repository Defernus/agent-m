import { App } from "app";
import OpenAI from "openai";

export const getMainModel = (app: App): { provider: OpenAI, model: string } => {
    const model = app.config.models[app.config.mainModel];
    if (!model) {
        throw new Error(`Model ${app.config.mainModel} not found`);
    }
    const provider = app.config.aiProviders[model.provider];
    if (!provider) {
        throw new Error(`Provider ${model.provider} not found`);
    }
    return { provider, model: model.modelName };
};
