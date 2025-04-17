import { Command, COMMAND_BY_KEY, handleCommand } from "commands/commands";
import { AppContext } from "context";
import { generateHistory, processGameState, processWorldInfo as processWorldEvents } from "generate-context";
import { getMainModel } from "model";
import { sleep } from "openai/core";
import { FunctionTool, ResponseInput } from "openai/resources/responses/responses";
import { validateBySchema } from "schema";
import { logDebug } from "utils/logger";

export const startMainLoop = async (ctx: AppContext) => {
    for (; ;) {
        logDebug("[LOOP] start iteration");
        logDebug(`\tIteration: ${ctx.iteration}`);

        const history = await generateHistory(ctx);

        logDebug("[LOOP] Generating next action...");
        const { command, reasoning } = await getNextAction(ctx, history);

        logDebug(`[LOOP] Generated command:\n${JSON.stringify(command, null, 2)}`);

        if (command) {
            await handleCommand(ctx, command);
        }

        // TODO instead of simple delay wait for some actual events to happen before the next iteration
        await sleep(ctx.config.iterationDelayMs);

        const worldEvents = await processWorldEvents(ctx);
        logDebug("[LOOP] World events:\n" + worldEvents);

        const inGameState = await processGameState(ctx);
        logDebug("[LOOP] In-game state:\n" + inGameState);

        ctx.taskHistory.push({ reasoning, command, worldEvents, inGameState });

        await compressHistory(ctx);

        ++ctx.iteration;
    }
};

const compressHistory = async (ctx: AppContext) => {
    // TODO compress old history by summarizing groups of commands into one
}

const getNextAction = async (
    ctx: AppContext,
    history: ResponseInput,
): Promise<{ command?: Command, reasoning?: string }> => {
    const mainModel = getMainModel(ctx);

    const responseResult = await mainModel.provider.responses.create({
        input: [
            {
                role: "system",
                content: ctx.config.systemPrompt,
                type: "message",
            },
            ...history,
        ],
        tools: Object.values(COMMAND_BY_KEY).map((command): FunctionTool => ({
            name: command.key,
            type: "function",
            description: command.description,
            strict: true,
            parameters: command.schema
        })),

        model: mainModel.model,
    });

    if (responseResult.output.length !== 1) {
        throw new Error(`Expected one output, got ${JSON.stringify(responseResult.output, null, 2)}`);
    }

    const resultFunctionCall = responseResult.output[0];

    if (resultFunctionCall.type !== "function_call") {
        return { reasoning: responseResult.output_text };
    }

    try {
        const commandInfo = COMMAND_BY_KEY[resultFunctionCall.name];

        if (commandInfo === undefined) {
            throw new Error(`Command not found: ${JSON.stringify(resultFunctionCall, null, 2)}`);
        }

        const commandArgs = JSON.parse(resultFunctionCall.arguments);
        validateBySchema(commandArgs, commandInfo.schema);

        return {
            command: {
                key: commandInfo?.key,
                args: commandArgs,
            },
        };
    } catch (err) {
        throw new Error(`Error parsing function call:\n${JSON.stringify(resultFunctionCall, null, 2)}\nError: ${err}`);
    }
};
