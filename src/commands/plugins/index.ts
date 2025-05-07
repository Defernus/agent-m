import { PLUGIN_CONTAINER } from "./container";
import { PLUGIN_LOG_TO_FILES } from "./log-to-files";
import { PLUGIN_TASK } from "./task";
import { PLUGIN_USER_CONNECTION } from "./user-connection";

export const PLUGINS = [
    PLUGIN_TASK,
    PLUGIN_LOG_TO_FILES,
    PLUGIN_CONTAINER,
    PLUGIN_USER_CONNECTION,
];
