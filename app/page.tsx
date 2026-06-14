import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import {
  GroupStageSimulator,
  type Team,
  type TeamStanding,
  type ScoreEntry,
  type MatchInfo,
} from './components/GroupStageSimulator';

type StoredMatch = {
  home: string;
  away: string;
  date: string;
  homeScore: number | null;
  awayScore: number | null;
};

function loadData(): {
  groups: Record<string, string[]>;
  teams: Record<string, Team>;
  standingsByGroup: Record<string, TeamStanding[]>;
  initialScores: Record<string, Record<string, ScoreEntry>>;
  matchSchedule: Record<string, MatchInfo[]>;
} {
  const dataDir = join(process.cwd(), 'data');

  const groups: Record<string, string[]> = JSON.parse(
    readFileSync(join(dataDir, 'groups.json'), 'utf-8'),
  );

  const teams: Record<string, Team> = JSON.parse(
    readFileSync(join(dataDir, 'teams.json'), 'utf-8'),
  );

  const standingsDir = join(dataDir, 'standings');
  const files = readdirSync(standingsDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse();

  const standingsByGroup: Record<string, TeamStanding[]> =
    files.length > 0
      ? JSON.parse(readFileSync(join(standingsDir, files[0]), 'utf-8')).groups
      : {};

  const matchesFile = join(dataDir, 'matches.json');
  const storedMatches: Record<string, StoredMatch[]> = existsSync(matchesFile)
    ? JSON.parse(readFileSync(matchesFile, 'utf-8'))
    : {};

  const initialScores: Record<string, Record<string, ScoreEntry>> = {};
  const matchSchedule: Record<string, MatchInfo[]> = {};

  for (const [group, matches] of Object.entries(storedMatches)) {
    initialScores[group] = {};
    matchSchedule[group] = [];

    for (const m of matches) {
      const key = `${m.home}-${m.away}`;
      matchSchedule[group].push({ home: m.home, away: m.away, date: m.date });

      if (m.homeScore !== null && m.awayScore !== null) {
        initialScores[group][key] = {
          home: String(m.homeScore),
          away: String(m.awayScore),
        };
      }
    }
  }

  return { groups, teams, standingsByGroup, initialScores, matchSchedule };
}

export default function Home() {
  const { groups, teams, standingsByGroup, initialScores, matchSchedule } = loadData();

  return (
    <GroupStageSimulator
      groups={groups}
      teams={teams}
      realStandings={standingsByGroup}
      initialScores={initialScores}
      matchSchedule={matchSchedule}
    />
  );
}
