# Direction A review

final result: passed

Reviewed on 2026-11-05 against the user's selected left-hand design, “Vải mềm tinh tế”. No actionable P0, P1 or P2 findings remain for this design-system change.

## Evidence and scope

- Source visual: [reference board](docs/design/reference-ab.webp), 1536 × 1024 pixels. Only the left app is the target; the surrounding board and right variant are excluded from the comparison.
- Rendered route: `/design?style=soft&theme=peach&bg=linen&lang=vi&screen=home`.
- Final browser captures: [light, top](docs/design/home-light.png), [light, scrolled](docs/design/home-light-scrolled.png), [dark](docs/design/home-dark.png), [English](docs/design/home-en.png), [Login](docs/design/login.png).
- Light, dark and Login captures are 390 × 780 CSS pixels, device scale 1, with matching image dimensions. English is 360 × 780 at scale 1. The source is a concept board with an approximately 530 × 938 app region, so composition was compared at equivalent widths, without stretching the board or claiming a pixel-exact match.
- The source board and rendered screenshots were opened together in the same visual input, including a separate bottom-of-page view for the wish card and navigation. Text, card edges and illustration detail were readable at that size; additional magnified crops were unnecessary.
- Layout was also checked at 390 × 844 in both colours, 320 × 780 in English, and 1440 × 900 for the gallery. No document-wide horizontal overflow. At 390 × 844 the last Home card ends at y=777 and navigation starts at y=779. Smaller screens scroll to the wish card while keeping navigation available.
- Capture limitation: the embedded browser sometimes repeated pixels below its visible host surface when capturing 844px height. Those captures were rejected. The saved 780px captures and DOM bounds at 844px are the evidence used here.

The selected design establishes the visual direction. The real signed-in Home remains the existing profile screen, styled through shared components. Journal and wish interactions in `/design` still use fixtures.

## Comparison history

1. P2: the first rendered couple was too small and the wish card sat partly behind the tab bar at 390 × 844. Increased the illustration, changed paired photos to landscape thumbnails, and reduced section and bottom spacing. A second browser capture showed the full wish action above navigation.
2. P2: the long English start date ran into the illustration at 360px. Added a locale-aware numeric date format, used it in DaysCounter and EntryCard, and tested both locales across two timezones. The final English capture shows a clear gap between the date and illustration.
3. P2: Card's first-image treatment removed top padding from the horizontal wish teaser. Wrapped the decorative image to retain even padding and adjusted Home spacing. The final scrolled capture shows the pouch centered inside the card. The illustration also has a height and width cap so it stays inside wider gallery cards; browser bounds confirmed this at 1440px.
4. Reopened the final source and captures together after those fixes. No further blocking differences found.

## Fidelity review

| Surface | Result |
| --- | --- |
| Typography | Nunito retains the rounded, bold headings of A. Vietnamese accents render correctly. Body copy stays 16px, secondary dates 14px; long anniversary copy can wrap. |
| Layout and spacing | The greeting, illustrated counter, recent entry, wish teaser and bottom tabs keep the source hierarchy. Rounded cards and shallow shadows replace the former flat Soft treatment. |
| Colour and material | Peach uses warm cream, coral and cocoa text. Fine linen is subdued behind content. Cocoa reduces highlights and texture intensity. All six palettes pass text contrast at 4.5:1 and input/focus checks at 3:1 for the tested token pairs. |
| Images | Generated transparent WebP illustrations preserve the wool/clay direction. The linen tile is a raster asset. Images load without opaque backplates; size caps avoid clipping. Existing licensed journal photos are retained. |
| Copy and content | The greeting and short entry match the concept. The anniversary footer retains the actual computed date and remaining days. Dates use localized numeric formatting. Fixture names remain Vietnamese. |

Intentional differences: existing Bisou branding and Lucide navigation icons are retained; missing profile photos use initials. Peach controls use dark text for contrast. The app uses real journal photography rather than reproducing the generated board's photos. A narrower viewport may require scrolling; content is not reduced below readable sizes to fit the concept board.

## Interaction and verification

- Opened and closed Settings using keyboard controls; changed all six palettes, all five backgrounds and all three styles. Theme and background choices remained independent.
- Switched system colour preference and verified the selected light/dark palette followed it. Reduced motion set the press duration to zero.
- Activated “Mở hũ” and verified the wishes screen opened. The existing sample actions remain previews without persistence.
- Checked Login's disabled empty-submit state and invalid-email response, including visible error text and `aria-invalid`.
- Browser console showed Vite connection messages and React development information; no application JavaScript errors were observed during these checks.
- `pnpm typecheck`, `pnpm test` (32 API tests and 7 design-system tests), and `pnpm build` pass. Production asset inspection confirms the gallery and journal fixtures are excluded, while the couple and linen assets are precached.

## Remaining checks

Real iPhone installation, safe-area behaviour with the system keyboard, OTP autofill and screen-reader use remain manual. No deployment or remote database changes were made. Full journal and wish persistence is outside this visual change.
