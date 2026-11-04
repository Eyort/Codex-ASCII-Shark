export function isCodexWorkModeLabel(label: string): boolean {
  return /(?:当前模式|current mode)\s*[:：]\s*(?:codex|work)\b/i.test(label);
}
