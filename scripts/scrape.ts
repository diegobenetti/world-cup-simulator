import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

// ── Types ──────────────────────────────────────────────────────────────────

interface TeamStanding {
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

interface Team {
  name: string;
  code: string;
  flagPath: string;
}

interface StandingsSnapshot {
  date: string;
  groups: Record<string, TeamStanding[]>;
}

// FIFA API shapes
interface LocalizedString {
  Locale: string;
  Description: string;
}

interface FifaTeam {
  Abbreviation: string;
  ShortClubName: string;
  Name: LocalizedString[];
  PictureUrl: string; // e.g. "https://api.fifa.com/api/v3/picture/flags-{format}-{size}/ARG"
}

interface FifaStandingEntry {
  IdGroup: string;
  Group: LocalizedString[];
  Team: FifaTeam;
  Played: number;
  Won: number;
  Drawn: number;
  Lost: number;
  For: number;       // goals for
  Against: number;   // goals against
  GoalsDiference: number; // FIFA typo
  Points: number;
  Position: number;
}

interface FifaStandingsResponse {
  Results: FifaStandingEntry[];
}

interface FifaGroup {
  IdGroup: string;
  Name: LocalizedString[];
}

interface FifaGroupStage {
  IdStage: string;
  Groups: FifaGroup[];
}

interface FifaSeasonBracket {
  IdSeason: string;
  IdCompetition: string;
  GroupsStages: FifaGroupStage[];
}

interface FifaMatchTeam {
  Abbreviation: string;
}

interface FifaMatchEntry {
  IdGroup: string;
  MatchNumber: number;
  Home: FifaMatchTeam;
  Away: FifaMatchTeam;
  Date: string;
  HomeTeamScore: number | null;
  AwayTeamScore: number | null;
  HomeTeamPenaltyScore: number | null;
  AwayTeamPenaltyScore: number | null;
  StageName: { Locale: string; Description: string }[];
}

interface FifaMatchesResponse {
  Results: FifaMatchEntry[];
}

// ── Paths ──────────────────────────────────────────────────────────────────

const PROJECT_ROOT = process.cwd();
const DATA_DIR = join(PROJECT_ROOT, 'data');
const FLAGS_DIR = join(DATA_DIR, 'flags');
const STANDINGS_DIR = join(DATA_DIR, 'standings');
const GROUPS_FILE = join(DATA_DIR, 'groups.json');
const TEAMS_FILE = join(DATA_DIR, 'teams.json');
const MATCHES_FILE = join(DATA_DIR, 'matches.json');
const KNOCKOUT_FILE = join(DATA_DIR, 'knockout.json');

// Known IDs (from the FIFA API)
const COMPETITION_ID = '17';
const SEASON_ID = '285023';
const STAGE_ID = '289273'; // group stage

const KNOCKOUT_STAGE_IDS = ['289287', '289288', '289289', '289290', '289291', '289292'];

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

// ── Helpers ────────────────────────────────────────────────────────────────

function ensureDirs() {
  for (const dir of [DATA_DIR, FLAGS_DIR, STANDINGS_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function locale(arr: LocalizedString[]): string {
  return arr.find((n) => n.Locale === 'en-GB')?.Description ?? arr[0]?.Description ?? '';
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json() as Promise<T>;
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} — ${url}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  ensureDirs();

  const date = today();
  const needsInitialData = !existsSync(GROUPS_FILE);

  console.log(`\nFIFA World Cup 2026 Scraper — ${date}`);
  if (needsInitialData) console.log('First run: will fetch groups, teams, and flags.');
  console.log('');

  // ── Fetch standings ────────────────────────────────────────────────────

  console.log('Fetching standings from FIFA API...');
  const standingsUrl = `https://api.fifa.com/api/v3/calendar/${COMPETITION_ID}/${SEASON_ID}/${STAGE_ID}/standing?language=en&count=200`;
  const standingsResp = await apiFetch<FifaStandingsResponse>(standingsUrl);
  const entries = standingsResp.Results;

  if (!entries?.length) {
    throw new Error('No standings entries returned from the FIFA API.');
  }
  console.log(`  ${entries.length} team entries received.`);

  // ── Build groups, teams, standings from the flat list ─────────────────

  const groups: Record<string, TeamStanding[]> = {};
  const teams: Record<string, Team> = {};

  for (const entry of entries) {
    const groupName = locale(entry.Group); // "Group A"
    const labelMatch = groupName.match(/([A-L])\s*$/i);
    const label = labelMatch ? labelMatch[1].toUpperCase() : groupName;

    const code = entry.Team.Abbreviation || entry.Team.ShortClubName?.slice(0, 3) || '';
    if (!code) continue;

    const name = locale(entry.Team.Name) || entry.Team.ShortClubName || code;
    const flagUrl = entry.Team.PictureUrl
      .replace('{format}', 'sq')
      .replace('{size}', '3');
    const flagPath = `data/flags/${code}.png`;

    teams[code] = { name, code, flagPath };

    if (!groups[label]) groups[label] = [];
    groups[label].push({
      teamCode: code,
      played: entry.Played,
      won: entry.Won,
      drawn: entry.Drawn,
      lost: entry.Lost,
      goalsFor: entry.For,
      goalsAgainst: entry.Against,
      goalDifference: entry.GoalsDiference,
      points: entry.Points,
    });

    // Remember the flag URL for downloading (not stored in teams.json)
    (teams[code] as Team & { flagUrl?: string }).flagUrl = flagUrl;
  }

  // Sort each group by position (from API) then points
  for (const rows of Object.values(groups)) {
    rows.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);
  }

  console.log(`  ${Object.keys(groups).length} groups, ${Object.keys(teams).length} teams.`);

  // ── Save initial data once ────────────────────────────────────────────

  if (needsInitialData) {
    // groups.json
    const groupsData: Record<string, string[]> = {};
    for (const [label, rows] of Object.entries(groups)) {
      groupsData[label] = rows.map((r) => r.teamCode);
    }
    writeFileSync(GROUPS_FILE, JSON.stringify(groupsData, null, 2));
    console.log('Saved: data/groups.json');

    // teams.json (clean, no flagUrl)
    const teamsData: Record<string, Team> = {};
    for (const [code, t] of Object.entries(teams)) {
      teamsData[code] = { name: t.name, code: t.code, flagPath: t.flagPath };
    }
    writeFileSync(TEAMS_FILE, JSON.stringify(teamsData, null, 2));
    console.log('Saved: data/teams.json');

    // Download flags
    console.log('\nDownloading flags...');
    let ok = 0;
    let fail = 0;
    for (const [code, team] of Object.entries(teams)) {
      const flagUrl = (team as Team & { flagUrl?: string }).flagUrl;
      if (!flagUrl) { fail++; continue; }
      const dest = join(FLAGS_DIR, `${code}.png`);
      if (existsSync(dest)) { ok++; continue; }
      try {
        await downloadFile(flagUrl, dest);
        process.stdout.write('.');
        ok++;
      } catch (err) {
        process.stdout.write('x');
        fail++;
        console.error(`\n  Flag download failed for ${code}: ${err}`);
      }
    }
    console.log(`\nFlags: ${ok} ok, ${fail} failed.`);
  }

  // ── Save today's standings ─────────────────────────────────────────────

  const snapshot: StandingsSnapshot = { date, groups };
  const standingsFile = join(STANDINGS_DIR, `${date}.json`);
  writeFileSync(standingsFile, JSON.stringify(snapshot, null, 2));
  console.log(`\nSaved: data/standings/${date}.json`);

  // ── Fetch and save match schedule + results ───────────────────────────

  console.log('\nFetching match schedule from FIFA API...');
  const matchesUrl = `https://api.fifa.com/api/v3/calendar/matches?language=en&count=200&idSeason=${SEASON_ID}&idStage=${STAGE_ID}`;
  const matchesResp = await apiFetch<FifaMatchesResponse>(matchesUrl);

  // Use the canonical team order from groups.json (written on first run, never changed).
  // This keeps the home/away assignment in the score inputs consistent across scrapes.
  const canonicalGroups: Record<string, string[]> = JSON.parse(
    readFileSync(GROUPS_FILE, 'utf-8'),
  );

  const teamMeta: Record<string, { label: string; idx: number }> = {};
  for (const [label, codes] of Object.entries(canonicalGroups)) {
    codes.forEach((code, idx) => { teamMeta[code] = { label, idx }; });
  }

  // matches.json: per-group array sorted by date.
  // "home"/"away" refer to canonical order (lower index = home), not real home/away.
  type MatchRecord = { home: string; away: string; date: string; homeScore: number | null; awayScore: number | null };
  const matchData: Record<string, MatchRecord[]> = {};

  for (const match of matchesResp.Results) {
    const hCode = match.Home.Abbreviation;
    const aCode = match.Away.Abbreviation;
    const hMeta = teamMeta[hCode];
    const aMeta = teamMeta[aCode];
    if (!hMeta || !aMeta || hMeta.label !== aMeta.label) continue;

    const label = hMeta.label;
    if (!matchData[label]) matchData[label] = [];

    const played = match.HomeTeamScore !== null && match.AwayTeamScore !== null;
    const [first, second, firstScore, secondScore] =
      hMeta.idx < aMeta.idx
        ? [hCode, aCode, match.HomeTeamScore, match.AwayTeamScore]
        : [aCode, hCode, match.AwayTeamScore, match.HomeTeamScore];

    matchData[label].push({
      home: first,
      away: second,
      date: match.Date,
      homeScore: played ? firstScore : null,
      awayScore: played ? secondScore : null,
    });
  }

  // Sort each group's matches by date
  for (const matches of Object.values(matchData)) {
    matches.sort((a, b) => a.date.localeCompare(b.date));
  }

  const playedCount = Object.values(matchData).flat().filter(m => m.homeScore !== null).length;
  writeFileSync(MATCHES_FILE, JSON.stringify(matchData, null, 2));
  console.log(`  ${playedCount} played, ${Object.values(matchData).flat().length} total match(es) saved to data/matches.json`);

  // ── Fetch knockout stage match results ───────────────────────────────

  console.log('\nFetching knockout match results from FIFA API...');

  type KnockoutRecord = {
    home: string; homeScore: number | null; away: string; awayScore: number | null;
    homePen: number | null; awayPen: number | null;
  };
  const knockoutData: Record<number, KnockoutRecord> = {};

  for (const stageId of KNOCKOUT_STAGE_IDS) {
    const url = `https://api.fifa.com/api/v3/calendar/matches?language=en&count=100&idSeason=${SEASON_ID}&idStage=${stageId}`;
    const resp = await apiFetch<FifaMatchesResponse>(url);
    for (const m of resp.Results ?? []) {
      const mn = m.MatchNumber;
      if (!mn) continue;
      const hCode = m.Home?.Abbreviation;
      const aCode = m.Away?.Abbreviation;
      if (!hCode || !aCode) continue;
      const played = m.HomeTeamScore !== null && m.AwayTeamScore !== null;
      knockoutData[mn] = {
        home: hCode,
        homeScore: played ? (m.HomeTeamScore ?? null) : null,
        away: aCode,
        awayScore: played ? (m.AwayTeamScore ?? null) : null,
        homePen: m.HomeTeamPenaltyScore ?? null,
        awayPen: m.AwayTeamPenaltyScore ?? null,
      };
    }
  }

  const playedKnockout = Object.values(knockoutData).filter(m => m.homeScore !== null).length;
  writeFileSync(KNOCKOUT_FILE, JSON.stringify(knockoutData, null, 2));
  console.log(`  ${playedKnockout} played knockout match(es) saved to data/knockout.json`);

  // ── Print summary ─────────────────────────────────────────────────────

  console.log('\n── Standings Summary ─────────────────────────────────────');
  for (const [label, rows] of Object.entries(groups).sort()) {
    console.log(`\nGroup ${label}`);
    for (const r of rows) {
      const p = (n: number, w = 2) => String(n).padStart(w);
      console.log(
        `  ${r.teamCode.padEnd(4)} P:${p(r.played)} W:${p(r.won)} D:${p(r.drawn)} L:${p(r.lost)}` +
        ` GF:${p(r.goalsFor)} GA:${p(r.goalsAgainst)} GD:${p(r.goalDifference)} Pts:${p(r.points)}`,
      );
    }
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
