import { handleToolUse } from "commands/handle-tool-use";
import { App } from "app";
import { getAiResponses } from "next-responses";
import { sleep } from "openai/core";
import { logDebug, logInfo } from "utils/logger";
import { createContext } from "create-context";
import md from "utils/md";
import { Response } from "response";
import { dispatchAppEvent } from "dispatch-event";

export const startMainLoop = async (app: App) => {
    for (; ;) {
        if (app.exitReason) {
            logInfo(`Exiting main loop:\n${app.exitReason}`);
            break;
        }

        logDebug(`[LOOP] start iteration ${app.iteration}`);

        const context = await createContext(app);
        await dispatchAppEvent(app, app.listeners.onContextGenerated, context);

        const responses = await getAiResponses(app, context);

        await handleResponses(app, responses);

        await sleep(app.config.iterationDelayMs);

        app.iteration += 1;
    }
};

const handleResponses = async (app: App, responses: Response[]) => {
    for (const response of responses) {
        if (response.type === "tool_use") {
            logDebug(`Tool use:\n${md.jsonBlock(response.toolUse)}`);

            const commandResult = await handleToolUse(app, response.toolUse);
            logDebug(`Tool use result:\n${commandResult}`);

            await dispatchAppEvent(app, app.listeners.onToolUseComplete, response.toolUse, commandResult);
        } else if (response.type === "message") {
            logDebug(`Message:\n${response.message}`);

            await dispatchAppEvent(app, app.listeners.onMessage, response.message);
        } else {
            // skip reasoning
        }
    }
};
