# Bisou design system

The default follows direction A, the left-hand design in [the reference board](design/reference-ab.webp): subtle fabric, cream surfaces, peach controls and wool illustrations. New users start with Soft fabric, a linen background, Peach in light mode and Cocoa in dark mode. System mode follows OS changes.

Colour palette, visual style and background remain independent. Settings are stored locally under `bisou.theme`; existing choices are preserved. Journal, Sticker and all four Catppuccin palettes remain available.

## Tokens and extension

Add one entry to `src/client/theme/palettes.json` to add a theme. Copy an existing block, give it a unique key, set `label` and `kind` (`light` or `dark`), and replace its `tokens`. All token keys are required. The picker reads the same file as the Vite plugin, which emits CSS and a pre-paint script in the HTML head. Components and `index.html` need no edits. Restart Vite after changing the palette file.

Peach and Cocoa supply the warm colours from direction A. The four original palettes follow [Catppuccin](https://catppuccin.com/palette): `background` uses mantle, `card` and `popover` use base, `foreground` uses text, primary uses pink and secondary uses mauve. Peach buttons use cocoa text for contrast. Status colours add `success`, `warning` and `info` with matching foreground tokens to shadcn's semantic tokens. `styles.css` maps them to Tailwind utilities.

`theme/personalities.css` owns typography, radii, borders, shadows, press feedback and photo treatments:

| Style | Body / headings | Treatment |
| --- | --- | --- |
| Journal | Be Vietnam Pro / Lora | Small corners, serif headings, taped photo prints |
| Soft fabric (`soft`) | Nunito / Nunito | Fine fabric on cards, soft layered shadows, padded controls, small press movement |
| Sticker | Be Vietnam Pro / Baloo 2 | Thick outlines, hard shadows, spring easing |

Soft fabric uses `--surface-highlight`, `--surface-shade`, `--material-wash`, `--shadow-rest` and `--shadow-rest-sm` for material and depth. Dark mode reduces the highlight and weave intensity. Inputs keep a visible outline; the decorative card edge can stay lighter. Fonts are self-hosted with Vietnamese, Latin and Latin Extended subsets, including in the PWA cache. Reduced-motion preferences disable transitions, animated effects and confetti.

`theme/backgrounds.css` supplies linen, plain, paper, dots and hearts. Linen is a low-opacity raster weave, blended with the current background; other patterns use theme colours through masks. Card material belongs to the style and stays independent of the page background. The reserved `photo` CSS treatment accepts `--bg-photo: url(...)` and applies a scrim. Upload, storage and a photo picker are not implemented; `photo` is intentionally absent from the selectable backgrounds.

`src/client/assets` contains generated WebP assets: the couple (640 × 466, transparent), wish pouch (256 × 256, transparent) and linen tile (512 × 512). Together they weigh about 105 KiB. The couple is a decorative illustration, not a replacement for user profile photos. The production PWA cache includes WebP files; sample journal photography remains dev-only.

## Components

`components/ui` contains the shadcn primitives, with shared personality utilities (`edge`, `elevate`, `press`, `rounded-control`). Keep the `shadcn/tailwind.css` import: it defines state variants used by the Radix components. Regenerating primitives can overwrite these adaptations.

`components/bisou` composes those primitives into AppShell, PageHeader, DaysCounter, CoupleAvatars, EntryCard, PhotoGrid, MilestoneItem, WishCard, WishTeaser, SpinCard, PairCodeDisplay, Celebration, OtpInput and SettingsSheet. WishTeaser accepts an `onOpen` handler. DaysCounter uses the couple illustration and compact dates; two-photo entries use landscape thumbnails. AppShell's tab bar is optional until destinations exist. Login and the current profile Home use these shared components while retaining the existing authentication and profile API.

OtpInput draws boxes over one native input for paste, keyboard use and iOS one-time-code autofill. The caller sanitizes the text and submits it. SpinCard uses local fixture wishes for previews; a real partner's wish jar must stay on the server. Claiming, journal editing and wish creation in the gallery do not persist anything.

## Preview and checks

Run `pnpm dev`, then open `/design`. The gallery includes three phone previews, semantic tokens with contrast ratios, primitive states and Bisou components. Query parameters can open an individual screen, for example:

`/design?style=soft&theme=peach&bg=linen&lang=vi&screen=home`

Styles: `journal`, `soft`, `sticker`. Screens: `home`, `journal`, `wishes`. Language: `vi` or `en`. Query choices also update local preferences, so the real app can be previewed with the same appearance.

Run `pnpm typecheck`, `pnpm test`, then `pnpm build`. The Node tests cover corrupt preferences, preserved choices, mode resolution, pre-paint consistency, text and control contrast, compact dates, calendar-day counts across DST and anniversary boundaries. The `/design` import is gated by `import.meta.env.DEV`; production omits its code and fixture photos. `/design` in production falls through to the normal app.

Verify mobile layout, keyboard focus, settings overlays, paste into OTP, system theme changes and reduced motion in a browser. A real iPhone install and OTP autofill test remain manual.
