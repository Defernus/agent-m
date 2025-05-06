import { App } from "app";

export const dispatchAppEvent = async<T extends any[]>(
    app: App,
    callbacks: ((app: App, ...args: T) => Promise<void>)[],
    ...args: T
): Promise<void> => {
    for (const cb of callbacks) {
        await cb(app, ...args);
    }
}