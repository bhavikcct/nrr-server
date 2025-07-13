import { Team } from "../types";
import {
  ballsToOversDecimal,
  ballsToOversDisplay,
  calculateRevisedNRR,
  getInitialData,
} from "../utils/nrr-calculate";

export class NRRService {
  /**
   * Handles an incoming request to calculate the impact of a match on a team's net run rate.
   * The request body should contain the following properties:
   * - yourTeam: The name of the team who batted first.
   * - oppositionTeam: The name of the team who batted second.
   * - matchOvers: The number of overs available in the match.
   * - desiredPosition: The position in the league table that the team wants to achieve.
   * - tossResult: The result of the toss. Should be either "bat" or "bowl".
   * - runsScored: The number of runs scored by the team who batted first.
   *
   * The response will be an object with the following properties:
   * - answer: An object with the following properties:
   *   - restrictRunsMin: The minimum number of runs that the team who batted second must make.
   *   - restrictRunsMax: The maximum number of runs that the team who batted second must make.
   *   - revisedNRRMin: The minimum NRR that the team will have if the team who batted second makes the minimum number of runs.
   *   - revisedNRRMax: The maximum NRR that the team will have if the team who batted second makes the maximum number of runs.
   * - error: If there was an error with the request, this will contain the error message.
   */
  static calculateMatchImpact(data: any): any {
    if (
      !data.yourTeam ||
      !data.oppositionTeam ||
      data.runsScored === undefined ||
      !data.matchOvers ||
      !data.tossResult ||
      !data.desiredPosition
    ) {
      throw new Error("Missing required fields");
    }
    if (data.runsScored < 0 || data.matchOvers <= 0) {
      throw new Error("Runs and overs must be positive");
    }
    if (data.tossResult !== "bat" && data.tossResult !== "bowl") {
      throw new Error("Toss result must be 'bat' or 'bowl'");
    }

    const teams = getInitialData();
    const yourTeam = teams[data?.yourTeam];
    const opponentTeam = teams[data?.oppositionTeam];

    if (!yourTeam || !opponentTeam) {
      throw new Error("Invalid team names.");
    }

    const yourTeamAfterWin = {
      ...yourTeam,
      matches: yourTeam.matches + 1,
      won: yourTeam.won + 1,
      points: yourTeam.points + 2,
    };

    const opponentTeamAfterLoss = {
      ...opponentTeam,
      matches: opponentTeam.matches + 1,
      lost: opponentTeam.lost + 1,
    };

    const sortedTeams = Object.values(teams).sort(
      (a, b) => b.points - a.points || b.nrr - a.nrr
    );

    if (data.desiredPosition < 1 || data.desiredPosition > sortedTeams.length) {
      throw new Error(
        `Desired position must be between 1 and ${sortedTeams.length}.`
      );
    }

    const currentPosition =
      sortedTeams.findIndex((team) => team.name === data.yourTeam) + 1;

    const positionAnalysis = this.analyzePositionFeasibility(
      yourTeamAfterWin,
      opponentTeamAfterLoss,
      teams,
      data.desiredPosition,
      currentPosition,
      data.yourTeam,
      data.oppositionTeam
    );

    if (!positionAnalysis.achievable) {
      throw new Error(positionAnalysis.reason);
    }

    const nrrRange = this.calculateRequiredNRRRange(
      yourTeamAfterWin,
      opponentTeamAfterLoss,
      teams,
      data.desiredPosition,
      data.yourTeam,
      data.oppositionTeam
    );

    const teamAtDesiredPosition = sortedTeams[data.desiredPosition - 1];

    let result: any = {};

    if (data.tossResult === "bat") {
      const target = data.runsScored;
      const restrictionRange = this.computeRestrictOpponentRuns(
        yourTeam,
        opponentTeam,
        data.matchOvers,
        target,
        nrrRange.minNRR,
        nrrRange.maxNRR
      );

      result = {
        mode: "bat",
        answer: restrictionRange,
        currentPosition: currentPosition,
        desiredPosition: data.desiredPosition,
        requiredNRR: nrrRange.minNRR,
        maxAllowedNRR: nrrRange.maxNRR,
        teamAtDesiredPosition: teamAtDesiredPosition.name,
        positionAnalysis: positionAnalysis,
      };
    } else {
      const chasedTarget = data.runsScored;
      const oversRange = this.computeChaseOversToBeatNRR(
        yourTeam,
        opponentTeam,
        data.matchOvers,
        chasedTarget,
        nrrRange.minNRR,
        nrrRange.maxNRR
      );

      result = {
        mode: "bowl",
        answer: oversRange,
        currentPosition: currentPosition,
        desiredPosition: data.desiredPosition,
        requiredNRR: nrrRange.minNRR,
        maxAllowedNRR: nrrRange.maxNRR,
        teamAtDesiredPosition: teamAtDesiredPosition.name,
        positionAnalysis: positionAnalysis,
      };
    }

    return result;
  }

  /**
   * Analyzes the feasibility of achieving a desired league position after a match.
   *
   * @param yourTeamAfterWin - The stats of your team after they win the match.
   * @param opponentTeamAfterWin - The stats of the opponent team after they lose the match.
   * @param allTeams - A record of all teams in the league and their current stats.
   * @param desiredPosition - The position in the league table that your team wants to achieve.
   * @param currentPosition - The current position of your team in the league table.
   * @param yourTeamName - The name of your team.
   * @param opponentTeamName - The name of the opponent team.
   * @returns An object indicating whether the desired position is achievable, the reason if not achievable,
   * and a list of teams with the same points as your team after the match.
   */

  private static analyzePositionFeasibility(
    yourTeamAfterWin: Team,
    opponentTeamAfterWin: Team,
    allTeams: Record<string, Team>,
    desiredPosition: number,
    currentPosition: number,
    yourTeamName: string,
    opponentTeamName: string
  ): { achievable: boolean; reason?: string; teamsWithSamePoints?: Team[] } {
    const teamsArray = Object.values(allTeams);

    const teamsAfterYourWin = teamsArray.map((team) => {
      if (team.name === yourTeamName) {
        return yourTeamAfterWin;
      } else if (team.name === opponentTeamName) {
        return { ...team, matches: team.matches + 1, lost: team.lost + 1 };
      }
      return team;
    });

    const teamsWithSamePointsAfterWin = teamsAfterYourWin.filter(
      (team) =>
        team.points === yourTeamAfterWin.points && team.name !== yourTeamName
    );

    const teamsWithMorePointsAfterWin = teamsAfterYourWin.filter(
      (team) => team.points > yourTeamAfterWin.points
    );

    const bestPossiblePosition = teamsWithMorePointsAfterWin.length + 1;
    const worstPossiblePosition =
      teamsWithMorePointsAfterWin.length +
      teamsWithSamePointsAfterWin.length +
      1;

    if (desiredPosition < bestPossiblePosition) {
      return {
        achievable: false,
        reason: `Cannot achieve position ${desiredPosition}. With ${yourTeamAfterWin.points} points after winning, best possible position is ${bestPossiblePosition} (${teamsWithMorePointsAfterWin.length} teams have more points).`,
        teamsWithSamePoints: teamsWithSamePointsAfterWin,
      };
    }

    if (desiredPosition > worstPossiblePosition) {
      return {
        achievable: false,
        reason: `Cannot achieve position ${desiredPosition}. With ${yourTeamAfterWin.points} points after winning, worst possible position is ${worstPossiblePosition}.`,
        teamsWithSamePoints: teamsWithSamePointsAfterWin,
      };
    }

    return {
      achievable: true,
      teamsWithSamePoints: teamsWithSamePointsAfterWin,
    };
  }
  /**
   * Calculates the required NRR range for your team to achieve a desired position in the league table.
   * @param yourTeamAfterWin - Your team's stats after winning the match.
   * @param opponentTeamAfterLoss - The opponent team's stats after losing the match.
   * @param allTeams - All teams in the league with their current stats.
   * @param desiredPosition - The desired position in the league table.
   * @param yourTeamName - The name of your team.
   * @param opponentTeamName - The name of the opponent team.
   * @returns An object with two properties: minNRR and maxNRR. minNRR is the minimum NRR that your team
   * needs to achieve to reach the desired position, and maxNRR is the maximum NRR that your team can
   * have and still reach the desired position. If the desired position is not achievable, this function
   * throws an error.
   */
  private static calculateRequiredNRRRange(
    yourTeamAfterWin: Team,
    opponentTeamAfterLoss: Team,
    allTeams: Record<string, Team>,
    desiredPosition: number,
    yourTeamName: string,
    opponentTeamName: string
  ): { minNRR: number; maxNRR: number } {
    const otherTeams = Object.values(allTeams)
      .filter((team) => team.name !== yourTeamName)
      .map((team) => {
        if (team.name === opponentTeamName) {
          return { ...team, matches: team.matches + 1, lost: team.lost + 1 };
        }
        return team;
      });

    const sortedOtherTeams = otherTeams.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.nrr - a.nrr;
    });

    let minRequiredNRR = -999;
    let maxAllowedNRR = 999;

    const teamsWithSamePoints = sortedOtherTeams.filter(
      (team) => team.points === yourTeamAfterWin.points
    );

    if (teamsWithSamePoints.length === 0) {
      const teamsWithFewerPoints = sortedOtherTeams.filter(
        (team) => team.points < yourTeamAfterWin.points
      );
      if (teamsWithFewerPoints.length > 0) {
        const highestNRRAmongLower = Math.max(
          ...teamsWithFewerPoints.map((t) => t.nrr)
        );
        minRequiredNRR = highestNRRAmongLower + 0.001;
      } else {
        minRequiredNRR = 0.001;
      }
    } else {
      const sortedSamePointTeams = teamsWithSamePoints.sort(
        (a, b) => b.nrr - a.nrr
      );
      const teamsAbove = desiredPosition - 1;
      const teamsWithMorePoints = sortedOtherTeams.filter(
        (team) => team.points > yourTeamAfterWin.points
      ).length;
      const samePointTeamsAbove = teamsAbove - teamsWithMorePoints;

      if (
        samePointTeamsAbove > 0 &&
        samePointTeamsAbove <= sortedSamePointTeams.length
      ) {
        const teamAboveUs = sortedSamePointTeams[samePointTeamsAbove - 1];
        maxAllowedNRR = teamAboveUs.nrr - 0.001;
      }

      if (samePointTeamsAbove < sortedSamePointTeams.length) {
        const teamBelowUs = sortedSamePointTeams[samePointTeamsAbove];
        minRequiredNRR = teamBelowUs.nrr + 0.001;
      } else {
        const teamsWithFewerPoints = sortedOtherTeams.filter(
          (team) => team.points < yourTeamAfterWin.points
        );
        if (teamsWithFewerPoints.length > 0) {
          const highestNRRAmongLower = Math.max(
            ...teamsWithFewerPoints.map((t) => t.nrr)
          );
          minRequiredNRR = highestNRRAmongLower + 0.001;
        } else {
          minRequiredNRR = 0.001;
        }
      }
    }

    if (desiredPosition === 1) {
      maxAllowedNRR = 999;
    }

    if (minRequiredNRR === -999) {
      minRequiredNRR = 0.001;
    }

    if (maxAllowedNRR === 999 && desiredPosition > 1) {
      maxAllowedNRR = sortedOtherTeams[desiredPosition - 2]?.nrr - 0.001 || 999;
    }

    if (minRequiredNRR >= maxAllowedNRR && maxAllowedNRR !== 999) {
      throw new Error(
        `Cannot achieve position ${desiredPosition}. Required NRR range is invalid.`
      );
    }

    return {
      minNRR: minRequiredNRR,
      maxNRR: maxAllowedNRR,
    };
  }

  /**
   * Computes the restrict runs for the opponent team based on the provided match data
   * and desired NRR range. The opponent team must score within the given range to
   * allow the your team to achieve the desired position.
   *
   * @param {Team} yourTeam - Your team's stats
   * @param {Team} opponentTeam - Opponent team's stats
   * @param {number} matchOvers - Number of overs available in the match
   * @param {number} yourScore - Runs scored by your team
   * @param {number} minRequiredNRR - Minimum NRR required to achieve the desired position
   * @param {number} maxAllowedNRR - Maximum NRR allowed to achieve the desired position
   * @returns {object} An object containing the restrict runs range, revised NRR range
   *   and a boolean indicating whether the target NRR range is impossible to achieve
   */
  private static computeRestrictOpponentRuns(
    yourTeam: Team,
    opponentTeam: Team,
    matchOvers: number,
    yourScore: number,
    minRequiredNRR: number,
    maxAllowedNRR: number
  ): object {
    if (matchOvers <= 0 || yourScore < 0) {
      throw new Error("Match overs and runs scored must be non-negative");
    }

    const maxPossibleOpponentRuns = yourScore - 1;
    let restrictRunsMin = -1;
    let restrictRunsMax = -1;
    let validNRRMin = 999;
    let validNRRMax = -999;

    for (
      let opponentRuns = 0;
      opponentRuns <= maxPossibleOpponentRuns;
      opponentRuns++
    ) {
      const yourNRR = calculateRevisedNRR(
        yourTeam,
        yourScore,
        matchOvers,
        opponentRuns,
        matchOvers
      );

      if (
        yourNRR >= minRequiredNRR &&
        (maxAllowedNRR === 999 || yourNRR <= maxAllowedNRR)
      ) {
        if (restrictRunsMin === -1) {
          restrictRunsMin = opponentRuns;
        }
        restrictRunsMax = opponentRuns;
        validNRRMin = Math.min(validNRRMin, yourNRR);
        validNRRMax = Math.max(validNRRMax, yourNRR);
      }
    }

    if (restrictRunsMin === -1) {
      const bestCaseNRR = calculateRevisedNRR(
        yourTeam,
        yourScore,
        matchOvers,
        0,
        matchOvers
      );
      const worstCaseNRR = calculateRevisedNRR(
        yourTeam,
        yourScore,
        matchOvers,
        maxPossibleOpponentRuns,
        matchOvers
      );

      return {
        restrictRunsMin: 0,
        restrictRunsMax: maxPossibleOpponentRuns,
        revisedNRRMin: worstCaseNRR,
        revisedNRRMax: bestCaseNRR,
        impossible: true,
        message: `Target NRR range [${minRequiredNRR.toFixed(3)}, ${
          maxAllowedNRR === 999 ? "unlimited" : maxAllowedNRR.toFixed(3)
        }] cannot be achieved. Possible NRR range: [${worstCaseNRR.toFixed(
          3
        )}, ${bestCaseNRR.toFixed(3)}]`,
      };
    }

    // Recalculate NRR at boundaries for precision
    validNRRMin = calculateRevisedNRR(
      yourTeam,
      yourScore,
      matchOvers,
      restrictRunsMax,
      matchOvers
    );
    validNRRMax = calculateRevisedNRR(
      yourTeam,
      yourScore,
      matchOvers,
      restrictRunsMin,
      matchOvers
    );

    return {
      restrictRunsMin: restrictRunsMin,
      restrictRunsMax: restrictRunsMax,
      revisedNRRMin: validNRRMin,
      revisedNRRMax: validNRRMax,
      impossible: false,
      message: `To achieve position, opponent must score between ${restrictRunsMin} and ${restrictRunsMax} runs`,
    };
  }
  /**
   * Computes the required overs to chase the target score and beat the required NRR range.
   * If the target NRR range is impossible to achieve, returns the possible NRR range instead.
   *
   * @param {Team} yourTeam - Your team's stats
   * @param {Team} opponentTeam - Opponent team's stats
   * @param {number} matchOvers - Number of overs available in the match
   * @param {number} targetScore - Target score to chase
   * @param {number} minRequiredNRR - Minimum NRR required to achieve the desired position
   * @param {number} maxAllowedNRR - Maximum NRR allowed to achieve the desired position
   * @returns {object} An object containing the required overs range, revised NRR range
   *   and a boolean indicating whether the target NRR range is impossible to achieve
   */

  private static computeChaseOversToBeatNRR(
    yourTeam: Team,
    opponentTeam: Team,
    matchOvers: number,
    targetScore: number,
    minRequiredNRR: number,
    maxAllowedNRR: number
  ): object {
    if (matchOvers <= 0 || targetScore < 0) {
      throw new Error("Match overs and target score must be non-negative");
    }

    const maxBalls = Math.floor(matchOvers * 6);
    const yourScore = targetScore + 1;
    const minBallsRequired = Math.ceil(yourScore / 6);
    if (minBallsRequired > maxBalls) {
      throw new Error(`Cannot score ${yourScore} runs in ${matchOvers} overs`);
    }

    const runRateAgainst =
      (yourTeam.againstRuns + targetScore) /
      (yourTeam.againstOvers + matchOvers);
    const totalForRuns = yourTeam.forRuns + yourScore;

    const maxOvers =
      totalForRuns / (minRequiredNRR + runRateAgainst) - yourTeam.forOvers;
    const minOvers =
      maxAllowedNRR === 999
        ? 0
        : totalForRuns / (maxAllowedNRR + runRateAgainst) - yourTeam.forOvers;

    let minBalls = Math.max(Math.ceil(minOvers * 6), minBallsRequired);
    let adjustedMaxBalls = Math.min(Math.floor(maxOvers * 6), maxBalls);

    let tieNRR: number | null = null;
    if (yourScore === targetScore + 1) {
      tieNRR = calculateRevisedNRR(
        yourTeam,
        targetScore,
        matchOvers,
        targetScore,
        matchOvers
      );
    }

    if (
      minBalls > adjustedMaxBalls &&
      (tieNRR === null || tieNRR < minRequiredNRR || tieNRR > maxAllowedNRR)
    ) {
      const bestCaseNRR = calculateRevisedNRR(
        yourTeam,
        yourScore,
        ballsToOversDecimal(minBallsRequired),
        targetScore,
        matchOvers
      );
      const worstCaseNRR = calculateRevisedNRR(
        yourTeam,
        yourScore,
        matchOvers,
        targetScore,
        matchOvers
      );
      return {
        minOvers: ballsToOversDisplay(minBallsRequired),
        maxOvers: ballsToOversDisplay(maxBalls),
        revisedNRRMin: worstCaseNRR,
        revisedNRRMax: bestCaseNRR,
        impossible: true,
        message: `Target NRR range [${minRequiredNRR.toFixed(3)}, ${
          maxAllowedNRR === 999 ? "unlimited" : maxAllowedNRR.toFixed(3)
        }] cannot be achieved. Possible NRR range: [${worstCaseNRR.toFixed(
          3
        )}, ${bestCaseNRR.toFixed(3)}]`,
      };
    }

    let adjustedMinBalls = minBalls;
    while (adjustedMinBalls <= adjustedMaxBalls) {
      const overs = ballsToOversDecimal(adjustedMinBalls);
      const nrr = calculateRevisedNRR(
        yourTeam,
        yourScore,
        overs,
        targetScore,
        matchOvers
      );
      if (nrr <= maxAllowedNRR && nrr >= minRequiredNRR) {
        break;
      }
      adjustedMinBalls++;
    }

    while (adjustedMaxBalls >= adjustedMinBalls) {
      const overs = ballsToOversDecimal(adjustedMaxBalls);
      const nrr = calculateRevisedNRR(
        yourTeam,
        yourScore,
        overs,
        targetScore,
        matchOvers
      );
      if (nrr >= minRequiredNRR) {
        break;
      }
      adjustedMaxBalls--;
    }

    const preciseMinOvers = ballsToOversDisplay(adjustedMinBalls);
    const preciseMaxOvers = ballsToOversDisplay(adjustedMaxBalls);

    const revisedNRRMin = calculateRevisedNRR(
      yourTeam,
      yourScore,
      ballsToOversDecimal(adjustedMaxBalls),
      targetScore,
      matchOvers
    );
    const revisedNRRMax = calculateRevisedNRR(
      yourTeam,
      yourScore,
      ballsToOversDecimal(adjustedMinBalls),
      targetScore,
      matchOvers
    );

    let message = `Chase the target between ${preciseMinOvers} to ${preciseMaxOvers} overs to achieve the required NRR`;
    if (
      tieNRR !== null &&
      tieNRR >= minRequiredNRR &&
      (maxAllowedNRR === 999 || tieNRR <= maxAllowedNRR)
    ) {
      message += `. A tie (scoring ${targetScore} in ${matchOvers} overs) achieves NRR ${tieNRR.toFixed(
        3
      )}`;
    }

    return {
      minOvers: preciseMinOvers,
      maxOvers: preciseMaxOvers,
      revisedNRRMin,
      revisedNRRMax,
      impossible: false,
      message,
    };
  }
}
