import { useId } from "react";

export function NoteEnvelope({ address, state, preview }: { address: string; state: { kind: "cooling" | "ready" | "sent" | "waiting" | "opened"; text: string }; preview?: string }) {
  const id = useId();
  const opened = state.kind === "opened", posted = opened || state.kind === "sent" || state.kind === "waiting";
  const body = "M9 39Q159 42 311 38L309 250Q160 247 10 251Z";
  return <span className="note-envelope-item" data-envelope-state={state.kind}>
    <svg className="note-envelope-paper" viewBox="0 0 320 260" aria-hidden="true">
      <defs>
        <filter id={`${id}-ink`} x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="8" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" /></filter>
        <filter id={`${id}-grain`}><feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="3" seed="12" /><feColorMatrix type="saturate" values="0" /><feBlend in="SourceGraphic" mode="multiply" /></filter>
        <clipPath id={`${id}-paper`}><path d={body} /></clipPath>
        <linearGradient id={`${id}-wash`} x2=".6" y2="1"><stop stopColor="var(--envelope-paper)" /><stop offset=".6" stopColor="var(--envelope-paper)" /><stop offset="1" stopColor="var(--envelope-shade)" /></linearGradient>
        <radialGradient id={`${id}-wax`} cx=".35" cy=".25" r=".8"><stop stopColor="var(--envelope-wax-light)" /><stop offset=".65" stopColor="var(--envelope-wax)" /><stop offset="1" stopColor="var(--envelope-wax-dark)" /></radialGradient>
        <g id={`${id}-seal`}>
          <path d="M-24-9Q-23-24-10-26Q1-31 12-25Q27-24 27-9Q33 2 25 13Q24 28 8 28Q-4 33-16 25Q-29 22-27 8Q-33 0-24-9Z" fill={`url(#${id}-wax)`} stroke="var(--envelope-wax-dark)" strokeWidth="2" />
          <circle r="21" fill="none" stroke="var(--envelope-wax-dark)" strokeWidth="2" />
          <path d="M0 13C-27-4-8-20 0-8C9-21 26-3 0 13Z" fill="none" stroke="var(--envelope-wax-dark)" strokeWidth="3" />
          <path d="M-16 9Q-19 0-15-8M15 13Q21 3 17-7" fill="none" stroke="var(--envelope-wax-light)" strokeWidth="2" />
        </g>
        <clipPath id={`${id}-left`}><path d="M-35-35H0L-5-12 4-3-4 6 0 35H-35Z" /></clipPath>
        <clipPath id={`${id}-right`}><path d="M35-35H5L0-12 9-3 1 6 5 35H35Z" /></clipPath>
      </defs>
      <g stroke="var(--envelope-ink)" strokeWidth="2" strokeLinejoin="round" filter={`url(#${id}-ink)`}>
        {opened && <><path d="M10 44Q77-5 160 9Q243-3 310 43L160 147Z" fill="var(--envelope-shade)" /><path d="M27 60 34 29 286 31 294 66" fill="var(--envelope-paper)" /><path d="M55 42 265 44M62 51 248 53" opacity=".2" /></>}
        <path d={body} fill={`url(#${id}-wash)`} />
        <g clipPath={`url(#${id}-paper)`}>
          <path d="M-5 62Q31 114 13 208T170 245M320 64Q269 167 315 220" fill="none" stroke="var(--envelope-shade)" strokeWidth="22" opacity=".45" />
          <path d="M10 39 178 158 309 250M311 38 143 158 10 251" fill="none" />
          <path d="M10 251Q33 207 160 137Q277 207 309 250" fill={`url(#${id}-wash)`} />
          {!opened && <path d="M9 39Q36 95 160 163Q277 99 311 38" fill={`url(#${id}-wash)`} />}
          <path d={body} fill="var(--envelope-shade)" filter={`url(#${id}-grain)`} stroke="none" opacity=".18" />
        </g>
        <path d="M14 45 16 91M14 215 16 245 55 244M266 244 303 245 303 210M304 51 302 89" fill="none" strokeWidth="1" opacity=".65" />
        <g className="note-stamp" transform="translate(232 49) rotate(3)">
          <path d="M0 0q4 5 8 0t8 0t8 0t8 0t8 0v46q-4-5-8 0t-8 0t-8 0t-8 0t-8 0Z" fill="var(--envelope-paper)" strokeWidth="1" />
          <path d="M5 6H35V40H5Z" fill="var(--envelope-stamp)" strokeWidth=".8" />
          <path d="M16 37Q26 21 23 12M21 27Q7 28 12 17Q21 19 21 27M24 21Q35 20 31 12Q23 14 24 21" fill="var(--chart-4)" strokeWidth="1.2" />
          <path d="M23 14Q15 10 20 6Q23 8 24 5Q31 8 23 14Z" fill="var(--envelope-paper)" strokeWidth="1" />
        </g>
        {posted && <g className="note-postmark" fill="none" strokeWidth="1.5" opacity=".8"><path d="M149 67c18-12 32 12 51 0s30-9 43-1M148 76c18-12 32 12 51 0s30-9 43-1M148 85c18-12 32 12 51 0s30-9 43-1" /><path d="M155 58h1m6-2h1m7 1h1M154 94h1m8 2h1m7-1h1" /></g>}
        {opened ? <g data-seal="broken"><g transform="translate(150 151) rotate(-14)" clipPath={`url(#${id}-left)`}><use href={`#${id}-seal`} /></g><g transform="translate(174 165) rotate(17)" clipPath={`url(#${id}-right)`}><use href={`#${id}-seal`} /></g></g> : <g data-seal="intact" transform="translate(160 163)"><use href={`#${id}-seal`} /></g>}
      </g>
      <text className="font-heading" fill="var(--envelope-ink)" x="160" y="225" textAnchor="middle" fontSize="27" textLength={address.length > 18 ? 260 : undefined} lengthAdjust="spacingAndGlyphs">{address}</text>
    </svg>
    <span className="note-envelope-caption"><span className="text-xs font-semibold">{state.text}</span>{preview !== undefined && <span className="block truncate text-xs text-muted-foreground">{preview}</span>}</span>
  </span>;
}
