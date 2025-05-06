import { AppPlugin, ContextGenerator, Tool } from "app";
import path from "path";
import { Schema, TypeOfSchema } from "schema";
import { executeInContainer, getRunningContainer, readFileFromContainer, writeFileToContainer } from "utils/docker";
import { logDebug } from "utils/logger";
import md from "utils/md";

const TIMEOUT_DEFAULT = 5000;
const STATE_OPEN_FILES = "CONTAINER__OPEN_FILES";
type StateOpenFiles = Record<string, { path: string }>;


const CONTEXT_GENERATOR_OPEN_FILES = {
    generateContextPart: async (app) => {
        const openFiles = (app.state[STATE_OPEN_FILES] as StateOpenFiles);

        const filesContent: string[] = [];

        const container = await getRunningContainer(app.config.docker, app.config.containerName);

        for (const file of Object.values(openFiles)) {
            let content;
            try {
                content = md.textBlock(await readFileFromContainer(container, file.path));
            } catch (e) {
                content = `Error reading file: ${e}`;
            }

            filesContent.push(md.details(
                `${file.path}`,
                content,
            ));
        }

        return md.create(
            md.header(1, "OpenFiles"),
            md.ul(...filesContent),
        );
    },
} as const satisfies ContextGenerator;


const SCHEMA_CREATE_FILE = {
    type: "object",
    properties: {
        path: {
            type: "string",
            description: "Absolute path to the file.",
        },
        content: {
            type: "string",
            description: "Content of the file.",
        },
    },
    additionalProperties: false,
    required: ["path", "content"],
} as const satisfies Schema;
type CreateFileArgs = TypeOfSchema<typeof SCHEMA_CREATE_FILE>;

const TOOL_CREATE_FILE = {
    key: "create_file",
    description: "Create file in the container",
    schema: SCHEMA_CREATE_FILE,
    handle: async (app, args: CreateFileArgs) => {
        if (!path.isAbsolute(args.path)) {
            throw new Error(`Path must be absolute. Got: ${args.path}`);
        }

        const container = await getRunningContainer(app.config.docker, app.config.containerName);
        await writeFileToContainer(container, args.path, args.content);

        return md.textBlock("Successfully created file");
    }
} as const satisfies Tool;


const SCHEMA_OPEN_FILES = {
    type: "object",
    properties: {
        files: {
            type: "array",
            description: "Files to open.",
            items: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Absolute path to the file.",
                    },
                },
                required: ["path"],
                additionalProperties: false,
            },
        },
    },
    additionalProperties: false,
    required: ["files"],
} as const satisfies Schema;
type OpenFilesArgs = TypeOfSchema<typeof SCHEMA_OPEN_FILES>;

const TOOL_OPEN_FILES = {
    key: "open_files",
    description: "Open files and add to the context. Do not forget to close them using `close_files` when don't need them anymore. You should open multiple files at once instead of calling this tool multiple times.",
    schema: SCHEMA_OPEN_FILES,
    handle: async (app, args: OpenFilesArgs) => {
        const openFiles = (app.state[STATE_OPEN_FILES] as StateOpenFiles);

        // validate files first
        for (const file of args.files) {
            if (!path.isAbsolute(file.path)) {
                throw new Error(`Path must be absolute. Got: ${file.path}`);
            }
        }

        // add files to open files
        for (const file of args.files) {
            const formattedPath = path.resolve(file.path);
            openFiles[formattedPath] = {
                path: formattedPath,
            };
        }

        return md.textBlock("File opened");
    }
} as const satisfies Tool;



const SCHEMA_CLOSE_FILES = {
    type: "object",
    properties: {
        files: {
            type: "array",
            description: "Files to close.",
            items: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Absolute path to the file.",
                    },
                },
                required: ["path"],
                additionalProperties: false,
            },
        },
    },
    additionalProperties: false,
    required: ["files"],
} as const satisfies Schema;
type CloseFilesArgs = TypeOfSchema<typeof SCHEMA_CLOSE_FILES>;

const TOOL_CLOSE_FILES = {
    key: "close_files",
    description: "Close files and remove them from context.",
    schema: SCHEMA_CLOSE_FILES,
    handle: async (app, args: CloseFilesArgs) => {
        let closedFiles = 0;
        (app.state[STATE_OPEN_FILES] as StateOpenFiles) = Object.fromEntries(
            Object.entries(app.state[STATE_OPEN_FILES] as StateOpenFiles).filter(([key]) => {
                const shouldClose = args.files.some((file) => file.path === key);

                if (shouldClose) {
                    closedFiles++;
                }

                return !shouldClose;
            }),
        );

        return md.textBlock(`Closed ${closedFiles} files`);
    }
} as const satisfies Tool;


const SCHEMA_EXECUTE_BASH = {
    type: "object",
    properties: {
        command: { type: "string" },
        pwd: {
            type: "string",
            description: "Absolute path to directory to execute the command in.",
        },
        timeout: {
            anyOf: [{ type: "number" }, { type: "null" }],
            description: `Timeout in milliseconds. If null, default to ${TIMEOUT_DEFAULT} ms.`,
        },
    },
    additionalProperties: false,
    required: ["command", "pwd", "timeout"],
} as const satisfies Schema;
type ExecuteBashArgs = TypeOfSchema<typeof SCHEMA_EXECUTE_BASH>;

const TOOL_EXECUTE_BASH = {
    key: "execute_bash",
    description: "Execute a bash command in a container. DO NOT USE FOR FILE CREATION!",
    schema: SCHEMA_EXECUTE_BASH,
    handle: async (app, args: ExecuteBashArgs) => {
        const container = await getRunningContainer(app.config.docker, app.config.containerName);
        const result = await executeInContainer(container, args.command, args.pwd, args.timeout ?? TIMEOUT_DEFAULT);

        return md.details("Bash output", md.textBlock(result));
    }
} as const satisfies Tool;

export const PLUGIN_CONTAINER = {
    name: "container",
    configDeps: {
        containerName: { type: "string" },
    },
    tools: [
        TOOL_CREATE_FILE,
        TOOL_OPEN_FILES,
        TOOL_CLOSE_FILES,
        TOOL_EXECUTE_BASH,
    ],
    contextGenerators: [
        CONTEXT_GENERATOR_OPEN_FILES,
    ],
    listeners: {
        onInit: async (config, state) => {
            // check container exists and is running
            const container = await getRunningContainer(config.docker, config.containerName);
            logDebug(`Container found: ${container.id}`);

            // Init state
            (state[STATE_OPEN_FILES] as StateOpenFiles) = {};
        },
    },
} as const satisfies AppPlugin;
