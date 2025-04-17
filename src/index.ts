import "dotenv/config";

import { loadAppConfig } from "config";
import { createAppContext } from "context";
import { startMainLoop } from "main-loop";
import { logError, logInfo } from "utils/logger";

const appConfig = loadAppConfig();

(async () => {
    logInfo("Loading configuration...");
    const ctx = await createAppContext(appConfig);

    logInfo("Starting loop...");
    await startMainLoop(ctx);
})()
    .then(() => {
        logInfo("Task solver finished.");
        process.exit(0);
    })
    .catch((err) => {
        logError("Error in main loop:", err);
        process.exit(1);
    });
