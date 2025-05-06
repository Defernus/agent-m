import { ToolUse } from "tool-use";

export type ResponseToolUse = {
    type: "tool_use",
    toolUse: ToolUse,
};

export type ResponseReasoning = {
    type: "reasoning",
    /**
     * Amount of tokens used for reasoning
     */
    tokensCount?: number,
};


export type ResponseMessage = {
    type: "message",
    message: string
};

export type Response = ResponseToolUse | ResponseReasoning | ResponseMessage;
