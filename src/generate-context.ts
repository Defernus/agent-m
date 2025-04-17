import { AppContext } from "context";
import { ResponseInput, ResponseInputItem } from "openai/resources/responses/responses";
import { Item } from "prismarine-item";

export const generateHistory = async (ctx: AppContext): Promise<ResponseInput> => {
    return ctx.taskHistory.flatMap((entry): ResponseInputItem[] => {
        const botMessage = `${entry.reasoning}\n\n# Command\n\`\`\`json\n${JSON.stringify(entry.command, null, 2)}\n\`\`\``;
        const result = `# Events\n${entry.worldEvents}\n# State\n${entry.inGameState}`

        return [
            {
                content: botMessage,
                role: "assistant",
                type: "message",
            },
            {
                content: result,
                role: "user",
                type: "message",
            }
        ]
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
    state.push(Object.values(entitiesByName).map((entity) =>
        `- ${entity.name} x${entity.amount} (nearest: ${entity.nearestDistance.toFixed(2)} blocks, id: ${entity.nearestId})`
    ).join("\n"));

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
