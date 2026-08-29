import { describe, it, expect, beforeEach, vi } from "vitest";
import { toast, subscribeToasts, type ToastItem } from "./toast";

describe("toast", () => {
  beforeEach(() => {
    toast.clear();
  });

  it("subscribe delivers the current snapshot immediately", () => {
    toast.success("first");
    const seen: ToastItem[][] = [];
    const unsub = subscribeToasts((items) => seen.push(items));
    expect(seen).toHaveLength(1);
    expect(seen[0]).toHaveLength(1);
    expect(seen[0][0].message).toBe("first");
    unsub();
  });

  it("each variant emits an item with the right variant + default 4s duration", () => {
    const captured: ToastItem[][] = [];
    const unsub = subscribeToasts((items) => captured.push(items));
    toast.success("s");
    toast.warning("w");
    toast.error("e");
    toast.info("i");
    const latest = captured[captured.length - 1];
    expect(latest.map((t) => t.variant)).toEqual(["success", "warning", "error", "info"]);
    expect(latest.every((t) => t.duration === 4000)).toBe(true);
    unsub();
  });

  it("options.duration overrides the default; null disables auto-dismiss", () => {
    toast.info("a", { duration: 1500 });
    toast.info("b", { duration: null });
    const ids: ToastItem[] = [];
    subscribeToasts((items) => ids.splice(0, ids.length, ...items));
    expect(ids[0].duration).toBe(1500);
    expect(ids[1].duration).toBeNull();
  });

  it("important: true forces no auto-dismiss regardless of duration", () => {
    toast.error("boom", { duration: 1000, important: true });
    const items: ToastItem[] = [];
    subscribeToasts((s) => items.splice(0, items.length, ...s));
    expect(items[0].important).toBe(true);
    expect(items[0].duration).toBeNull();
  });

  it("dismiss removes one by id; clear empties", () => {
    const captured: ToastItem[][] = [];
    subscribeToasts((s) => captured.push(s));
    const id1 = toast.success("a");
    toast.error("b");
    toast.dismiss(id1);
    expect(captured[captured.length - 1].map((t) => t.message)).toEqual(["b"]);
    toast.clear();
    expect(captured[captured.length - 1]).toHaveLength(0);
  });

  it("unsubscribe stops further notifications", () => {
    const fn = vi.fn();
    const unsub = subscribeToasts(fn);
    unsub();
    toast.success("ignored");
    // initial snapshot only
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
