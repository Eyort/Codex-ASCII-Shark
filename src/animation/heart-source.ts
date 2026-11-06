/// <reference types="vite/client" />
// The reference PNG stays local and git-ignored. When it exists, Vite inlines it so the
// injected app:// page can sample it before drawing ASCII; a fresh clone without the file
// still builds, and heart mode then reports the missing reference instead of rendering.
const sources = import.meta.glob("../../references/heart-reference.png", { eager: true, query: "?inline", import: "default" });
export const HEART_SOURCE_URL = (Object.values(sources)[0] as string | undefined) ?? "";
