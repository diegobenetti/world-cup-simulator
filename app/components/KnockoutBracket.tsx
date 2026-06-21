'use client';

import { useState, useMemo } from 'react';
import type { Team, TeamStanding } from './GroupStageSimulator';
import { useTranslation } from '../lib/LanguageContext';

// ── Constants ──────────────────────────────────────────────────────────────

const CELL = 86;              // px per R32 row slot — drives R16/QF/SF spacing
const HALF_H = 8 * CELL;     // height of each bracket half
const COL_W = 148;            // match card column width
const COL_GAP = 6;            // gap between round columns
const R32_PAD = 5;            // px from slot edge to card for R32 pair-mates; inner gap = 2×R32_PAD

// Each R32 third-place slot maps to the eligible groups for that match.
export const THIRD_SLOTS: Record<number, string[]> = {
  74: ['A','B','C','D','F'],
  77: ['C','D','F','G','H'],
  79: ['C','E','F','H','I'],
  80: ['E','H','I','J','K'],
  81: ['B','E','F','I','J'],
  82: ['A','E','H','I','J'],
  85: ['E','F','G','I','J'],
  87: ['D','E','I','J','L'],
};

// ── Types ──────────────────────────────────────────────────────────────────

type KScore = { a: string; b: string };
type KScores = Record<number, KScore>;
interface BM { n: number; a: string; b: string; }

// ── Bracket halves ─────────────────────────────────────────────────────────
// Left half: R32 → R16 → QF → SF (reads left to right)
// Right half: SF → QF → R16 → R32 (reads left to right, mirroring the left)

const LEFT: BM[][] = [
  [ // R32 (8 matches)
    { n: 74, a: '1E',  b: '3ABCDF' }, { n: 77, a: '1I',  b: '3CDFGH'  },
    { n: 73, a: '2A',  b: '2B'     }, { n: 75, a: '1F',  b: '2C'      },
    { n: 83, a: '2K',  b: '2L'     }, { n: 84, a: '1H',  b: '2J'      },
    { n: 81, a: '1D',  b: '3BEFIJ' }, { n: 82, a: '1G',  b: '3AEHIJ'  },
  ],
  [ // R16 (4 matches)
    { n: 89, a: 'W74', b: 'W77' }, { n: 90, a: 'W73', b: 'W75' },
    { n: 93, a: 'W83', b: 'W84' }, { n: 94, a: 'W81', b: 'W82' },
  ],
  [ // QF (2 matches)
    { n: 97, a: 'W89', b: 'W90' }, { n: 98, a: 'W93', b: 'W94' },
  ],
  [ // SF (1 match)
    { n: 101, a: 'W97', b: 'W98' },
  ],
];

// Right half columns in display order: [SF, QF, R16, R32]
const RIGHT: BM[][] = [
  [ // SF (1 match)
    { n: 102, a: 'W99', b: 'W100' },
  ],
  [ // QF (2 matches)
    { n: 99,  a: 'W91', b: 'W92' }, { n: 100, a: 'W95', b: 'W96' },
  ],
  [ // R16 (4 matches)
    { n: 91, a: 'W76', b: 'W78' }, { n: 92, a: 'W79', b: 'W80' },
    { n: 95, a: 'W86', b: 'W88' }, { n: 96, a: 'W85', b: 'W87' },
  ],
  [ // R32 (8 matches)
    { n: 76, a: '1C',  b: '2F'     }, { n: 78, a: '2E',  b: '2I'      },
    { n: 79, a: '1A',  b: '3CEFHI' }, { n: 80, a: '1L',  b: '3EHIJK'  },
    { n: 86, a: '1J',  b: '2H'     }, { n: 88, a: '2D',  b: '2G'      },
    { n: 85, a: '1B',  b: '3EFGIJ' }, { n: 87, a: '1K',  b: '3DEIJL'  },
  ],
];

const FINAL: BM     = { n: 104, a: 'W101', b: 'W102' };
const THIRD: BM     = { n: 103, a: 'RU101', b: 'RU102' };


// ── Slot resolution ────────────────────────────────────────────────────────

// Flat map needed for recursive winner/loser resolution
const MATCH_SLOTS: Record<number, { a: string; b: string }> = {};
for (const half of [LEFT, RIGHT]) for (const round of half) for (const m of round) MATCH_SLOTS[m.n] = { a: m.a, b: m.b };
MATCH_SLOTS[FINAL.n] = { a: FINAL.a, b: FINAL.b };
MATCH_SLOTS[THIRD.n] = { a: THIRD.a, b: THIRD.b };

export function getThirdPlaceRanking(
  standings: Record<string, TeamStanding[]>,
): { group: string; ts: TeamStanding }[] {
  return Object.entries(standings)
    .filter(([, rows]) => rows.length >= 3)
    .map(([group, rows]) => ({ group, ts: rows[2] }))
    .sort((a, b) =>
      b.ts.points - a.ts.points ||
      b.ts.goalDifference - a.ts.goalDifference ||
      b.ts.goalsFor - a.ts.goalsFor,
    );
}

// Bipartite matching: assigns each top-8 third-place group to one eligible slot.
// Returns { group → matchNumber }.
export function allocateThirdPlaces(
  standings: Record<string, TeamStanding[]>,
): Record<string, number> {
  const top8 = getThirdPlaceRanking(standings).slice(0, 8);
  const slotToGroup: Record<number, string> = {};

  function augment(group: string, visited: Set<number>): boolean {
    for (const [slotStr, groups] of Object.entries(THIRD_SLOTS)) {
      const slot = parseInt(slotStr);
      if (!groups.includes(group) || visited.has(slot)) continue;
      visited.add(slot);
      const current = slotToGroup[slot];
      if (!current || augment(current, visited)) {
        slotToGroup[slot] = group;
        return true;
      }
    }
    return false;
  }

  for (const { group } of top8) augment(group, new Set());

  const result: Record<string, number> = {};
  for (const [slot, group] of Object.entries(slotToGroup)) result[group] = parseInt(slot);
  return result;
}

function resolveThirdSlot(
  eligible: string[],
  standings: Record<string, TeamStanding[]>,
  allocation: Record<string, number>,
): string | null {
  const eligibleSet = new Set(eligible);
  const matchEntry = Object.entries(THIRD_SLOTS).find(
    ([, groups]) => groups.length === eligible.length && groups.every(g => eligibleSet.has(g)),
  );
  if (!matchEntry) return null;
  const matchNumber = parseInt(matchEntry[0]);
  const group = Object.entries(allocation).find(([, n]) => n === matchNumber)?.[0];
  return group ? (standings[group]?.[2]?.teamCode ?? null) : null;
}

function resolveTeam(slot: string, standings: Record<string, TeamStanding[]>, kScores: KScores, allocation: Record<string, number>, depth = 0): string | null {
  if (depth > 7) return null;
  const gp = slot.match(/^([12])([A-L])$/);
  if (gp) return standings[gp[2]]?.[parseInt(gp[1]) - 1]?.teamCode ?? null;
  if (/^3[A-L]{2,}$/.test(slot)) return resolveThirdSlot(slot.slice(1).split(''), standings, allocation);
  const wm = slot.match(/^W(\d+)$/);
  if (wm) {
    const n = parseInt(wm[1]), sc = kScores[n];
    if (!sc || sc.a === '' || sc.b === '') return null;
    const sa = parseInt(sc.a), sb = parseInt(sc.b);
    if (isNaN(sa) || isNaN(sb) || sa === sb) return null;
    const ms = MATCH_SLOTS[n];
    return ms ? resolveTeam(sa > sb ? ms.a : ms.b, standings, kScores, allocation, depth + 1) : null;
  }
  const ru = slot.match(/^RU(\d+)$/);
  if (ru) {
    const n = parseInt(ru[1]), sc = kScores[n];
    if (!sc || sc.a === '' || sc.b === '') return null;
    const sa = parseInt(sc.a), sb = parseInt(sc.b);
    if (isNaN(sa) || isNaN(sb) || sa === sb) return null;
    const ms = MATCH_SLOTS[n];
    return ms ? resolveTeam(sa > sb ? ms.b : ms.a, standings, kScores, allocation, depth + 1) : null;
  }
  return null;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function KOFlag({ code }: { code: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`https://api.fifa.com/api/v3/picture/flags-sq-3/${code}`} alt={code} className="w-5 h-[14px] object-cover rounded-[2px] shrink-0" />;
}

function MatchCard({
  match, teams, standings, kScores, allocation, onScore,
}: {
  match: BM;
  teams: Record<string, Team>;
  standings: Record<string, TeamStanding[]>;
  kScores: KScores;
  allocation: Record<string, number>;
  onScore: (n: number, side: 'a' | 'b', v: string) => void;
}) {
  const tA = resolveTeam(match.a, standings, kScores, allocation);
  const tB = resolveTeam(match.b, standings, kScores, allocation);
  const sc = kScores[match.n] ?? { a: '', b: '' };
  const sa = parseInt(sc.a), sb = parseInt(sc.b);
  const winA = !isNaN(sa) && !isNaN(sb) && sa > sb;
  const winB = !isNaN(sa) && !isNaN(sb) && sb > sa;

  function Row({ team, slot, score, side, win }: { team: string | null; slot: string; score: string; side: 'a' | 'b'; win: boolean }) {
    return (
      <div className={`flex items-center gap-1 min-h-[20px] ${win ? 'text-white' : 'text-gray-400'}`}>
        {team ? <KOFlag code={team} /> : <div className="w-5 h-[14px] bg-gray-800 rounded-sm shrink-0" />}
        <div className="flex-1 min-w-0 min-h-[20px] flex flex-col justify-center">
          {team ? (
            <>
              <div className="text-[10px] truncate leading-none">{teams[team]?.name ?? team}</div>
              <div className="text-[8px] font-mono text-gray-600 leading-none mt-[2px]">{slot}</div>
            </>
          ) : (
            <span className="text-gray-600 font-mono text-[10px] leading-none">{slot}</span>
          )}
        </div>
        <input
          type="text" inputMode="numeric" maxLength={2}
          value={score} placeholder="–"
          onChange={e => onScore(match.n, side, e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
          className={`w-6 h-5 text-center text-[10px] bg-gray-800 border rounded text-white focus:outline-none placeholder-gray-700 shrink-0 focus:border-green-500 ${win ? 'border-green-600 font-bold' : 'border-gray-700'}`}
        />
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-2 pt-1 pb-1.5 flex flex-col gap-1" style={{ width: COL_W }}>
      <div className="text-gray-600 text-[9px] font-mono leading-none">M{match.n}</div>
      <Row team={tA} slot={match.a} score={sc.a} side="a" win={winA} />
      <Row team={tB} slot={match.b} score={sc.b} side="b" win={winB} />
    </div>
  );
}

// Renders one half-bracket (LEFT or RIGHT) as a row of absolute-positioned columns.
// `halfRounds` must be in display order (outermost first for left, innermost first for right).
// `outerIsR32` = true for left half, false for right half.
function HalfBracket({
  halfRounds, outerIsR32, teams, standings, kScores, allocation, onScore,
}: {
  halfRounds: BM[][];
  outerIsR32: boolean;
  teams: Record<string, Team>;
  standings: Record<string, TeamStanding[]>;
  kScores: KScores;
  allocation: Record<string, number>;
  onScore: (n: number, side: 'a' | 'b', v: string) => void;
}) {
  const totalCols = halfRounds.length; // 4

  return (
    <div className="relative shrink-0 flex" style={{ height: HALF_H, gap: COL_GAP }}>
      {halfRounds.map((round, colIdx) => {
        // For left half: colIdx 0 = R32 (outermost), each match spans 1,2,4,8 cells
        // For right half: colIdx 0 = SF (innermost), each match spans 8,4,2,1 cells
        const spanExp = outerIsR32 ? colIdx : (totalCols - 1 - colIdx);
        const rowSpan = Math.pow(2, spanExp); // 1, 2, 4, 8

        return (
          <div key={colIdx} className="relative shrink-0" style={{ width: COL_W, height: HALF_H }}>
            {round.map((match, mIdx) => {
              const isR32 = rowSpan === 1;
              // R32: anchor top-of-pair card to slot bottom, bottom-of-pair card to slot top.
              // Inner gap = 2×R32_PAD, independent of card height.
              const className = isR32
                ? `absolute flex flex-col ${mIdx % 2 === 0 ? 'justify-end' : 'justify-start'}`
                : 'absolute flex items-center';
              const style = {
                top: mIdx * rowSpan * CELL,
                height: rowSpan * CELL,
                left: 0, right: 0,
                ...(isR32 && mIdx % 2 === 0 ? { paddingBottom: R32_PAD } : {}),
                ...(isR32 && mIdx % 2 !== 0 ? { paddingTop: R32_PAD } : {}),
              };
              return (
                <div key={match.n} className={className} style={style}>
                  <MatchCard match={match} teams={teams} standings={standings} kScores={kScores} allocation={allocation} onScore={onScore} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

export function KnockoutBracket({
  teams,
  currentStandings,
}: {
  teams: Record<string, Team>;
  currentStandings: Record<string, TeamStanding[]>;
}) {
  const { t } = useTranslation();
  const [kScores, setKScores] = useState<KScores>({});
  const allocation = useMemo(() => allocateThirdPlaces(currentStandings), [currentStandings]);

  const LEFT_HEADERS  = [t.roundOf32, t.roundOf16, t.quarterFinal, t.semiFinal];
  const RIGHT_HEADERS = [t.semiFinal, t.quarterFinal, t.roundOf16, t.roundOf32];

  function handleScore(n: number, side: 'a' | 'b', v: string) {
    setKScores(prev => ({ ...prev, [n]: { ...(prev[n] ?? { a: '', b: '' }), [side]: v } }));
  }

  return (
    <div className="max-w-[1400px] mx-auto px-2 pb-10">
      <h2 className="text-base font-bold tracking-tight text-white mb-3">{t.knockoutBracketTitle}</h2>

      <div className="overflow-x-auto pb-2">
        {/* Round headers — 9 columns */}
        <div className="flex mb-2" style={{ gap: COL_GAP }}>
          {LEFT_HEADERS.map((name, i) => (
            <div key={`l${i}`} className="text-center text-[10px] text-gray-500 uppercase tracking-wider shrink-0" style={{ width: COL_W }}>{name}</div>
          ))}
          <div className="shrink-0" style={{ width: COL_W }} />
          {RIGHT_HEADERS.map((name, i) => (
            <div key={`r${i}`} className="text-center text-[10px] text-gray-500 uppercase tracking-wider shrink-0" style={{ width: COL_W }}>{name}</div>
          ))}
        </div>

        {/* Bracket: left half | centre column (Final top, 3rd bottom) | right half */}
        <div className="flex" style={{ gap: COL_GAP, height: HALF_H }}>
          <HalfBracket
            halfRounds={LEFT} outerIsR32={true}
            teams={teams} standings={currentStandings} kScores={kScores} allocation={allocation} onScore={handleScore}
          />

          {/* Centre column: Final pinned just above mid, 3rd Place just below mid */}
          <div className="relative shrink-0" style={{ width: COL_W, height: HALF_H }}>
            <div className="absolute bottom-1/2 mb-1 w-full">
              <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1 text-center">{t.final}</div>
              <MatchCard match={FINAL} teams={teams} standings={currentStandings} kScores={kScores} allocation={allocation} onScore={handleScore} />
            </div>
            <div className="absolute top-1/2 mt-1 w-full">
              <MatchCard match={THIRD} teams={teams} standings={currentStandings} kScores={kScores} allocation={allocation} onScore={handleScore} />
              <div className="text-[9px] text-gray-600 uppercase tracking-wider mt-1 text-center">{t.thirdPlace}</div>
            </div>
          </div>

          <HalfBracket
            halfRounds={RIGHT} outerIsR32={false}
            teams={teams} standings={currentStandings} kScores={kScores} allocation={allocation} onScore={handleScore}
          />
        </div>
      </div>
    </div>
  );
}
