import { Overs, Team } from "../types";


/**
 * Converts either a number of overs or an object with an 'overs' property and optionally a 'balls' property into a decimal number of overs.
 * @param overs the number of overs or an object with 'overs' and optionally 'balls' properties
 * @param [balls] the number of balls if `overs` is a number
 * @returns the total number of overs as a decimal
 */
export const convertOversToDecimal = (overs: number | Overs, balls?: number): number => {
  if (typeof overs === 'number') {
    return overs + (balls || 0) / 6;
  }
  return overs.overs + overs.balls / 6;
};

/**
 * Converts a number of balls into a number of overs as a decimal.
 * @param balls the number of balls
 * @returns the total number of overs as a decimal
 */
export function ballsToOversDecimal(balls: number): number {
  const completeOvers = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return convertOversToDecimal(completeOvers, remainingBalls);
}

/**
 * Converts a number of balls into a number of overs and balls in a format
 * suitable for display to users e.g. 12.3 for 12 overs and 3 balls.
 * @param balls the number of balls
 * @returns the total number of overs and balls as a number
 */
export function ballsToOversDisplay(balls: number): number {
  const completeOvers = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return parseFloat(`${completeOvers}.${remainingBalls}`);
}


/**
 * Parses a string representing a team's innings into its runs and overs.
 * The string should be in the format "runs/wickets.overs.balls" e.g. "123/4.5.2"
 * @param innings the string to parse
 * @returns an object containing the runs and overs for the innings
 */
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

/**
 * Calculates a team's revised NRR after a match.
 * @param team the team's current stats
 * @param newForRuns the runs scored by the team in the match
 * @param newForOvers the overs faced by the team in the match
 * @param newAgainstRuns the runs scored against the team in the match
 * @param newAgainstOvers the overs bowled by the team in the match
 * @returns the revised NRR to 3 decimal places
 */
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


/**
 * Provides the initial data for teams in the league, including their names,
 * matches played, wins, losses, net run rate (NRR), runs scored, overs faced,
 * runs conceded, overs bowled, and points. This data serves as a baseline for
 * calculating the impact of future matches on team standings.
 *
 * @returns A record of team names mapped to their current statistics.
 */

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
