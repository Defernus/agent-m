import { Command, COMMAND_BY_KEY } from "commands/commands";
import { AppContext } from "context";
import { getMainModel } from "model";
import { FunctionTool, ResponseFunctionToolCall, ResponseInput, ResponseOutputRefusal, ResponseOutputText } from "openai/resources/responses/responses";
import { validateBySchema } from "schema";

export type NextAction = { command?: Command, reasoning?: string };

export const getNextAction = async (
    ctx: AppContext,
    history: ResponseInput,
): Promise<NextAction[]> => {
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

    return responseResult.output.map((result) => {
        if (result.type === "message") {
            return {
                reasoning: parseMessage(result.content),
            };
        } else if (result.type === "function_call") {
            return {
                command: parseFunctionCall(result),
            };
        } else {
            throw new Error(`Unknown response type: ${result.type}`);
        }
    });
};

const parseMessage = (result: Array<ResponseOutputText | ResponseOutputRefusal>): string => (
    result.map((item) => (
        item.type === "output_text" ? item.text : "[[ERROR]]"
    ))
        .join("\n\n")
);

const parseFunctionCall = (result: ResponseFunctionToolCall): Command => {
    try {
        const commandInfo = COMMAND_BY_KEY[result.name];

        if (commandInfo === undefined) {
            throw new Error(`Command not found: ${JSON.stringify(result, null, 2)}`);
        }

        const commandArgs = JSON.parse(result.arguments);
        validateBySchema(commandArgs, commandInfo.schema);

        return {
            key: commandInfo?.key,
            args: commandArgs,
        };
    } catch (err) {
        throw new Error(`Error parsing function call:\n${JSON.stringify(result, null, 2)}\nError: ${err}`);
    }
};
