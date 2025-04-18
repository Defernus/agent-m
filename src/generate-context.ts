import { AppContext } from "context";
import { ResponseInput, ResponseInputItem } from "openai/resources/responses/responses";
import { Item } from "prismarine-item";

export const generateHistory = async (ctx: AppContext): Promise<ResponseInput> => {
    return ctx.state.taskHistory.flatMap((entry, index, history): ResponseInputItem[] => {
        const result: ResponseInputItem[] = [];

        if (entry.command || entry.reasoning) {
            const commandStr = entry.command ? `# Command\n\`\`\`json\n${JSON.stringify(entry.command, null, 2)}\n\`\`\`` : null;
            const reasoningStr = entry.reasoning ? `# Reasoning\n${entry.reasoning}` : null;
            const botMessage = [reasoningStr, commandStr].filter(Boolean).join("\n\n");

            result.push({
                content: botMessage,
                role: "assistant",
                type: "message",
            });
        }

        if (entry.worldEvents) {
            const worldEventsStr = `# Events\n${entry.worldEvents}`;
            result.push({
                content: worldEventsStr,
                role: "user",
                type: "message",
            });
        }

        return result
    });
};

export const processWorldInfo = async (ctx: AppContext): Promise<string> => {
    const events = ctx.state.bot.unhandledWorldEvents;
    ctx.state.bot.unhandledWorldEvents = [];
    return events.map(({ type, content }) => `## ${type}\n${content}`).join("\n");
};

export const processGameState = async (ctx: AppContext): Promise<string> => {
    const state = [];

    state.push("## Inventory");
    state.push(formatInventory(ctx));

    state.push("## Own info");
    state.push(formatInfo(ctx));

    state.push("## Entities");
    state.push(formatEntities(ctx));

    return state.join("\n");
};

const itemName = (item: Item): string => {
    if (item.customName) {
        return `${JSON.stringify(item.customName)} (${item.name})`;
    }
    return item.name;
};

const formatItem = (item: Item) => {
    const name = itemName(item);
    return `- [at slot ${item.slot}] ${name} x${item.count}`;
};

const formatInventory = (ctx: AppContext): string => {
    const items = ctx.providers.bot.inventory.items();
    const state = [];

    state.push("Hotbar slots (0-8):");
    state.push(listItems(items, 0, 8));

    state.push("Inventory slots (9-35):");
    state.push(listItems(items, 9, 35));

    state.push("Armor slots (36-44):");
    state.push(listItems(items, 36, 44));

    state.push("Offhand slot (45):");
    state.push(listItems(items, 45, 45));

    state.push("## Selected hotbar slot");
    state.push(`selected slot: ${ctx.providers.bot.quickBarSlot}`);

    return state.join("\n");
}

const formatInfo = (ctx: AppContext): string => {
    const state = [];

    const { position } = ctx.providers.bot.entity;
    const { dimension } = ctx.providers.bot.game;
    state.push(`- dimension: ${dimension}`);
    state.push(`- position: X: ${position.x.toFixed(2)}, Y: ${position.y.toFixed(2)}, Z: ${position.z.toFixed(2)}`);

    state.push(`- time isDay: ${ctx.providers.bot.time.isDay}`);
    state.push(`- health: ${ctx.providers.bot.health}`);
    state.push(`- food: ${ctx.providers.bot.food}`);
    state.push(`- foodSaturation: ${ctx.providers.bot.foodSaturation}`);
    state.push(`- level: ${ctx.providers.bot.experience.level}; progress: ${ctx.providers.bot.experience.progress * 100}%`);

    return state.join("\n");
}

const listItems = (items: Item[], slotStart: number, slotEnd: number): string => {
    const filteredItems = items.filter((item) => item.slot >= slotStart && item.slot <= slotEnd);
    if (filteredItems.length === 0) {
        return "Empty";
    }
    return filteredItems.sort((a, b) => a.slot - b.slot).map(formatItem).join("\n");
};

const formatEntities = (ctx: AppContext): string => {
    const entities = Object.entries(ctx.providers.bot.entities).map(([id, entity]) => {
        const entityName = entity.name ?? ctx.state.bot.mcData.entities[entity.id]?.name ?? "unknown";

        const distance = ctx.providers.bot.entity.position.distanceTo(entity.position);

        return {
            id,
            name: entityName,
            distance,
        }
    });

    return entities
        .sort((a, b) => a.distance - b.distance)
        .map((entity) =>
            `- id: ${entity.id}; name: ${JSON.stringify(entity.name)}; distance: ${entity.distance.toFixed(2)} blocks`
        )
        .join("\n");

};