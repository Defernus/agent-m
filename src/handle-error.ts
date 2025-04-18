import { AppContext } from "context";

export const handleError = (ctx: AppContext, error: string): void => {
    ctx.bot.unhandledWorldEvents.push({
        type: "error",
        content: error,
    });
};
