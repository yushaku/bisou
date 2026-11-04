# Bisou design system

The app uses three independent choices: colour palette, visual style and background. Settings are stored locally under `bisou.theme`. Light mode uses Latte; dark mode defaults to Frappé and can use Macchiato or Mocha. System mode follows OS changes while retaining the chosen light and dark palettes.

## Tokens and extension

Add one entry to `src/client/theme/palettes.json` to add a theme. Copy an existing block, give it a unique key, set `label` and `kind` (`light` or `dark`), and replace its `tokens`. All token keys are required. The picker reads the same file as the Vite plugin, which emits CSS and a pre-paint script in the HTML head. Components and `index.html` need no edits. Restart Vite after changing the palette file.

The starting colours follow [Catppuccin](https://catppuccin.com/palette). `background` uses mantle, `card` and `popover` use base, `foreground` uses text, primary uses pink and secondary uses mauve. Filled primary controls in Latte use dark text to meet contrast requirements. Status colours add `success`, `warning` and `info` with matching foreground tokens to shadcn's semantic tokens. `styles.css` maps them to Tailwind utilities.

`theme/personalities.css` owns typography, radii, borders, shadows, press feedback and photo treatments:

| Style | Body / headings | Treatment |
| --- | --- | --- |
| Journal | Be Vietnam Pro / Lora | Small corners, serif headings, taped photo prints |
| Soft | Nunito / Nunito | Rounded controls and cards, gentle press scaling |
| Sticker | Be Vietnam Pro / Baloo 2 | Thick outlines, hard shadows, spring easing |

Fonts are self-hosted with Vietnamese, Latin and Latin Extended subsets, including in the PWA cache. Reduced-motion preferences disable transitions, animated effects and confetti.

`theme/backgrounds.css` supplies plain, paper, dots and hearts. Patterns use theme colours through masks. The reserved `photo` CSS treatment accepts `--bg-photo: url(...)` and applies a scrim. Upload, storage and a photo picker are not implemented; `photo` is intentionally absent from the selectable backgrounds.

## Components

`components/ui` contains the shadcn primitives, with shared personality utilities (`edge`, `elevate`, `press`, `rounded-control`). Keep the `shadcn/tailwind.css` import: it defines state variants used by the Radix components. Regenerating primitives can overwrite these adaptations.

`components/bisou` composes those primitives into AppShell, PageHeader, DaysCounter, CoupleAvatars, EntryCard, PhotoGrid, MilestoneItem, WishCard, SpinCard, PairCodeDisplay, Celebration, OtpInput and SettingsSheet. AppShell's tab bar is optional until destinations exist. Login and the current profile Home use these shared components while retaining the existing authentication and profile API.

OtpInput draws boxes over one native input for paste, keyboard use and iOS one-time-code autofill. The caller sanitizes the text and submits it. SpinCard uses local fixture wishes for previews; a real partner's wish jar must stay on the server. Claiming, journal editing and wish creation in the gallery do not persist anything.

## Preview and checks

Run `pnpm dev`, then open `/design`. The gallery includes three phone previews, semantic tokens with contrast ratios, primitive states and Bisou components. Query parameters can open an individual screen, for example:

`/design?style=journal&theme=latte&bg=paper&lang=vi&screen=home`

Styles: `journal`, `soft`, `sticker`. Screens: `home`, `journal`, `wishes`. Language: `vi` or `en`. Query choices also update local preferences, so the real app can be previewed with the same appearance.

Run `pnpm typecheck`, `pnpm test`, then `pnpm build`. The Node tests cover corrupt preferences, mode resolution, pre-paint consistency, palette contrast, calendar-day counts across DST and anniversary boundaries. The `/design` import is gated by `import.meta.env.DEV`; production omits its code and fixture photos. `/design` in production falls through to the normal app.

Verify mobile layout, keyboard focus, settings overlays, paste into OTP, system theme changes and reduced motion in a browser. A real iPhone install and OTP autofill test remain manual.
