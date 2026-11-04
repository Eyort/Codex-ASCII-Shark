import type { AnimationMode } from "../config-shared.js";
export type DisposableAnimation = { destroy(): void };

export class AnimationSwitcher {
  private activeMode: AnimationMode | null = null;
  private active: DisposableAnimation | null = null;
  activate(mode: AnimationMode, createEngine: () => DisposableAnimation): DisposableAnimation {
    if (this.activeMode === mode && this.active) return this.active;
    this.dispose();
    this.active = createEngine();
    this.activeMode = mode;
    return this.active;
  }
  dispose(): void {
    this.active?.destroy();
    this.active = null;
    this.activeMode = null;
  }
}
