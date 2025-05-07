import { App, AppPlugin } from "app";
import { mkdir, readFile, writeFile } from "fs/promises";
import md from "utils/md";


const TYPE_CONTEXT = "00_context";
const TYPE_TOOL_USE = "01_response";

const writeLogs = async (app: App, type: string, content: string) => {
    // Unsure the directory exists
    const dirPath = `${app.config.pathToLogs}/${app.startTime}`;
    await mkdir(dirPath, { recursive: true });


    // append to the file
    const fileName = `${dirPath}/${app.iteration.toString().padStart(5, "0")}-${type}.md`;

    const fileContent = await readFile(fileName, "utf-8").catch(() => "");

    await writeFile(fileName, md.separate(fileContent, content));
};

export const PLUGIN_LOG_TO_FILES = {
    name: "log_to_files",
    configDeps: {
        pathToLogs: { type: "string" },
    },
    listeners: {
        onContextGenerated: async (app, context) => {
            writeLogs(
                app,
                TYPE_CONTEXT,
                md.create(
                    context,
                ),
            );
        },
        onMessage: async (app, message) => {
            writeLogs(
                app,
                TYPE_CONTEXT,
                md.create(
                    md.header(1, "Message"),
                    message,
                ),
            );
        },
        onToolUseComplete: async (app, toolUse, result) => {
            writeLogs(
                app,
                TYPE_TOOL_USE,
                md.create(
                    md.header(1, "Tool Use"),
                    md.jsonBlock(toolUse),
                    md.bold("Result:"),
                    result,
                ),
            );
        },
    },
} as const satisfies AppPlugin;
