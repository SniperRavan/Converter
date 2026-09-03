export interface RectCache {
  readonly current: DOMRect;
  destroy: () => void;
}

export function createRectCache(el: HTMLElement): RectCache {
  let rect = el.getBoundingClientRect();
  const update = () => {
    rect = el.getBoundingClientRect();
  };
  window.addEventListener("resize", update);
  window.addEventListener("scroll", update, { passive: true });
  return {
    get current() {
      return rect;
    },
    destroy() {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    },
  };
}
