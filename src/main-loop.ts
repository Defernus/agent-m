import { Command, COMMAND_BY_KEY, handleCommand } from "commands/commands";
import { AppContext } from "context";
import { generateHistory, processGameState, processWorldInfo as processWorldEvents } from "generate-context";
import { handleError } from "handle-error";
import { getMainModel } from "model";
import { sleep } from "openai/core";
import { FunctionTool, ResponseInput } from "openai/resources/responses/responses";
import { validateBySchema } from "schema";
import { logDebug, logInfo, logWarn } from "utils/logger";

export const startMainLoop = async (ctx: AppContext) => {
    for (; ;) {
        logDebug("[LOOP] start iteration");
        logDebug(`\tIteration: ${ctx.iteration}`);

        const history = await generateHistory(ctx);

        logDebug("[LOOP] Generating reasoning...");
        const reasoning = await generateReasoning(ctx, history);

        logDebug("[LOOP] Reasoning generated:\n" + reasoning);

        logDebug("[LOOP] Generating next command...");
        const command = await getNextCommand(ctx, history, reasoning);

        logDebug(`[LOOP] Generated command:\n${JSON.stringify(command, null, 2)}`);

        await handleCommand(ctx, command);

        // TODO instead of simple delay wait for some actual events to happen before the next iteration
        await sleep(ctx.config.iterationDelayMs);

        const worldEvents = await processWorldEvents(ctx);
        const inGameState = await processGameState(ctx);
        ctx.taskHistory.push({ reasoning, command, worldEvents, inGameState });

        await compressHistory(ctx);

        ++ctx.iteration;
    }
};

const compressHistory = async (ctx: AppContext) => {
    // TODO compress old history by summarizing groups of commands into one
}

const generateReasoning = async (ctx: AppContext, history: ResponseInput): Promise<string> => {
    const mainModel = getMainModel(ctx);

    const result = await mainModel.provider.responses.create({
        input: [
            {
                role: "system",
                content: ctx.config.systemPromptReasoning,
                type: "message",
            },
            ...history,
        ],
        model: mainModel.model,
    });

    return result.output_text;
}

const getNextCommand = async (ctx: AppContext, history: ResponseInput, reasoning: string): Promise<Command> => {
    const mainModel = getMainModel(ctx);

    const responseResult = await mainModel.provider.responses.create({
        input: [
            {
                role: "system",
                content: ctx.config.systemPromptCommandGeneration,
                type: "message",
            },
            ...history,
            {
                role: "assistant",
                content: reasoning,
                type: "message",
            },
            {
                role: "user",
                content: "What is the next command to execute?",
                type: "message",
            }
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
        logWarn(`Expected function call, got ${JSON.stringify(resultFunctionCall, null, 2)}`);
        handleError(ctx, `Expected function call, but regular message received. Sent to chat.`);
        return {
            key: "chat",
            args: {
                message: responseResult.output_text,
            },
        };
    }

    try {
        const commandInfo = COMMAND_BY_KEY[resultFunctionCall.name];

        if (commandInfo === undefined) {
            throw new Error(`Command not found: ${JSON.stringify(resultFunctionCall, null, 2)}`);
        }

        const commandArgs = JSON.parse(resultFunctionCall.arguments);
        validateBySchema(commandArgs, commandInfo.schema);

        return {
            key: commandInfo?.key,
            args: commandArgs,
        }
    } catch (err) {
        throw new Error(`Error parsing function call:\n${JSON.stringify(resultFunctionCall, null, 2)}\nError: ${err}`);
    }
};
