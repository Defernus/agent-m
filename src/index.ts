// load environment variables from .env file
import "dotenv/config";

import { loadAppConfig } from "config";
import { createApp } from "create-app";
import { startMainLoop } from "main-loop";
import { logError, logInfo } from "utils/logger";
import { PLUGINS } from "commands/plugins";


(async () => {
    logInfo("Loading configuration");

    const appConfig = await loadAppConfig();

    logInfo("Creating app");

    const app = await createApp(
        appConfig,
        PLUGINS,
    );

    logInfo("Starting loop");
    await startMainLoop(app);
})()
    .then(() => {
        logInfo("Task solver finished.");
        process.exit(0);
    })
    .catch((err) => {
        logError("Error in main loop:", err);
        process.exit(1);
    });
