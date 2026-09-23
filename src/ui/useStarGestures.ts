import { useEffect, useRef } from 'react';

/**
 * Wheel, vertical drag and pinch on an element → integer "steps" (+ = more stars).
 * Wheel modifiers like the original app: Alt ×10, Ctrl/⌘ ×100, Shift ×1000.
 */
export function useStarGestures(ref: React.RefObject<HTMLElement | null>, onSteps: (steps: number, multiplier: number) => void, enabled = true) {
  const cb = useRef(onSteps);
  cb.current = onSteps;
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let wheelAcc = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // one step per mouse notch; trackpads: one step per ~40 px of scrolling
      wheelAcc += e.deltaMode === 1 ? Math.sign(e.deltaY) * 40 : e.deltaY;
      if (Math.abs(wheelAcc) < 40) return;
      const steps = -Math.sign(wheelAcc);
      wheelAcc = 0;
      const mult = e.shiftKey ? 1000 : e.ctrlKey || e.metaKey ? 100 : e.altKey ? 10 : 1;
      cb.current(steps, mult);
    };
    const pointers = new Map<number, { x: number; y: number }>();
    let dragAcc = 0;
    let lastY = 0;
    let pinchDist = 0;
    const DRAG_PX = 26;
    const PINCH_PX = 34;
    const dist = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    // a tap stays a click (tap-to-count); only a real drag captures the pointer and swallows the click
    let startX = 0;
    let startY = 0;
    let dragging = false;
    let swallowClick = false;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        lastY = e.clientY;
        startX = e.clientX;
        startY = e.clientY;
        dragAcc = 0;
        dragging = false;
      } else if (pointers.size === 2) {
        pinchDist = dist();
        dragging = true;
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) > 8) {
        dragging = true;
        swallowClick = true;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      if (!dragging) return;
      if (pointers.size === 1) {
        dragAcc += lastY - e.clientY;
        lastY = e.clientY;
        const steps = Math.trunc(dragAcc / DRAG_PX);
        if (steps !== 0) {
          dragAcc -= steps * DRAG_PX;
          cb.current(steps, 1);
        }
      } else if (pointers.size === 2) {
        const d = dist();
        const diff = d - pinchDist;
        const steps = Math.trunc(diff / PINCH_PX);
        if (steps !== 0) {
          pinchDist += steps * PINCH_PX;
          cb.current(steps, 1);
        }
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 1) {
        const [p] = [...pointers.values()];
        lastY = p!.y;
        dragAcc = 0;
      }
    };
    const onClickCapture = (e: MouseEvent) => {
      if (swallowClick) {
        swallowClick = false;
        e.stopPropagation();
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClickCapture, true);
    return () => {
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [ref, enabled]);
}

/** Press-and-hold auto repeat for ± buttons. */
export function useHoldRepeat(action: () => void) {
  const timer = useRef<number | null>(null);
  const act = useRef(action);
  act.current = action;
  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  const start = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    act.current();
    let delay = 420;
    const tick = () => {
      act.current();
      delay = Math.max(45, delay * 0.82);
      timer.current = window.setTimeout(tick, delay);
    };
    timer.current = window.setTimeout(tick, delay);
  };
  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        act.current();
      }
    },
  };
}
