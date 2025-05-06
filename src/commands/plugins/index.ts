import { PLUGIN_CONTAINER } from "./container";
import { PLUGIN_HISTORY } from "./history";
import { PLUGIN_LOG_TO_FILES } from "./log-to-files";
import { PLUGIN_SYSTEM_PROMPT } from "./system-prompt";
import { PLUGIN_TASK } from "./task";

export const PLUGINS = [
    PLUGIN_SYSTEM_PROMPT,
    PLUGIN_HISTORY,

    PLUGIN_LOG_TO_FILES,
    PLUGIN_CONTAINER,
    PLUGIN_TASK,
];
