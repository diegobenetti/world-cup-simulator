'use client';

import { useState, useMemo } from 'react';
import { KnockoutBracket, getThirdPlaceRanking, computeAllocation, type KnockoutApiData } from './KnockoutBracket';
import { LanguageToggle } from './LanguageToggle';
import { AboutModal } from './AboutModal';
import { useTranslation } from '../lib/LanguageContext';

// ── Types ──────────────────────────────────────────────────────────────────

export interface TeamStanding {
  teamCode: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface Team {
  name: string;
  namePt?: string;
  code: string;
}

function teamName(team: Team | undefined, lang: string, fallback: string): string {
  if (!team) return fallback;
  return lang === 'pt' ? (team.namePt ?? team.name) : team.name;
}

export type ScoreEntry = { home: string; away: string };
export type MatchInfo = { home: string; away: string; date: string };
type GroupScores = Record<string, ScoreEntry>; // key = "HOME-AWAY"
type AllScores = Record<string, GroupScores>;  // key = group label

// ── Helpers ────────────────────────────────────────────────────────────────

function flagUrl(code: string) {
  return `https://api.fifa.com/api/v3/picture/flags-sq-3/${code}`;
}

function roundRobinMatches(codes: string[]): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < codes.length; i++)
    for (let j = i + 1; j < codes.length; j++)
      out.push([codes[i], codes[j]]);
  return out;
}

function computeStandings(
  teamCodes: string[],
  groupScores: GroupScores,
): TeamStanding[] {
  const stats: Record<string, TeamStanding> = {};
  for (const code of teamCodes) {
    stats[code] = {
      teamCode: code, played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
    };
  }

  for (const [home, away] of roundRobinMatches(teamCodes)) {
    const key = `${home}-${away}`;
    const s = groupScores[key];
    if (!s) continue;
    const h = parseInt(s.home, 10);
    const a = parseInt(s.away, 10);
    if (isNaN(h) || isNaN(a) || s.home === '' || s.away === '') continue;

    stats[home].played++;
    stats[away].played++;
    stats[home].goalsFor += h;
    stats[home].goalsAgainst += a;
    stats[away].goalsFor += a;
    stats[away].goalsAgainst += h;
    stats[home].goalDifference += h - a;
    stats[away].goalDifference += a - h;

    if (h > a) {
      stats[home].won++;   stats[home].points += 3;
      stats[away].lost++;
    } else if (a > h) {
      stats[away].won++;   stats[away].points += 3;
      stats[home].lost++;
    } else {
      stats[home].drawn++; stats[home].points++;
      stats[away].drawn++; stats[away].points++;
    }
  }

  return Object.values(stats).sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor,
  );
}

function formatMatchDate(iso: string, dateLocale: string): string {
  return new Date(iso).toLocaleDateString(dateLocale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function groupIsModified(current: GroupScores, initial: GroupScores): boolean {
  // A group is "modified" (SIM mode) when the user has changed any score
  // from the real result seeded at load time.
  const allKeys = new Set([...Object.keys(current), ...Object.keys(initial)]);
  for (const key of allKeys) {
    const c = current[key] ?? { home: '', away: '' };
    const i = initial[key] ?? { home: '', away: '' };
    if (c.home !== i.home || c.away !== i.away) return true;
  }
  return false;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Flag({ code, size = 'md' }: { code: string; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-6 h-4' : 'w-8 h-[22px]';
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={flagUrl(code)} alt={code} className={`${cls} object-cover rounded-[2px] shrink-0`} />;
}

function ScoreInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      value={value}
      placeholder="–"
      onChange={(e) =>
        onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))
      }
      className="w-7 h-6 text-center bg-gray-800 border border-gray-700 rounded text-white text-xs focus:border-green-500 focus:outline-none placeholder-gray-600"
    />
  );
}

function StandingsTable({
  standings,
  teams,
}: {
  standings: TeamStanding[];
  teams: Record<string, Team>;
}) {
  const { t, lang } = useTranslation();
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-gray-500 text-xs uppercase tracking-wider">
          <th className="text-left font-medium pb-1 pr-2">{t.colTeam}</th>
          <th className="text-center font-medium pb-1 w-6">{t.colP}</th>
          <th className="text-center font-medium pb-1 w-6">{t.colW}</th>
          <th className="text-center font-medium pb-1 w-6">{t.colD}</th>
          <th className="text-center font-medium pb-1 w-6">{t.colL}</th>
          <th className="text-center font-medium pb-1 w-8">{t.colGD}</th>
          <th className="text-center font-medium pb-1 w-8">{t.colPts}</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((row, i) => {
          const team = teams[row.teamCode];
          const qualified = i < 2;
          return (
            <tr
              key={row.teamCode}
              className={`border-t border-gray-800 ${qualified ? 'text-white' : 'text-gray-400'}`}
            >
              <td className="py-1 pr-2">
                <div className="flex items-center gap-1.5">
                  <Flag code={row.teamCode} size="sm" />
                  <span className="truncate text-xs">{teamName(team, lang, row.teamCode)}</span>
                </div>
              </td>
              <td className="text-center py-1 text-xs">{row.played}</td>
              <td className="text-center py-1 text-xs">{row.won}</td>
              <td className="text-center py-1 text-xs">{row.drawn}</td>
              <td className="text-center py-1 text-xs">{row.lost}</td>
              <td className="text-center py-1 text-xs">
                {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
              </td>
              <td className="text-center py-1 text-xs font-bold">{row.points}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ThirdPlaceRanking({
  standings,
  teams,
  knockoutData,
}: {
  standings: Record<string, TeamStanding[]>;
  teams: Record<string, Team>;
  knockoutData: KnockoutApiData;
}) {
  const { t, lang } = useTranslation();
  const ranked = getThirdPlaceRanking(standings);
  const allocation = computeAllocation(knockoutData, standings);
  if (ranked.length === 0) return null;

  return (
    <div className="max-w-[700px] mx-auto px-2 pb-6">
      <h2 className="text-base font-bold tracking-tight text-white mb-3">{t.bestThirdTitle}</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 text-[10px] uppercase tracking-wider">
              <th className="text-center py-2 w-7 font-medium">#</th>
              <th className="text-center py-2 w-8 font-medium">{t.colGrp}</th>
              <th className="text-left py-2 pl-2 font-medium">{t.colTeam}</th>
              <th className="text-center py-2 w-7 font-medium">{t.colP}</th>
              <th className="text-center py-2 w-7 font-medium">{t.colW}</th>
              <th className="text-center py-2 w-7 font-medium">{t.colD}</th>
              <th className="text-center py-2 w-7 font-medium">{t.colL}</th>
              <th className="text-center py-2 w-10 font-medium">{t.colGD}</th>
              <th className="text-center py-2 w-10 font-medium">{t.colPts}</th>
              <th className="text-center py-2 w-14 font-medium">{t.colSlot}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.flatMap(({ group, ts }, i) => {
              const rank = i + 1;
              const qualifies = rank <= 8;
              const matchNumber = qualifies ? allocation[group] : undefined;
              const team = teams[ts.teamCode];
              const rows = [];

              if (rank === 9) {
                rows.push(
                  <tr key="sep">
                    <td colSpan={10} className="text-center text-[9px] text-gray-500 uppercase tracking-wider py-1.5 border-t border-gray-700 bg-gray-800/40">
                      {t.eliminated}
                    </td>
                  </tr>
                );
              }

              rows.push(
                <tr
                  key={group}
                  className={`border-t border-gray-800/50 ${qualifies ? 'text-white' : 'text-gray-600'}`}
                >
                  <td className="text-center py-1.5 text-gray-500">{rank}</td>
                  <td className="text-center py-1.5 font-mono font-bold text-gray-400">{group}</td>
                  <td className="py-1.5 pl-2">
                    <div className="flex items-center gap-1.5">
                      <Flag code={ts.teamCode} size="sm" />
                      <span className="truncate">{teamName(team, lang, ts.teamCode)}</span>
                    </div>
                  </td>
                  <td className="text-center py-1.5">{ts.played}</td>
                  <td className="text-center py-1.5">{ts.won}</td>
                  <td className="text-center py-1.5">{ts.drawn}</td>
                  <td className="text-center py-1.5">{ts.lost}</td>
                  <td className="text-center py-1.5">
                    {ts.goalDifference > 0 ? `+${ts.goalDifference}` : ts.goalDifference}
                  </td>
                  <td className="text-center py-1.5 font-bold">{ts.points}</td>
                  <td className="text-center py-1.5">
                    {matchNumber ? (
                      <span className="font-mono text-green-400">M{matchNumber}</span>
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </td>
                </tr>
              );

              return rows;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupCard({
  label,
  teamCodes,
  teams,
  realStandings,
  groupScores,
  initialGroupScores,
  matchSchedule,
  onScoreChange,
}: {
  label: string;
  teamCodes: string[];
  teams: Record<string, Team>;
  realStandings: TeamStanding[];
  groupScores: GroupScores;
  initialGroupScores: GroupScores;
  matchSchedule: MatchInfo[];
  onScoreChange: (matchKey: string, side: 'home' | 'away', value: string) => void;
}) {
  const { t } = useTranslation();
  const isSimulated = groupIsModified(groupScores, initialGroupScores);
  const hasAnyScore = Object.values(groupScores).some(s => s.home !== '' || s.away !== '');
  const standings = hasAnyScore
    ? computeStandings(teamCodes, groupScores)
    : realStandings;
  // Use scheduled order when available, fall back to generated pairs
  const matches: { home: string; away: string; date?: string }[] =
    matchSchedule.length > 0 ? matchSchedule : roundRobinMatches(teamCodes).map(([h, a]) => ({ home: h, away: a }));

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="bg-green-800 px-3 py-1.5 flex items-center justify-between">
        <h2 className="font-bold text-white tracking-wide">{t.groupLabel(label)}</h2>
        {isSimulated ? (
          <span className="text-xs font-semibold bg-amber-500 text-gray-950 px-2 py-0.5 rounded-full">
            {t.simBadge}
          </span>
        ) : (
          <span className="text-xs font-semibold bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full">
            {t.liveBadge}
          </span>
        )}
      </div>

      <div className="p-2">
        {/* Standings */}
        <StandingsTable standings={standings} teams={teams} />

        {/* Divider */}
        <div className="h-px bg-gray-800 my-1.5" />

        {/* Matches in two columns of three */}
        <div className="flex justify-between gap-2">
          {[matches.slice(0, 3), matches.slice(3)].map((col, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-1">
              {col.map(({ home, away, date }) => {
                const key = `${home}-${away}`;
                const score = groupScores[key] ?? { home: '', away: '' };
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    {date && colIdx === 1 && (
                      <span className="text-gray-600 text-[10px] w-12 shrink-0 text-right">
                        {formatMatchDate(date, t.dateLocale)}
                      </span>
                    )}
                    <Flag code={home} />
                    <ScoreInput
                      value={score.home}
                      onChange={(v) => onScoreChange(key, 'home', v)}
                    />
                    <span className="text-gray-600 text-xs select-none">·</span>
                    <ScoreInput
                      value={score.away}
                      onChange={(v) => onScoreChange(key, 'away', v)}
                    />
                    <Flag code={away} />
                    {date && colIdx === 0 && (
                      <span className="text-gray-600 text-[10px] w-12 shrink-0">
                        {formatMatchDate(date, t.dateLocale)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export function GroupStageSimulator({
  groups,
  teams,
  realStandings,
  initialScores,
  matchSchedule,
  knockoutData,
}: {
  groups: Record<string, string[]>;
  teams: Record<string, Team>;
  realStandings: Record<string, TeamStanding[]>;
  initialScores: Record<string, GroupScores>;
  matchSchedule: Record<string, MatchInfo[]>;
  knockoutData: KnockoutApiData;
}) {
  const { t } = useTranslation();
  const [scores, setScores] = useState<AllScores>(initialScores);

  const hasAnySimulation = Object.keys(groups).some((label) =>
    groupIsModified(scores[label] ?? {}, initialScores[label] ?? {}),
  );

  function handleReset() {
    setScores(initialScores);
  }

  function handleScoreChange(
    group: string,
    matchKey: string,
    side: 'home' | 'away',
    value: string,
  ) {
    setScores((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [matchKey]: {
          ...(prev[group]?.[matchKey] ?? { home: '', away: '' }),
          [side]: value,
        },
      },
    }));
  }

  const sortedGroups = Object.entries(groups).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const currentStandings = useMemo(() => {
    const result: Record<string, TeamStanding[]> = {};
    for (const [label, teamCodes] of Object.entries(groups)) {
      const gs = scores[label] ?? {};
      const hasUserScore = Object.values(gs).some(s => s.home !== '' || s.away !== '');
      if (hasUserScore) {
        result[label] = computeStandings(teamCodes, gs);
      } else {
        const real = realStandings[label];
        if (real?.some(r => r.played > 0)) result[label] = real;
      }
    }
    return result;
  }, [groups, scores, realStandings]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-bold tracking-tight">
          {t.pageTitle}
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={!hasAnySimulation}
            className="flex items-center h-9 text-sm px-4 rounded-full border border-gray-600 text-gray-300 transition-all
              enabled:hover:border-white enabled:hover:text-white enabled:cursor-pointer
              disabled:opacity-30 disabled:cursor-default"
          >
            {t.resetButton}
          </button>
          <LanguageToggle />
          <AboutModal />
        </div>
      </header>

      {/* Groups grid */}
      <div className="max-w-[1400px] mx-auto px-2 pt-3 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {sortedGroups.map(([label, teamCodes]) => {
            const fallback: TeamStanding[] =
              realStandings[label] ??
              teamCodes.map((code) => ({
                teamCode: code, played: 0, won: 0, drawn: 0, lost: 0,
                goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
              }));

            return (
              <GroupCard
                key={label}
                label={label}
                teamCodes={teamCodes}
                teams={teams}
                realStandings={fallback}
                groupScores={scores[label] ?? {}}
                initialGroupScores={initialScores[label] ?? {}}
                matchSchedule={matchSchedule[label] ?? []}
                onScoreChange={(matchKey, side, value) =>
                  handleScoreChange(label, matchKey, side, value)
                }
              />
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800 mx-2" />

      {/* Third-place ranking */}
      <div className="pt-6">
        <ThirdPlaceRanking standings={currentStandings} teams={teams} knockoutData={knockoutData} />
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800 mx-2" />

      {/* Knockout Bracket */}
      <div className="pt-6">
        <KnockoutBracket teams={teams} currentStandings={currentStandings} knockoutData={knockoutData} />
      </div>
    </div>
  );
}
