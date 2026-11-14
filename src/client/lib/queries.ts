import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { RelationshipLevel } from "../../shared/garden";
import { api } from "../api";
import { apiData } from "./serverQuery";

export const queries = {
  garden: queryOptions({ queryKey: ["garden"], queryFn: () => apiData(api.garden()), staleTime: 15_000, refetchInterval: 15_000 }),
  gardenDeck: (id: string) => queryOptions({ queryKey: ["garden", "deck", id], queryFn: () => apiData(api.gardenDeck(id)), staleTime: 15_000, refetchInterval: 15_000 }),
  gardenStage: (id: RelationshipLevel) => queryOptions({ queryKey: ["garden", "stage", id], queryFn: () => apiData(api.gardenStage(id)), staleTime: 15_000, refetchInterval: 15_000 }),
  gardenDecisions: (id: RelationshipLevel) => queryOptions({ queryKey: ["garden", "decisions", id], queryFn: () => apiData(api.gardenStageDecisions(id)), staleTime: 15_000, refetchInterval: 15_000 }),
  gardenStars: queryOptions({ queryKey: ["garden", "stars"], queryFn: () => apiData(api.gardenStars()) }),
  wishes: queryOptions({ queryKey: ["wishes"], queryFn: () => apiData(api.wishes()) }),
  notes: queryOptions({ queryKey: ["notes"], queryFn: () => apiData(api.notes()) }),
  claims: queryOptions({ queryKey: ["claims"], queryFn: () => apiData(api.claims()) }),
  boxes: queryOptions({ queryKey: ["boxes"], queryFn: () => apiData(api.boxes()), staleTime: 60_000 }),
  box: (id: string) => queryOptions({ queryKey: ["boxes", id], queryFn: () => apiData(api.box(id)), staleTime: 60_000 }),
  journal: infiniteQueryOptions({
    queryKey: ["journal"], initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => apiData(api.journal(pageParam)),
    getNextPageParam: page => page.nextCursor ?? undefined,
  }),
};
