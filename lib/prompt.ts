import fs from 'node:fs/promises';
import path from 'node:path';

const PROMPTS_DIR = path.join(process.cwd(), 'prompts');

function resolveToken(vars: Record<string, unknown>, token: string): string {
    const segments = token.split('.');
    const value = segments.reduce<unknown>((current, key) => {
        if (current === null || current === undefined) {
            return undefined;
        }
        if (typeof current !== 'object') {
            return undefined;
        }
        return (current as Record<string, unknown>)[key];
    }, vars);

    if (value === null || value === undefined) {
        return '';
    }

    return String(value);
}

export async function loadPrompt(name: string): Promise<string> {
    const filePath = path.join(PROMPTS_DIR, name);
    return fs.readFile(filePath, 'utf-8');
}

export function renderTemplate(
    md: string,
    vars: Record<string, unknown>,
): string {
    return md.replace(/{{\s*([\w.]+)\s*}}/g, (_match, token: string) =>
        resolveToken(vars, token),
    );
}

export function joinAsSystemMessage(base: string, userPart?: string): string {
    const baseContent = base?.trim() ?? '';
    const extraContent = userPart?.trim();

    if (extraContent) {
        return `${baseContent}\n\n---\n\n${extraContent}`;
    }

    return baseContent;
}
