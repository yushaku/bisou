import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { RelationshipLevel } from "../../shared/garden";
import { api } from "../api";
import { apiData } from "./serverQuery";

export const queries = {
  push: queryOptions({ queryKey: ["push"], queryFn: () => apiData(api.push()) }),
  garden: queryOptions({ queryKey: ["garden"], queryFn: () => apiData(api.garden()) }),
  gardenDeck: (id: string) =>
    queryOptions({ queryKey: ["garden", "deck", id], queryFn: () => apiData(api.gardenDeck(id)) }),
  gardenStage: (id: RelationshipLevel) =>
    queryOptions({ queryKey: ["garden", "stage", id], queryFn: () => apiData(api.gardenStage(id)) }),
  gardenDecisions: (id: RelationshipLevel) =>
    queryOptions({ queryKey: ["garden", "decisions", id], queryFn: () => apiData(api.gardenStageDecisions(id)) }),
  gardenStars: queryOptions({ queryKey: ["garden", "stars"], queryFn: () => apiData(api.gardenStars()) }),
  wishes: queryOptions({ queryKey: ["wishes"], queryFn: () => apiData(api.wishes()) }),
  notes: queryOptions({ queryKey: ["notes"], queryFn: () => apiData(api.notes()) }),
  claims: queryOptions({ queryKey: ["claims"], queryFn: () => apiData(api.claims()) }),
  boxes: queryOptions({ queryKey: ["boxes"], queryFn: () => apiData(api.boxes()) }),
  box: (id: string) => queryOptions({ queryKey: ["boxes", id], queryFn: () => apiData(api.box(id)) }),
  journalEntry: (id: string) =>
    queryOptions({ queryKey: ["journal", "entry", id], queryFn: () => apiData(api.journalEntry(id)) }),
  journalComments: (id: string) =>
    queryOptions({
      queryKey: ["journal", "comments", id],
      queryFn: () => apiData(api.journalComments(id)),
      refetchOnMount: "always",
    }),
  journal: infiniteQueryOptions({
    queryKey: ["journal"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => apiData(api.journal(pageParam)),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  }),
};
