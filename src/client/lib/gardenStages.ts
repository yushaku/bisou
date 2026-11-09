import { levelRank, type GardenLevels, type RelationshipLevel } from "../../shared/garden";
import type { MessageKey } from "../i18n";

export type GardenStageState = "current" | "opened" | "locked" | "proposed" | "chosen" | "unplaced";

export const GARDEN_STAGE_LABEL: Record<GardenStageState, MessageKey> = {
  current: "garden.islandCurrent",
  opened: "garden.islandOpened",
  locked: "garden.islandLocked",
  proposed: "garden.islandProposed",
  chosen: "garden.islandChosen",
  unplaced: "garden.islandUnplaced",
};

export function gardenStageState(levelId: RelationshipLevel, levels: GardenLevels): GardenStageState {
  if (levels.proposal?.levelId === levelId) return levels.proposal.agreed ? "chosen" : "proposed";
  if (!levels.placementComplete) return "unplaced";
  if (levels.selectedLevelId === levelId) return "current";
  const furthest = levels.furthestLevelId ? levelRank(levels.furthestLevelId) : -1;
  return levelRank(levelId) <= furthest ? "opened" : "locked";
}
