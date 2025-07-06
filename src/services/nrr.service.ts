
import { Team } from "../types";
import {
  calculateRevisedNRR,
  getInitialData,
  convertOversToDecimal,
} from "../utils/nrr-calculate";

export class NRRService {
/**
 * Calculates the impact of a cricket match on a team's net run rate (NRR)
 * based on the match details and the desired league position.
 *
 * @param data - An object containing the match details:
 *   - yourTeam: The name of your team
 *   - oppositionTeam: The name of the opposing team
 *   - matchOvers: The total number of overs in the match
 *   - desiredPosition: The target league position
 *   - tossResult: The result of the toss ("bat" or "bowl")
 *   - runsScored: The runs scored (or to be chased) by your team
 * 
 * @returns An object indicating the mode of play ("bat" or "bowl") and the
 *   necessary conditions (either restriction range of opponent's runs or overs
 *   range) to achieve the desired league position by improving NRR.
 *
 * @throws Will throw an error if team names are invalid or if the desired 
 *   position is not occupied by another team.
 */

  static calculateMatchImpact(data: any): any {
    const teams = getInitialData();
    const yourTeam = teams[data?.yourTeam];
    const opponentTeam = teams[data?.oppositionTeam];

    if (!yourTeam || !opponentTeam) {
      throw new Error("Invalid team names.");
    }

  const sortedTeams = Object.values(teams).sort(
  (a, b) => b.points - a.points || b.nrr - a.nrr
);

const desiredOpponent = sortedTeams[data.desiredPosition - 1];

if (!desiredOpponent || desiredOpponent.name === data.yourTeam) {
  throw new Error("Desired position must be occupied by another team.");
}

    const requiredNRR = desiredOpponent.nrr + 0.001;

    let result: any = {};

    if (data.tossResult === "bat") {
      const target = data.runsScored;
      const restrictionRange = this.computeRestrictOpponentRuns(
        yourTeam,
        data.matchOvers,
        target,
        requiredNRR
      );

      result = {
        mode: "bat",
        answer: restrictionRange,
      };
    } else {
      const chasedTarget = data.runsScored;
      const oversRange = this.computeChaseOversToBeatNRR(
        yourTeam,
        data.matchOvers,
        chasedTarget,
        requiredNRR
      );

      result = {
        mode: "bowl",
        answer: oversRange,
      };
    }

    return result;
  }

  /**
   * Computes the range of runs that the opponent must score in order for the
   * team to achieve the desired NRR.
   * @param team the team's current stats
   * @param matchOvers the number of overs in the match
   * @param yourScore the number of runs scored by the team
   * @param requiredNRR the desired NRR
   * @returns an object containing the range of runs that the opponent must
   * score, as well as the NRRs that the team will have if the opponent scores
   * at the minimum and maximum of the range
   */
  private static computeRestrictOpponentRuns(
    team: Team,
    matchOvers: number,
    yourScore: number,
    requiredNRR: number
  ) {
    const maxRuns = yourScore - 1;
    let bestMin = 0;
    let bestMax = maxRuns;

    for (let runs = 0; runs <= maxRuns; runs++) {
      const nrr = calculateRevisedNRR(
        team,
        yourScore,
        matchOvers,
        runs,
        matchOvers
      );
      if (nrr >= requiredNRR) {
        bestMax = runs;
      } else {
        break;
      }
    }

    const nrrMin = calculateRevisedNRR(
      team,
      yourScore,
      matchOvers,
      bestMax,
      matchOvers
    );
    const nrrMax = calculateRevisedNRR(
      team,
      yourScore,
      matchOvers,
      0,
      matchOvers
    );

    return {
      restrictRunsMin: 0,
      restrictRunsMax: bestMax,
      revisedNRRMin: nrrMin,
      revisedNRRMax: nrrMax,
    };
  }

  /**
   * Computes the range of overs that the team must bowl in order for the
   * opponent to achieve the desired NRR.
   * @param team the team's current stats
   * @param matchOvers the number of overs in the match
   * @param chasedTarget the number of runs that the opponent must chase
   * @param requiredNRR the desired NRR
   * @returns an object containing the range of overs that the opponent must
   * bowl, as well as the NRRs that the team will have if the opponent bowls
   * at the minimum and maximum of the range
   */
private static computeChaseOversToBeatNRR(
  team: Team,
  matchOvers: number,
  chasedTarget: number,
  requiredNRR: number
) {
  let minBalls = 6;
  let maxBalls = matchOvers * 6;
  let bestOvers = maxBalls;

  for (let balls = 6; balls <= maxBalls; balls++) {
    const overs = parseFloat((balls / 6).toFixed(2));
    const nrr = calculateRevisedNRR(
      team,
      chasedTarget,
      overs,
      chasedTarget,
      matchOvers
    );
    if (nrr >= requiredNRR) {
      bestOvers = balls;
    } else {
      break;
    }
  }

  // Round to next full over (e.g., 15.83 becomes 16)
  const fullOvers = Math.floor(bestOvers / 6);
  const remainingBalls = bestOvers % 6;

  let maxOversDecimal = fullOvers;
  if (remainingBalls > 0) {
    maxOversDecimal += 1;
  }

  if (maxOversDecimal > matchOvers) {
    maxOversDecimal = matchOvers;
  }

  const nrrMin = calculateRevisedNRR(
    team,
    chasedTarget,
    maxOversDecimal,
    chasedTarget,
    matchOvers
  );
  const nrrMax = calculateRevisedNRR(
    team,
    chasedTarget,
    1,
    chasedTarget,
    matchOvers
  );

  return {
    minOvers: 1,
    maxOvers: maxOversDecimal,
    revisedNRRMin: nrrMin,
    revisedNRRMax: nrrMax,
  };
}

}
