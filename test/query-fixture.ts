import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import type { CardBoxSummary } from "../src/shared/cardBox";
import type { Claim, JournalPage, NoteLists, Wish } from "../src/shared/types";
import { createTabMemory } from "../src/client/lib/tabMemory";

export const testQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000, gcTime: Infinity }, mutations: { retry: false } },
});
export const flushQueryWork = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// Existing render fixtures seed server data here; TabMemory in the app contains only UI state.
export function createQueryFixture() {
  testQueryClient.clear();
  return {
    ...createTabMemory(),
    get notes(): NoteLists | null {
      return testQueryClient.getQueryData(["notes"]) ?? null;
    },
    set notes(data: NoteLists | null) {
      testQueryClient.setQueryData(["notes"], data);
    },
    get wishes(): { open: Wish[]; received: Wish[]; partnerJarEmpty: boolean } | null {
      return testQueryClient.getQueryData(["wishes"]) ?? null;
    },
    set wishes(data: { open: Wish[]; received: Wish[]; partnerJarEmpty: boolean } | null) {
      testQueryClient.setQueryData(["wishes"], data);
    },
    get boxes(): CardBoxSummary[] | null {
      return testQueryClient.getQueryData<{ boxes: CardBoxSummary[] }>(["boxes"])?.boxes ?? null;
    },
    set boxes(boxes: CardBoxSummary[] | null) {
      testQueryClient.setQueryData(["boxes"], boxes ? { boxes } : null);
    },
    get claims(): Claim[] | null {
      return testQueryClient.getQueryData<{ claims: Claim[] }>(["claims"])?.claims ?? null;
    },
    set claims(claims: Claim[] | null) {
      testQueryClient.setQueryData(["claims"], claims ? { claims } : null);
    },
    get journal(): JournalPage | null {
      return testQueryClient.getQueryData<InfiniteData<JournalPage>>(["journal"])?.pages[0] ?? null;
    },
    set journal(page: JournalPage | null) {
      testQueryClient.setQueryData(["journal"], page ? { pages: [page], pageParams: [undefined] } : null);
    },
  };
}
