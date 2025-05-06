import { App } from "app";
import { validateBySchemaUntyped } from "schema";
import { ToolUse } from "tool-use";
import { logWarn } from "utils/logger";

export const handleToolUse = async (app: App, command: ToolUse): Promise<string> => {
    const tool = app.tools[command.key];
    if (!tool) {
        throw new Error(`Command handler not found for key: ${command.key}`);
    }

    validateBySchemaUntyped(command.args, tool.schema);

    try {
        const result = await tool.handle(app, command.args);

        return result;
    } catch (error) {
        const message = `Error while executing command: ${error}`;

        logWarn(message);
        return message;
    }
};
