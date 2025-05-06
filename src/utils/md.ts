const textBlock = (text: string, lang = '') => {
    // find the longest run of back‑ticks in the content
    const maxRun = Math.max(
        0,
        ...[...text.matchAll(/`+/g)].map(m => m[0].length)
    );

    const fence = '`'.repeat(Math.max(3, maxRun + 1));

    return `${fence}${lang ? lang : ''}\n${text}\n${fence}`;
};

/**
 * Serialize `data` to a JSON string and wrap it in a code block
 */
const jsonBlock = (data: unknown) => textBlock(JSON.stringify(data, null, 2), "json");

const create = (...parts: string[]): string => parts
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .join("\n\n");


const bold = (text: string): string => `**${text}**`;

const header = (level: number, text: string): string => `${"#".repeat(level)} ${text}`;

const details = (summary: string, content: string, open = false): string => {
    const openTag = open ? " open" : "";

    return `<details${openTag}>\n<summary>${summary}</summary>\n\n${content}\n\n</details>`
};

/**
 * Create a markdown string with a horizontal line between each part
 * 
 * Result example:
 * ```
 * <part 1>
 * 
 * ---
 * 
 * <part 2>
 * 
 * ---
 * 
 * <part 3>
 * ```
 */
const separate = (...parts: string[]): string => parts
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .join("\n\n---\n\n");


const addTab = (text: string, level: number): string => {
    const tab = "\t".repeat(level);
    return text.split("\n").map(line => `${tab}${line}`).join("\n");
};

const ul = (...items: string[]): string => items.map(item => `- ${addTab(item, 1).trim()}`).join("\n\n");

export default {
    textBlock,
    jsonBlock,
    separate,
    details,
    addTab,
    header,
    create,
    bold,
    ul,
}
