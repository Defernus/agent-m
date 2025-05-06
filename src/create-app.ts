import { AppConfig, checkConfigDeps } from "config";
import {
    App,
    AppPlugin,
    ContextGenerator,
    OnContextGenerated,
    OnIterationEnd,
    OnMessage,
    OnReasoning,
    OnToolUseComplete,
    Tool,
} from "app";

export const createApp = async (
    config: AppConfig,
    plugins: AppPlugin[],
): Promise<App> => {
    const tools = {} as Record<string, Tool>;
    const contextGenerators: ContextGenerator[] = [];
    const state: Record<string, unknown> = {};

    const listeners: App["listeners"] = {
        onContextGenerated: [],
        onIterationEnd: [],
        onMessage: [],
        onReasoning: [],
        onToolUseComplete: [],
    };

    for (const plugin of plugins) {
        try {
            plugin.configDeps && checkConfigDeps(config, plugin.configDeps);
        } catch (error) {
            throw new Error(`Error while checking config deps for plugin "${plugin.name}": ${error}`);
        }

        try {
            await plugin.listeners?.onInit?.(config, state);
        } catch (error) {
            throw new Error(`Error while initializing plugin ${plugin.name}: ${error}`);
        }

        for (const [eventName, listener] of Object.entries(plugin.listeners ?? {})) {
            if (eventName === "onInit") {
                continue;
            }

            listeners[eventName as keyof App["listeners"]].push(listener as any);
        }


        for (const tool of plugin.tools ?? []) {
            tools[tool.key] = tool;
        }

        for (const contextGenerator of plugin.contextGenerators ?? []) {
            contextGenerators.push(contextGenerator);
        }
    }

    return {
        config,
        state,

        tools,
        contextGenerators,

        listeners,

        startTime: Date.now(),
        iteration: 0,
        exitReason: null,
    } satisfies App;
}
