import { AppContext } from "context";
import OpenAI from "openai";

export const getMainModel = (ctx: AppContext): { provider: OpenAI, model: string } => {
    const model = ctx.config.models[ctx.config.mainModel];
    if (!model) {
        throw new Error(`Model ${ctx.config.mainModel} not found`);
    }
    const provider = ctx.providers.aiProviders[model.provider];
    if (!provider) {
        throw new Error(`Provider ${model.provider} not found`);
    }
    return { provider, model: model.modelName };
};
