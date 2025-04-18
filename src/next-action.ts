import { Command, COMMAND_LIST } from "commands/commands";
import { AppContext } from "context";
import { getMainModel } from "model";
import {
    FunctionTool,
    ResponseFunctionToolCall,
    ResponseInput,
    ResponseOutputRefusal,
    ResponseOutputText,
} from "openai/resources/responses/responses";

export type NextAction = { command?: Command, reasoning?: string };

export const getNextAction = async (
    ctx: AppContext,
    history: ResponseInput,
    inGameState: string,
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
            {
                role: "user",
                content: inGameState,
                type: "message",
            },
        ],
        tools: COMMAND_LIST.map((command): FunctionTool => ({
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
        const commandInfo = COMMAND_LIST.find(({ key }) => key === result.name);

        if (commandInfo === undefined) {
            throw new Error(`Command not found: ${JSON.stringify(result, null, 2)}`);
        }

        const commandArgs = JSON.parse(result.arguments);

        return {
            key: commandInfo?.key,
            args: commandArgs,
        };
    } catch (err) {
        throw new Error(`Error parsing function call:\n${JSON.stringify(result, null, 2)}\nError: ${err}`);
    }
};
