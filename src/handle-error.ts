import { AppContext } from "context";

export const handleError = (ctx: AppContext, error: string): void => {
    ctx.state.bot.unhandledWorldEvents.push({
        type: "error",
        content: error,
    });
};
