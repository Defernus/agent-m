import { Response, ResponseMessage, ResponseReasoning, ResponseToolUse } from "response";
import { App } from "app";
import { getMainModel } from "model";
import {
    FunctionTool,
    ResponseFunctionToolCall,
    ResponseOutputRefusal,
    ResponseOutputText,
} from "openai/resources/responses/responses";
import { ToolUse } from "tool-use";
import md from "utils/md";

export const getAiResponses = async (
    app: App,
    context: string,
): Promise<Response[]> => {
    const mainModel = getMainModel(app);

    const responseResult = await mainModel.provider.responses.create({
        input: [
            {
                role: "system",
                content: context,
                type: "message",
            },
        ],
        tools: Object.values(app.tools).map((tool) => ({
            name: tool.key,
            type: "function",
            description: tool.description,
            strict: true,
            parameters: tool.schema
        } satisfies FunctionTool)),

        model: mainModel.model,
    });

    return responseResult.output.map((result) => {
        if (result.type === "reasoning") {
            return {
                type: "reasoning",
                tokensCount: responseResult.usage?.output_tokens_details.reasoning_tokens
            } satisfies ResponseReasoning;
        } else if (result.type === "message") {
            return {
                type: "message",
                message: parseMessage(result.content),
            } satisfies ResponseMessage;
        } else if (result.type === "function_call") {
            return {
                type: "tool_use",
                toolUse: parseFunctionCall(app, result),
            } satisfies ResponseToolUse;
        } else {
            throw new Error(`Unknown response type: ${result.type}`);
        }
    });
};

const parseMessage = (result: Array<ResponseOutputText | ResponseOutputRefusal>): string => {
    const parts = result.map((item) => (
        item.type === "output_text" ? item.text : "[[ERROR]]"
    ));

    return md.create(...parts)
};

const parseFunctionCall = (app: App, call: ResponseFunctionToolCall): ToolUse => {
    try {
        const tool = app.tools[call.name];

        if (tool === undefined) {
            throw new Error(`Command not found: ${JSON.stringify(call, null, 2)}`);
        }

        const commandArgs = JSON.parse(call.arguments);

        return {
            key: tool.key,
            args: commandArgs,
        };
    } catch (err) {
        throw new Error(`Error parsing function call:\n${JSON.stringify(call, null, 2)}\nError: ${err}`);
    }
};
