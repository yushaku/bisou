import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { PhotoPicker } from "../src/client/components/bisou/PhotoPicker";
import { toast } from "../src/client/components/ui/ding-toaster";
import type { QueuedPhoto, useUploadQueue } from "../src/client/components/bisou/useUploadQueue";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0, effects: [] as (() => void | (() => void))[] }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useId: () => "picker-toast",
  useRef: (initial: unknown) => {
    const index = hooks.index++;
    return hooks.values[index] ??= { current: initial };
  },
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [hooks.values[index], (value: unknown) => { hooks.values[index] = value; }];
  },
  useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); },
}));
vi.mock("../src/client/i18n", () => ({ useI18n: () => ({ t: (key: string, vars?: Record<string, unknown>) => vars ? `${key} ${JSON.stringify(vars)}` : key }) }));
vi.mock("../src/client/components/ui/ding-toaster", () => ({ toast: { loading: vi.fn(), update: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn(), dismiss: vi.fn() } }));
vi.mock("../src/client/components/bisou/PhotoCropDialog", () => ({ PhotoCropDialog: () => null }));
vi.mock("../src/client/lib/photo", () => ({ decodePhoto: vi.fn().mockRejectedValue(new Error("unreadable")), renderSquare: vi.fn() }));
afterEach(() => { hooks.values = []; hooks.effects = []; hooks.index = 0; vi.clearAllMocks(); });

type Props = { children?: ReactNode; role?: string; onClick?: () => void; onChange?: (event: { target: { files: File[]; value: string } }) => void; type?: string; "aria-label"?: string };
function elements(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...elements(node.props.children)];
}
function queue(items: QueuedPhoto[] = []): ReturnType<typeof useUploadQueue> {
  return { items, add: vi.fn(), remove: vi.fn(), retry: vi.fn(), saved: vi.fn() };
}
function photo(localId: string, state: QueuedPhoto["state"], progress = 0): QueuedPhoto {
  return { localId, state, progress, previewUrl: localId };
}
function render(uploads: ReturnType<typeof useUploadQueue>, max = 4) {
  hooks.index = 0;
  const nodes = elements(PhotoPicker({ queue: uploads, max, saving: false, onChange: vi.fn() }));
  const cleanups = hooks.effects.splice(0).map((effect) => effect());
  return { nodes, unmount: () => cleanups.forEach((cleanup) => cleanup?.()) };
}

it("updates one queue toast with overall progress, excludes existing photos and finishes with success", () => {
  const uploads = queue([photo("existing", "done", 1), photo("a", "uploading", 0.5), photo("b", "queued")]);
  const first = render(uploads);
  expect(first.nodes.some((node) => node.props.role === "progressbar")).toBe(false);
  expect(toast.loading).toHaveBeenCalledWith('compose.uploadProgress {"index":1,"total":2}', expect.objectContaining({ id: "picker-toast", progress: 0.25 }));
  uploads.items = [photo("existing", "done", 1), photo("a", "done", 1), photo("b", "uploading", 0.5)];
  render(uploads);
  expect(toast.loading).toHaveBeenLastCalledWith('compose.uploadProgress {"index":2,"total":2}', { id: "picker-toast", progress: 0.75 });
  uploads.items = uploads.items.map((item) => ({ ...item, state: "done", progress: 1 }));
  render(uploads);
  expect(toast.success).toHaveBeenCalledWith("compose.photosUploaded", { id: "picker-toast" });
});

it("shows upload errors with retry-all and keeps an indexed icon retry on each failed thumbnail", () => {
  const uploads = queue([photo("a", "uploading"), photo("b", "queued")]);
  render(uploads);
  uploads.items = [photo("a", "failed"), { ...photo("b", "failed"), error: "compose.photoRejected" }];
  const { nodes, unmount } = render(uploads);
  expect(toast.error).toHaveBeenCalledWith("compose.photoFailed", expect.objectContaining({ id: "picker-toast", action: expect.objectContaining({ label: "journal.retry" }) }));
  const action = vi.mocked(toast.error).mock.calls.at(-1)![1]!.action!;
  action.onClick();
  expect(vi.mocked(uploads.retry).mock.calls).toEqual([["a"], ["b"]]);
  expect(nodes.some((node) => node.props.children === "compose.photoFailed")).toBe(false);
  expect(nodes.find((node) => node.props["aria-label"] === 'compose.retryPhoto {"index":2}')).toBeDefined();
  unmount();
  expect(toast.dismiss).toHaveBeenCalledWith("picker-toast");
});

it("warns when the wish photo limit is reached without an inline alert", () => {
  const { nodes } = render(queue([photo("existing", "done", 1)]), 1);
  nodes.find((node) => node.props.children && Array.isArray(node.props.children) && node.props.children.includes("compose.add"))!.props.onClick!();
  expect(toast.warning).toHaveBeenCalledWith("wish.photoLimit");
  expect(nodes.some((node) => node.props.role === "alert")).toBe(false);
});

it("shows preparing and unreadable-photo toasts, then clears loading on completion and unmount", async () => {
  const uploads = queue();
  const { nodes } = render(uploads);
  nodes.find((node) => node.props.type === "file")!.props.onChange!({ target: { files: [new File(["bad"], "bad.jpg")], value: "" } });
  const { unmount } = render(uploads);
  expect(toast.loading).toHaveBeenCalledWith("compose.preparing", { id: "picker-toast" });
  await Promise.resolve();
  expect(toast.error).toHaveBeenCalledWith('compose.photoUnreadable {"name":"bad.jpg"}');
  render(uploads);
  expect(toast.dismiss).toHaveBeenCalledWith("picker-toast");
  unmount();
});

it("dismisses an upload still in flight when the picker unmounts", () => {
  const { unmount } = render(queue([photo("a", "uploading", 0.2)]));
  expect(toast.loading).toHaveBeenCalled();
  unmount();
  expect(toast.dismiss).toHaveBeenCalledWith("picker-toast");
});

it("retry-all uses the current failures after a failed photo is removed", () => {
  const uploads = queue([photo("a", "uploading"), photo("b", "uploading")]);
  render(uploads);
  uploads.items = [photo("a", "failed"), photo("b", "failed")];
  render(uploads);
  const action = vi.mocked(toast.error).mock.calls.at(-1)![1]!.action!;
  uploads.items = [photo("b", "failed")];
  render(uploads);
  action.onClick();
  expect(vi.mocked(uploads.retry).mock.calls).toEqual([["b"]]);
});
