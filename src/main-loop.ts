import { handleCommand } from "commands/commands";
import { AppContext } from "context";
import { generateHistory, processGameState, processWorldInfo as processWorldEvents } from "generate-context";
import { getNextAction } from "next-action";
import { sleep } from "openai/core";
import { logDebug, logError } from "utils/logger";

export const startMainLoop = async (ctx: AppContext) => {
    for (; ;) {
        if (ctx.state.bot.disconnectReason) {
            logError(`[LOOP] Bot disconnected:\n${ctx.state.bot.disconnectReason}`);
            return;
        }

        logDebug("[LOOP] start iteration");
        logDebug(`\tIteration: ${ctx.state.iteration}`);


        const inGameState = await processGameState(ctx);
        logDebug("[LOOP] In-game state:\n" + inGameState);

        const history = await generateHistory(ctx);

        logDebug("[LOOP] Generating next action...");
        const actionsList = await getNextAction(ctx, history, inGameState);

        for (const { command, reasoning } of actionsList) {
            if (command) {
                logDebug(`[LOOP] Generated command:\n${JSON.stringify(command, null, 2)}`);
                await handleCommand(ctx, command);
            } else {
                logDebug(`[LOOP] Generated reasoning:\n${reasoning}`);
            }

            ctx.state.taskHistory.push({ reasoning, command });
        };

        // TODO instead of simple delay wait for some actual events to happen before the next iteration
        await sleep(ctx.config.iterationDelayMs);

        const worldEvents = await processWorldEvents(ctx);
        logDebug("[LOOP] World events:\n" + worldEvents);

        ctx.state.taskHistory.push({ worldEvents });

        await compressHistory(ctx);

        ++ctx.state.iteration;
    }
};

const compressHistory = async (ctx: AppContext) => {
    // TODO compress old history by summarizing groups of commands into one
}
