import { Team } from "../types";

/**
 * Converts a number of overs and balls into a decimal number of overs.
 * @param overs the number of full overs
 * @param balls the number of balls
 * @returns the total number of overs as a decimal
 */
export const convertOversToDecimal = (overs: number, balls: number): number => {
  return parseFloat((overs + balls / 10 ).toFixed(2));
};
 
/**
 * Converts a number of balls into a decimal number of overs.
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
 * @param newForRuns the number of runs scored by the team in the new match
 * @param newForOvers the number of overs faced by the team in the new match
 * @param newAgainstRuns the number of runs scored by the opposition in the new match
 * @param newAgainstOvers the number of overs faced by the opposition in the new match
 * @returns the team's revised NRR, rounded to 3 decimal places
 */
export function calculateRevisedNRR(
  team: Team,
  newForRuns: number,
  newForOvers: number,
  newAgainstRuns: number,
  newAgainstOvers: number
): number {
  const totalForRuns = team.forRuns + newForRuns;
  const totalForOvers = team.forOvers + newForOvers;
  const totalAgainstRuns = team.againstRuns + newAgainstRuns;
  const totalAgainstOvers = team.againstOvers + newAgainstOvers;


  if (totalForOvers <= 0 || totalAgainstOvers <= 0) {
    throw new Error("Total overs must be greater than 0");
  }

  const nrr = totalForRuns / totalForOvers - totalAgainstRuns / totalAgainstOvers;
  return parseFloat(nrr.toFixed(4));
}

/**
 * Returns an object containing the initial data for all teams in the league.
 * This data is used to calculate the Net Run Rate (NRR) for each team.
 * Each team is represented by a property with the team's name as the key and
 * an object containing the team's current stats as the value.
 * @returns an object containing the initial data for all teams in the league
 */
export const getInitialData = (): Record<string, Team> => ({
  "Chennai Super Kings": {
    name: "Chennai Super Kings",
    matches: 7,
    won: 5,
    lost: 2,
    nrr: 0.771,
    forRuns: 1130,
    forOvers: convertOversToDecimal(133, 1),
    againstRuns: 1071,
    againstOvers: convertOversToDecimal(138, 5),
    points: 10,
  },
  "Royal Challengers Bangalore": {
    name: "Royal Challengers Bangalore",
    matches: 7,
    won: 4,
    lost: 3,
    nrr: 0.597,
    forRuns: 1217,
    forOvers: convertOversToDecimal(140, 0),
    againstRuns: 1066,
    againstOvers: convertOversToDecimal(131, 4),
    points: 8,
  },
  "Delhi Capitals": {
    name: "Delhi Capitals",
    matches: 7,
    won: 4,
    lost: 3,
    nrr: 0.319,
    forRuns: 1085,
    forOvers: convertOversToDecimal(126, 0),
    againstRuns: 1136,
    againstOvers: convertOversToDecimal(137, 0),
    points: 8,
  },
  "Rajasthan Royals": {
    name: "Rajasthan Royals",
    matches: 7,
    won: 3,
    lost: 4,
    nrr: 0.331,
    forRuns: 1066,
    forOvers: convertOversToDecimal(128, 2),
    againstRuns: 1094,
    againstOvers: convertOversToDecimal(137, 1),
    points: 6,
  },
  "Mumbai Indians": {
    name: "Mumbai Indians",
    matches: 8,
    won: 2,
    lost: 6,
    nrr: -1.75,
    forRuns: 1003,
    forOvers: convertOversToDecimal(155, 2),
    againstRuns: 1134,
    againstOvers: convertOversToDecimal(138, 1),
    points: 4,
  },
});
