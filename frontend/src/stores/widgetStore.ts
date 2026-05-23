import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Widget {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: "kpi",        label: "KPI Cards",          visible: true,  order: 0 },
  { id: "revenue",    label: "Revenue Chart",       visible: true,  order: 1 },
  { id: "activity",   label: "Recent Activity",     visible: true,  order: 2 },
  { id: "quicklinks", label: "Quick Links",         visible: true,  order: 3 },
  { id: "tasks",      label: "Pending Tasks",       visible: true,  order: 4 },
  { id: "overdue",    label: "Overdue Invoices",    visible: true,  order: 5 },
  { id: "lowstock",   label: "Low Stock Alerts",    visible: true,  order: 6 },
  { id: "leads",      label: "Lead Pipeline",       visible: true,  order: 7 },
];

interface WidgetState {
  widgets: Widget[];
  toggleWidget: (id: string) => void;
  moveWidget: (id: string, direction: "up" | "down") => void;
  resetWidgets: () => void;
}

export const useWidgetStore = create<WidgetState>()(
  persist(
    (set) => ({
      widgets: DEFAULT_WIDGETS,

      toggleWidget: (id) => set(s => ({
        widgets: s.widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w),
      })),

      moveWidget: (id, direction) => set(s => {
        const sorted = [...s.widgets].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex(w => w.id === id);
        if (idx < 0) return s;
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= sorted.length) return s;
        const newOrder = sorted[swapIdx].order;
        const oldOrder = sorted[idx].order;
        return {
          widgets: s.widgets.map(w => {
            if (w.id === id) return { ...w, order: newOrder };
            if (w.id === sorted[swapIdx].id) return { ...w, order: oldOrder };
            return w;
          }),
        };
      }),

      resetWidgets: () => set({ widgets: DEFAULT_WIDGETS }),
    }),
    { name: "flowcrm-widgets" }
  )
);
