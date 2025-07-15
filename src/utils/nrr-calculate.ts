import { Overs, Team } from "../types";


export const convertOversToDecimal = (overs: number | Overs, balls?: number): number => {
  if (typeof overs === 'number') {
    return overs + (balls || 0) / 6;
  }
  return overs.overs + overs.balls / 6;
};


export function ballsToOversDecimal(balls: number): number {
  const completeOvers = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return convertOversToDecimal(completeOvers, remainingBalls);
}


export function ballsToOversDisplay(balls: number): number {
  const completeOvers = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return parseFloat(`${completeOvers}.${remainingBalls}`);
}


const parseInnings = (innings: string): { runs: number; overs: number } => {
  const [runsStr, wickets] = innings.split("/");
  const oversAndBalls = wickets ? wickets.replace(/[a-zA-Z]/g, "") : "";
  const [oversPart, ballsPart = "0"] = oversAndBalls.split(".");
  const totalOvers = convertOversToDecimal(
    Number(oversPart),
    Number(ballsPart)
  );
  return {
    runs: parseInt(runsStr),
    overs: totalOvers,
  };
};


export function calculateRevisedNRR(
  team: Team,
  newForRuns: number,
  newForOvers: number,
  newAgainstRuns: number,
  newAgainstOvers: number
): number {
  const totalForRuns = team.forRuns + newForRuns;
  const totalForOvers = convertOversToDecimal(team.forOvers) + newForOvers;
  const totalAgainstRuns = team.againstRuns + newAgainstRuns;
  const totalAgainstOvers = convertOversToDecimal(team.againstOvers) + newAgainstOvers;

  console.log(totalForRuns, totalForOvers, totalAgainstRuns, totalAgainstOvers, 788);

  if (totalForOvers <= 0 || totalAgainstOvers <= 0) {
    throw new Error("Total overs must be greater than 0");
  }

  const nrr = totalForRuns / totalForOvers - totalAgainstRuns / totalAgainstOvers;
  console.log(totalForRuns / totalForOvers, totalAgainstRuns / totalAgainstOvers, 85);
  console.log(nrr, 86);

  return Math.trunc(nrr * 1000) / 1000;
}




export const getInitialData = (): Record<string, Team> => ({
  "Chennai Super Kings": {
    name: "Chennai Super Kings",
    matches: 7,
    won: 5,
    lost: 2,
    nrr: 0.771,
    forRuns: 1130,
    forOvers: { overs: 133, balls: 1 },
    againstRuns: 1071,
    againstOvers: { overs: 138, balls: 5 },
    points: 10,
  },
  "Royal Challengers Bangalore": {
    name: "Royal Challengers Bangalore",
    matches: 7,
    won: 4,
    lost: 3,
    nrr: 0.597,
    forRuns: 1217,
    forOvers: { overs: 140, balls: 0 },
    againstRuns: 1066,
    againstOvers: { overs: 131, balls: 4 },
    points: 8,
  },
  "Delhi Capitals": {
    name: "Delhi Capitals",
    matches: 7,
    won: 4,
    lost: 3,
    nrr: 0.319,
    forRuns: 1085,
    forOvers: { overs: 126, balls: 0 },
    againstRuns: 1136,
    againstOvers: { overs: 137, balls: 0 },
    points: 8,
  },
  "Rajasthan Royals": {
    name: "Rajasthan Royals",
    matches: 7,
    won: 3,
    lost: 4,
    nrr: 0.331,
    forRuns: 1066,
    forOvers: { overs: 128, balls: 2 },
    againstRuns: 1094,
    againstOvers: { overs: 137, balls: 1 },
    points: 6,
  },
  "Mumbai Indians": {
    name: "Mumbai Indians",
    matches: 8,
    won: 2,
    lost: 6,
    nrr: -1.75,
    forRuns: 1003,
    forOvers: { overs: 155, balls: 2 },
    againstRuns: 1134,
    againstOvers: { overs: 138, balls: 1 },
    points: 4,
  },
});
