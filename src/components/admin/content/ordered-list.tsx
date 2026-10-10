"use client";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props<T extends { id: string }> = {
  items: T[];
  onReorder: (ids: string[]) => void;
  render: (item: T) => ReactNode;
  labels: { up: string; down: string };
};

/** Keyboard-friendly reorder with up/down buttons (FAQs, testimonials). */
export function OrderedList<T extends { id: string }>({
  items,
  onReorder,
  render,
  labels,
}: Props<T>) {
  function move(index: number, delta: -1 | 1) {
    const next = items.map((i) => i.id);
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  }
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={item.id} className="flex gap-3 rounded-lg border p-4">
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={labels.up}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUpIcon aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={labels.down}
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDownIcon aria-hidden />
            </Button>
          </div>
          <div className="min-w-0 flex-1">{render(item)}</div>
        </li>
      ))}
    </ul>
  );
}
