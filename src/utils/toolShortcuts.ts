import type { Tool } from '@/models/types';

export const TOOL_HOTKEYS: Partial<Record<Tool, string>> = {
  select: 'Q',
  navigate: 'W',
  pen: 'E',
  seat: 'R',
  marker: 'T',
  delete: 'Y',
};

const CODE_TO_TOOL = Object.fromEntries(
  Object.entries(TOOL_HOTKEYS).map(([tool, key]) => [`Key${key.toUpperCase()}`, tool])
) as Record<string, Tool>;

const KEY_TO_TOOL = Object.fromEntries(
  Object.entries(TOOL_HOTKEYS).map(([tool, key]) => [key.toLowerCase(), tool as Tool])
);

export function toolForHotkey(code: string, key: string): Tool | undefined {
  return CODE_TO_TOOL[code] ?? KEY_TO_TOOL[key.toLowerCase()];
}

export function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}
