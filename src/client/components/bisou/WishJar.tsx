import { useId } from "react";
import { useI18n } from "../../i18n";
import type { JarLevel } from "../../lib/wishes";
import { PersonAvatar, type Person } from "./CoupleAvatars";

export function WishJar({ person, level, mine = false, empty = false, onOpen }: {
  person: Person;
  level: JarLevel;
  mine?: boolean;
  empty?: boolean;
  onOpen: () => void;
}) {
  const id = useId();
  const { t } = useI18n();
  return (
    <button type="button" aria-label={t(mine ? "wishes.jarMine" : "wishes.jarPartner", { name: person.name })}
      aria-describedby={empty ? `${id}-empty` : undefined}
      aria-disabled={empty || undefined} onClick={() => { if (!empty) onOpen(); }}
      className="flex min-w-0 flex-col items-center rounded-xl py-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-disabled:cursor-default">
      <span className="w-full break-words font-heading text-lg">{t("wishes.jarTitle", { name: person.name })}</span>
      <span className={`jar-wrap relative block w-35 max-w-full ${empty ? "[&>svg]:opacity-50" : ""}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 160" className="jar block h-40 w-35 max-w-full" data-level={level} aria-hidden="true">
          <defs>
            <path id={`${id}-s`} d="M0-9 2.5-3.5 8.6-2.8 4 1.3 5.3 7.3 0 4.3-5.3 7.3-4 1.3-8.6-2.8-2.5-3.5Z" />
            <path id={`${id}-h`} d="M0 7.3C-7.3 2.6-9.1-1.8-7.8-4.9-6.5-8.1-2.3-8.6 0-4.9 2.3-8.6 6.5-8.1 7.8-4.9 9.1-1.8 7.3 2.6 0 7.3Z" />
            <g id={`${id}-q`}>
              <rect x="-7" y="-7" width="14" height="14" rx="2" />
              <path className="jar-fold" d="M-7 7 7-7" />
            </g>
            <path id={`${id}-k`} d="M0-6C.5-1.4 1.4-.5 6 0 1.4.5.5 1.4 0 6-.5 1.4-1.4.5-6 0-1.4-.5-.5-1.4 0-6Z" />
            <clipPath id={`${id}-clip-a`}>
              <path d="M33 15V28C23 31 15.5 38 15 52L14.3 90 14 126C14 138 20 143.5 31 143.5H89C100 143.5 106 138 106 126L105.6 88 105 52C104.5 38 97 31 87 28V15Z" />
            </clipPath>
          </defs>
          <g transform="translate(10 8)">
            <path className="jar-glass" d="M33 15V28C23 31 15.5 38 15 52L14.3 90 14 126C14 138 20 143.5 31 143.5H89C100 143.5 106 138 106 126L105.6 88 105 52C104.5 38 97 31 87 28V15Z" />
            <g className="jar-pc" clipPath={`url(#${id}-clip-a)`}>
              <g className="jar-l1">
                <use href={`#${id}-h`} className="jar-p2" transform="translate(14 139)rotate(-11)" />
                <use href={`#${id}-q`} className="jar-p4" transform="translate(28 138)rotate(271)" />
                <use href={`#${id}-s`} className="jar-p2" transform="translate(43 137)rotate(294)" />
                <use href={`#${id}-s`} className="jar-p4" transform="translate(57 138)rotate(19)" />
                <use href={`#${id}-h`} className="jar-p3" transform="translate(73 140)rotate(-19)" />
                <use href={`#${id}-s`} className="jar-p5" transform="translate(87 140)rotate(208)" />
                <use href={`#${id}-q`} className="jar-p2" transform="translate(101 137)rotate(301)" />
                <use href={`#${id}-q`} className="jar-p3" transform="translate(17 130)rotate(337)" />
                <use href={`#${id}-q`} className="jar-p3" transform="translate(32 129)rotate(98)" />
                <use href={`#${id}-q`} className="jar-p1" transform="translate(45 128)rotate(327)" />
                <use href={`#${id}-s`} className="jar-p3" transform="translate(59 128)rotate(333)" />
                <use href={`#${id}-q`} className="jar-p3" transform="translate(73 128)rotate(131)" />
                <use href={`#${id}-s`} className="jar-p5" transform="translate(87 129)rotate(84)" />
                <use href={`#${id}-s`} className="jar-p3" transform="translate(102 129)rotate(228)" />
                <use href={`#${id}-q`} className="jar-p2" transform="translate(20 120)rotate(255)" />
                <use href={`#${id}-q`} className="jar-p4" transform="translate(33 122)rotate(141)" />
                <use href={`#${id}-h`} className="jar-p3" transform="translate(46 119)rotate(-21)" />
                <use href={`#${id}-h`} className="jar-p4" transform="translate(59 119)rotate(-14)" />
                <use href={`#${id}-s`} className="jar-p5" transform="translate(73 122)rotate(50)" />
                <use href={`#${id}-h`} className="jar-p4" transform="translate(88 119)rotate(20)" />
                <use href={`#${id}-q`} className="jar-p1" transform="translate(100 120)rotate(27)" />
              </g>
              <g className="jar-l2">
                <use href={`#${id}-s`} className="jar-p2" transform="translate(18 113)rotate(248)" />
                <use href={`#${id}-q`} className="jar-p1" transform="translate(32 111)rotate(322)" />
                <use href={`#${id}-h`} className="jar-p5" transform="translate(44 109)rotate(7)" />
                <use href={`#${id}-q`} className="jar-p3" transform="translate(59 112)rotate(349)" />
                <use href={`#${id}-q`} className="jar-p3" transform="translate(73 109)rotate(75)" />
                <use href={`#${id}-s`} className="jar-p3" transform="translate(87 109)rotate(257)" />
                <use href={`#${id}-h`} className="jar-p4" transform="translate(100 113)rotate(-18)" />
                <use href={`#${id}-h`} className="jar-p5" transform="translate(19 103)rotate(25)" />
                <use href={`#${id}-q`} className="jar-p5" transform="translate(33 102)rotate(262)" />
                <use href={`#${id}-s`} className="jar-p3" transform="translate(46 101)rotate(319)" />
                <use href={`#${id}-s`} className="jar-p4" transform="translate(61 102)rotate(121)" />
                <use href={`#${id}-q`} className="jar-p5" transform="translate(74 103)rotate(355)" />
                <use href={`#${id}-h`} className="jar-p4" transform="translate(89 101)rotate(-15)" />
                <use href={`#${id}-s`} className="jar-p5" transform="translate(103 102)rotate(278)" />
                <use href={`#${id}-q`} className="jar-p3" transform="translate(17 93)rotate(239)" />
                <use href={`#${id}-s`} className="jar-p4" transform="translate(31 91)rotate(130)" />
                <use href={`#${id}-s`} className="jar-p4" transform="translate(44 92)rotate(73)" />
                <use href={`#${id}-s`} className="jar-p1" transform="translate(57 94)rotate(155)" />
                <use href={`#${id}-h`} className="jar-p4" transform="translate(72 95)rotate(21)" />
                <use href={`#${id}-s`} className="jar-p4" transform="translate(85 95)rotate(216)" />
                <use href={`#${id}-q`} className="jar-p1" transform="translate(97 91)rotate(29)" />
              </g>
              <g className="jar-l3">
                <use href={`#${id}-h`} className="jar-p1" transform="translate(18 83)rotate(-15)" />
                <use href={`#${id}-q`} className="jar-p5" transform="translate(32 84)rotate(164)" />
                <use href={`#${id}-s`} className="jar-p3" transform="translate(47 82)rotate(143)" />
                <use href={`#${id}-h`} className="jar-p1" transform="translate(60 86)rotate(24)" />
                <use href={`#${id}-q`} className="jar-p4" transform="translate(74 83)rotate(76)" />
                <use href={`#${id}-q`} className="jar-p3" transform="translate(87 84)rotate(233)" />
                <use href={`#${id}-q`} className="jar-p2" transform="translate(102 82)rotate(149)" />
                <use href={`#${id}-q`} className="jar-p5" transform="translate(16 76)rotate(84)" />
                <use href={`#${id}-s`} className="jar-p5" transform="translate(31 76)rotate(308)" />
                <use href={`#${id}-s`} className="jar-p3" transform="translate(46 75)rotate(125)" />
                <use href={`#${id}-s`} className="jar-p4" transform="translate(60 76)rotate(260)" />
                <use href={`#${id}-h`} className="jar-p5" transform="translate(74 75)rotate(17)" />
                <use href={`#${id}-h`} className="jar-p2" transform="translate(88 73)rotate(24)" />
                <use href={`#${id}-h`} className="jar-p4" transform="translate(102 77)rotate(10)" />
                <use href={`#${id}-q`} className="jar-p1" transform="translate(15 68)rotate(287)" />
                <use href={`#${id}-s`} className="jar-p3" transform="translate(30 66)rotate(256)" />
                <use href={`#${id}-s`} className="jar-p2" transform="translate(45 67)rotate(315)" />
                <use href={`#${id}-q`} className="jar-p3" transform="translate(59 65)rotate(68)" />
                <use href={`#${id}-h`} className="jar-p4" transform="translate(74 68)rotate(-8)" />
                <use href={`#${id}-q`} className="jar-p1" transform="translate(87 65)rotate(332)" />
                <use href={`#${id}-q`} className="jar-p5" transform="translate(101 65)rotate(249)" />
              </g>
              <g className="jar-l4">
                <use href={`#${id}-s`} className="jar-p1" transform="translate(20 58)rotate(63)" />
                <use href={`#${id}-h`} className="jar-p4" transform="translate(32 56)rotate(5)" />
                <use href={`#${id}-s`} className="jar-p3" transform="translate(46 57)rotate(344)" />
                <use href={`#${id}-s`} className="jar-p3" transform="translate(61 55)rotate(264)" />
                <use href={`#${id}-s`} className="jar-p3" transform="translate(73 56)rotate(81)" />
                <use href={`#${id}-s`} className="jar-p5" transform="translate(86 56)rotate(227)" />
                <use href={`#${id}-q`} className="jar-p3" transform="translate(102 58)rotate(249)" />
                <use href={`#${id}-q`} className="jar-p3" transform="translate(19 49)rotate(331)" />
                <use href={`#${id}-h`} className="jar-p4" transform="translate(33 50)rotate(15)" />
                <use href={`#${id}-q`} className="jar-p1" transform="translate(48 47)rotate(259)" />
                <use href={`#${id}-h`} className="jar-p1" transform="translate(63 47)rotate(-22)" />
                <use href={`#${id}-h`} className="jar-p2" transform="translate(78 47)rotate(23)" />
                <use href={`#${id}-s`} className="jar-p1" transform="translate(91 47)rotate(201)" />
                <use href={`#${id}-q`} className="jar-p1" transform="translate(105 46)rotate(20)" />
              </g>
            </g>
            <path className="jar-shine" d="M21.5 60Q19.7 90 21.6 118M21.8 127v.1M99 66v16" />
            <path className="jar-ink" style={{ strokeWidth: ".9", opacity: ".45", strokeDasharray: "34 8 20 11" }} d="M34 16V28C23 31 15.5 38 15 52L14.3 90 14 126C14 138 20 143.5 31 143.5H89C100 143.5 106 138 106 126L105.6 88 105 52C104.5 38 97 31 87 28V15" transform="translate(.8 .6)" />
            <path className="jar-ink" d="M33 15V28C23 31 15.5 38 15 52L14.3 90 14 126C14 138 20 143.5 31 143.5H89C100 143.5 106 138 106 126L105.6 88 105 52C104.5 38 97 31 87 28V15" />
            <path className="jar-glass" d="M31 15.5C29.5 15.5 28 14 28 12V9.5C28 7.2 29.5 5.8 32 5.8H88C90.5 5.8 92 7.2 92 9.5V12C92 14 90.5 15.5 89 15.5Z" />
            <path className="jar-ink" d="M31 15.5C29.5 15.5 28 14 28 12V9.5C28 7.2 29.5 5.8 32 5.8H88C90.5 5.8 92 7.2 92 9.5V12C92 14 90.5 15.5 89 15.5Z" />
            <path className="jar-ink" style={{ strokeWidth: "1.3" }} d="M36 20.4Q53 22.6 69 22M74 21.6Q80 21.3 84.5 20.4M37 25.3Q48 26.8 58 26.9" />
          </g>
          <g transform="translate(124 32)scale(1.5)">
            <use href={`#${id}-k`} className="jar-sp jar-tw" style={{ animationDelay: "0s" }} />
          </g>
          <g transform="translate(9 64)scale(0.95)">
            <use href={`#${id}-k`} className="jar-sp jar-tw" style={{ animationDelay: "-1.2s" }} />
          </g>
          <g transform="translate(131 108)scale(1.15)">
            <use href={`#${id}-k`} className="jar-sp jar-tw" style={{ animationDelay: "-2.4s" }} />
          </g>
          <g transform="translate(11 138)scale(0.8)">
            <use href={`#${id}-k`} className="jar-sp jar-tw" style={{ animationDelay: "-0.6s" }} />
          </g>
          <g transform="translate(44 33)scale(0.75)">
            <use href={`#${id}-k`} className="jar-sp jar-tw" style={{ animationDelay: "-1.8s" }} />
          </g>
        </svg>
        {empty && <span id={`${id}-empty`} className="absolute top-21 right-6 left-6 text-xs leading-snug font-semibold text-balance text-muted-foreground">{t("wishes.jarEmpty")}</span>}
      </span>
      <PersonAvatar person={person} size="sm" className="mt-0.5" />
    </button>
  );
}
