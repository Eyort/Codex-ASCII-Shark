export function isSupportedConversationModeLabel(label: string): boolean {
  return /(?:当前模式|current mode)\s*[:：]\s*(?:chatgpt|codex|work)\b/i.test(label);
}
