# Mascot

## Gate 1 decisions

1. The girl and boy match the faces, hair, sweaters and knitted wool style of the Home couple illustration.
2. Illustrations appear lightly in empty, initial waiting, error and celebration states.
3. Each person chooses on their device in Settings. The choice needs no server field or migration.
4. A registry maps each mascot to empty, waiting, error and celebrate images. New mascots require one registry entry and its image set.
5. Images have transparent backgrounds and contain no text.
6. The eight approved images are used. The girl is the default.
7. Celebrations appear on Home on hundred-day multiples and anniversaries, and after a successful gift box unlock.

## Rules

- R1: Store the mascot preference on this device, retain it through sign out and fall back to the girl for missing or unknown IDs. If storage is unavailable, retain changes for the current session.
- R2: Settings offers a compact, labelled thumbnail picker in Vietnamese and English. Selection applies immediately to mounted illustrations.
- R3: Shared empty and load failure states use the matching illustration. Full-screen initial waiting uses waiting; individual skeleton rows keep their current appearance.
- R4: Home uses celebrate only when the next hundred-day or anniversary milestone is today. A successful gift unlock opens the existing celebration dialog; failed or pending unlocks do not celebrate.
- R5: Illustrations are decorative, lazy loaded, static and contain no text. Existing text and actions carry the meaning. Layouts remain usable at 360px in Peach and Cocoa, including reduced motion.
- R6: Each transparent WebP is 480px wide and below 80 KB. The design page shows all four situations for every mascot.

## Acceptance criteria

- AC1: A fresh device and an unknown stored ID use the girl. Changing to the boy survives sign out on that device; another device retains its own selection.
- AC2: Settings renders the localized picker and selecting a mascot immediately changes illustrations without a network request.
- AC3: Every registry entry includes all four situations. Empty, initial waiting and error states retain their text and actions alongside the illustration.
- AC4: Hundred-day and anniversary dates show celebrate on Home; adjacent ordinary days do not. Gift unlock success celebrates, while failure does not.
- AC5: The design page displays eight illustrations, each asset retains alpha and is below 80 KB, and the picker fits 360px and 390px screens in both themes.
