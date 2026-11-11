import { Toaster as Ding, toast as ding } from "@yusufceng1z/ding-react"
import { useTheme } from "@/theme/ThemeProvider"

// Ding has no global duration; ding keeps errors open until dismissed.
const DURATION = 3500
type Options = Parameters<typeof ding.success>[1]
const withDuration = (show: typeof ding.success) => (title: string, options?: Options) =>
  show(title, { duration: DURATION, ...options })

export const toast: typeof ding = {
  ...ding,
  success: withDuration(ding.success),
  info: withDuration(ding.info),
  warning: withDuration(ding.warning),
}

// Ding keeps the safe-area inset on top-center itself; colors come from the --tst-* map in styles.css.
export function Toaster() {
  const { kind } = useTheme()
  return <Ding position="top-center" theme={kind} />
}
