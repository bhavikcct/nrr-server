

export interface Overs {
  overs: number;
  balls: number;
}
export interface Team {
  name: string;
  matches: number;
  won: number;
  lost: number;
  nrr: number;
  forRuns: number;
  forOvers: Overs; 
  againstRuns: number;
  againstOvers: Overs;
  points: number;
}
export type MatchInput = {
  yourTeam: string;
  opponentTeam: string;
  matchOvers: number;
  desiredPosition: number;
  tossResult: "bat" | "bowl";
  runsScoredOrChased: number;
};