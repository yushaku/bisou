import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { MoneyInput } from "../src/client/components/bisou/MoneyInput";
import { WishSheet } from "../src/client/components/bisou/WishSheet";
import { api } from "../src/client/api";

vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (value: unknown) => [value, vi.fn()], useId: () => "test", useRef: () => ({ current: null }),
}));
vi.mock("../src/client/i18n", () => ({ useI18n: () => ({ locale: "vi", t: (key: string) => key }) }));
vi.mock("../src/client/components/bisou/useUploadQueue", () => ({ useUploadQueue: () => ({ items: [], saved: vi.fn() }) }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("Delete at position zero leaves the caret at zero after regrouping", () => {
  const element = MoneyInput({ value: "1.250.000", onValueChange: vi.fn() });
  const input = { value: "250.000", selectionStart: 0, setSelectionRange: vi.fn() };
  element.props.ref.current = input;
  vi.stubGlobal("document", { activeElement: input });
  vi.stubGlobal("requestAnimationFrame", (fn: () => void) => fn());
  element.props.onChange({ currentTarget: input });
  expect(input.setSelectionRange).toHaveBeenCalledWith(0, 0);
});

it("WishSheet submits zero price as null", async () => {
  const create = vi.spyOn(api, "createWish").mockResolvedValue({ ok: false, status: 0, error: null });
  const tree = WishSheet({ wish: { title: "A book", price: 0 } as never, onClose: vi.fn(), onSaved: vi.fn(), onSignedOut: vi.fn() });
  const update = vi.spyOn(api, "updateWish").mockResolvedValue({ ok: false, status: 0, error: null });
  function findForm(node: ReactNode): ReactElement<{ onSubmit: (event: unknown) => void }> | undefined {
    if (Array.isArray(node)) return node.map(findForm).find(Boolean);
    if (!isValidElement<{ children?: ReactNode }>(node)) return;
    if (node.type === "form") return node as ReactElement<{ onSubmit: (event: unknown) => void }>;
    return findForm(node.props.children);
  }
  findForm(tree)!.props.onSubmit({ preventDefault: vi.fn() });
  await Promise.resolve();
  expect(update).toHaveBeenCalledWith(undefined, expect.objectContaining({ price: null }));
  expect(create).not.toHaveBeenCalled();
});

it.each(["1.250.000,50", "1,250,000.00", "1.250.000 d"])("MoneyInput pastes %s as whole VND", (raw) => {
  const onValueChange = vi.fn();
  const element = MoneyInput({ value: "0", onValueChange });
  element.props.onPaste({ preventDefault: vi.fn(), clipboardData: { getData: () => raw }, currentTarget: { value: "0", selectionStart: 0, selectionEnd: 1 } });
  expect(onValueChange).toHaveBeenCalledWith("1.250.000");
});
it("deleting a digit inside a thousands group does not drop the rest as cents", () => {
  const onValueChange = vi.fn();
  const element = MoneyInput({ value: "1.250", onValueChange });
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  element.props.onChange({ currentTarget: { value: "1.25", selectionStart: 4 } });
  expect(onValueChange).toHaveBeenCalledWith("125");
});
