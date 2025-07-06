export type Team = {
  name: string;
  matches: number;
  won: number;
  lost: number;
  nrr: number;
  forRuns: number;
  forOvers: number;
  againstRuns: number;
  againstOvers: number;
  points: number;
};

export type MatchInput = {
  yourTeam: string;
  opponentTeam: string;
  matchOvers: number;
  desiredPosition: number;
  tossResult: "bat" | "bowl";
  runsScoredOrChased: number;
};