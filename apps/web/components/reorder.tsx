"use client";

import { useState } from "react";
import { ActionIcon } from "@/components/icons";

type Held = {
  list: string;
  from: number;
  to: number;
  dx: number;
  dy: number;
  across: boolean;
  step: number;
};

export type Dragging = {
  start: (list: string, index: number, event: React.PointerEvent) => void;
  style: (list: string, index: number) => React.CSSProperties;
  held: Held | null;
};

export function move(ids: string[], from: number, to: number): string[] {
  const out = [...ids];
  const [one] = out.splice(from, 1);
  out.splice(to, 0, one);
  return out;
}

function boxes(list: string): DOMRect[] {
  return [...document.querySelectorAll(`[data-drag="${list}"]`)].map((node) =>
    node.getBoundingClientRect(),
  );
}

export function useDragList(
  onMove: (list: string, from: number, to: number) => void,
): Dragging {
  const [held, setHeld] = useState<Held | null>(null);

  function start(list: string, index: number, event: React.PointerEvent) {
    const rects = boxes(list);
    if (rects.length < 2) return;
    event.preventDefault();

    const first = rects[0];
    const last = rects[rects.length - 1];
    const across = Math.abs(last.left - first.left) > Math.abs(last.top - first.top);
    const size = across ? first.width : first.height;
    const gap =
      rects.length > 1
        ? (across ? rects[1].left - first.left : rects[1].top - first.top) - size
        : 0;
    const step = size + Math.max(0, gap);

    const originX = event.clientX;
    const originY = event.clientY;
    let to = index;

    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    function onMoveAt(at: PointerEvent) {
      const dx = at.clientX - originX;
      const dy = at.clientY - originY;
      const shift = Math.round((across ? dx : dy) / step);
      to = Math.min(rects.length - 1, Math.max(0, index + shift));
      setHeld({ list, from: index, to, dx, dy, across, step });
    }

    function done() {
      target.releasePointerCapture(event.pointerId);
      window.removeEventListener("pointermove", onMoveAt);
      window.removeEventListener("pointerup", done);
      window.removeEventListener("pointercancel", done);
      setHeld(null);
      if (to !== index) onMove(list, index, to);
    }

    window.addEventListener("pointermove", onMoveAt);
    window.addEventListener("pointerup", done);
    window.addEventListener("pointercancel", done);
    setHeld({ list, from: index, to: index, dx: 0, dy: 0, across, step });
  }

  function style(list: string, index: number): React.CSSProperties {
    if (!held || held.list !== list) return {};

    if (index === held.from) {
      return {
        transform: `translate3d(${held.across ? held.dx : 0}px, ${
          held.across ? 0 : held.dy
        }px, 0)`,
        zIndex: 20,
        position: "relative",
        transition: "none",
        cursor: "grabbing",
        boxShadow: "0 8px 20px rgb(22 32 46 / 0.12)",
        borderRadius: "1rem",
      };
    }

    const after = index > held.from && index <= held.to;
    const before = index < held.from && index >= held.to;
    const slide = after ? -held.step : before ? held.step : 0;

    return {
      transform: `translate3d(${held.across ? slide : 0}px, ${
        held.across ? 0 : slide
      }px, 0)`,
      transition: "transform 160ms ease",
    };
  }

  return { start, style, held };
}

export function DragHandle({
  label,
  list,
  index,
  drag,
  className = "",
}: {
  label: string;
  list: string;
  index: number;
  drag: Dragging;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-reorder={label}
      title="Hold and drag to reorder"
      onPointerDown={(event) => drag.start(list, index, event)}
      className={`touch-none cursor-grab rounded-lg p-1 text-ink-faint transition-colors hover:bg-surface hover:text-ink active:cursor-grabbing ${className}`}
    >
      <ActionIcon name="grip" />
    </span>
  );
}
