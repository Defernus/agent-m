import { AppPlugin, ContextGenerator } from "app";
import md from "utils/md";

const CONTEXT_GENERATOR_SYSTEM_PROMPT = {
    generateContextPart: async (app) => {
        return md.create(
            md.header(1, "System instructions"),
            app.config.systemPrompt
        )
    },
} as const satisfies ContextGenerator;

export const PLUGIN_SYSTEM_PROMPT = {
    name: "system_prompt",
    configDeps: {
        systemPrompt: { type: "string" },
    },
    contextGenerators: [
        CONTEXT_GENERATOR_SYSTEM_PROMPT,
    ],
} as const satisfies AppPlugin;
