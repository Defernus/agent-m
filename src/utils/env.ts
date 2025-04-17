export const loadEnvString = (key: string): string => {
    const value = process.env[key];
    if (value === undefined) {
        throw new Error(`Environment variable ${key} is not defined`);
    }
    return value;
};

export const loadEnvStringOr = (key: string, defaultValue: string): string => {
    return process.env[key] ?? defaultValue;
};

export const loadEnvNumber = (key: string): number => {
    const value = loadEnvString(key);
    const numberValue = Number(value);
    if (isNaN(numberValue)) {
        throw new Error(`Environment variable ${key} is not a valid number`);
    }
    return numberValue;
};

export const loadEnvNumberOr = (key: string, defaultValue: number): number => {
    const value = process.env[key];
    if (value === undefined) {
        return defaultValue;
    }
    const numberValue = Number(value);
    if (isNaN(numberValue)) {
        throw new Error(`Environment variable ${key} is not a valid number`);
    }
    return numberValue;
}