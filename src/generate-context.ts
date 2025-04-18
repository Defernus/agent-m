import { AppContext } from "context";
import { ResponseInput, ResponseInputItem } from "openai/resources/responses/responses";
import { Item } from "prismarine-item";

export const generateHistory = async (ctx: AppContext): Promise<ResponseInput> => {
    return ctx.taskHistory.flatMap((entry): ResponseInputItem[] => {
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
            const worldEventsStr = entry.worldEvents ? `# Events\n${entry.worldEvents}` : null;
            const inGameStateStr = entry.inGameState ? `# State\n${entry.inGameState}` : null;

            const info = [worldEventsStr, inGameStateStr].filter(Boolean).join("\n\n");

            result.push({
                content: info,
                role: "user",
                type: "message",
            });
        }

        return result
    });
};

export const processWorldInfo = async (ctx: AppContext): Promise<string> => {
    const events = ctx.bot.unhandledWorldEvents;
    ctx.bot.unhandledWorldEvents = [];
    return events.map(({ type, content }) => `## ${type}\n${content}`).join("\n");
};

export const processGameState = async (ctx: AppContext): Promise<string> => {
    const state = [];

    // INVENTORY
    const items = ctx.bot.bot.inventory.items();
    state.push("## Inventory");

    state.push("Hotbar slots (0-8):");
    state.push(listItems(items, 0, 8));

    state.push("Inventory slots (9-35):");
    state.push(listItems(items, 9, 35));

    state.push("Armor slots (36-44):");
    state.push(listItems(items, 36, 44));

    state.push("Offhand slot (45):");
    state.push(listItems(items, 45, 45));

    state.push("## Selected hotbar slot");
    state.push(`selected slot: ${ctx.bot.bot.quickBarSlot}`);


    // LOCATION
    state.push("## Current location");
    const { position } = ctx.bot.bot.entity;
    const { dimension } = ctx.bot.bot.game;

    state.push(`- dimension: ${dimension}`);
    state.push(`- position: X: ${position.x.toFixed(2)}, Y: ${position.y.toFixed(2)}, Z: ${position.z.toFixed(2)}`);

    // STATS
    state.push("## Stats");
    state.push(`- time isDay: ${ctx.bot.bot.time.isDay}`);
    state.push(`- health: ${ctx.bot.bot.health}`);
    state.push(`- food: ${ctx.bot.bot.food}`);
    state.push(`- foodSaturation: ${ctx.bot.bot.foodSaturation}`);
    state.push(`- level: ${ctx.bot.bot.experience.level}; progress: ${ctx.bot.bot.experience.progress * 100}%`);

    state.push("## Nearby entities");
    const entitiesByName = Object.entries(ctx.bot.bot.entities).reduce((acc, [id, entity]) => {
        const entityName = entity.name ?? ctx.bot.mcData.entities[entity.id]?.name ?? "unknown";

        const distance = ctx.bot.bot.entity.position.distanceTo(entity.position);

        acc[entityName] ??= { amount: 0, name: entityName, nearestDistance: distance, nearestId: id };

        acc[entityName].amount += 1;
        if (distance < acc[entityName].nearestDistance) {
            acc[entityName].nearestDistance = distance;
            acc[entityName].nearestId = id;
        }

        return acc;
    }, {} as Record<string, { amount: number, name: string, nearestDistance: number, nearestId: string }>);

    const aaa = Object
        .values(entitiesByName)
        .sort((a, b) => a.nearestDistance - b.nearestDistance)
        .map((entity) =>
            `- ${entity.name} x${entity.amount} (nearest: ${entity.nearestDistance.toFixed(2)} blocks, id: ${entity.nearestId})`
        )
        .join("\n");
    state.push(aaa);

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

const listItems = (items: Item[], slotStart: number, slotEnd: number): string => {
    const filteredItems = items.filter((item) => item.slot >= slotStart && item.slot <= slotEnd);
    if (filteredItems.length === 0) {
        return "Empty";
    }
    return filteredItems.sort((a, b) => a.slot - b.slot).map(formatItem).join("\n");
};
