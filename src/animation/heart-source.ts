/// <reference types="vite/client" />
// The reference PNG ships with the repo. Vite inlines it so the injected app:// page can
// sample it before drawing ASCII; if someone deletes the file the build still succeeds and
// heart mode reports the missing reference instead of rendering.
const sources = import.meta.glob("../../references/heart-reference.png", { eager: true, query: "?inline", import: "default" });
export const HEART_SOURCE_URL = (Object.values(sources)[0] as string | undefined) ?? "";
