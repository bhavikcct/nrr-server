import { Team } from "../types";
import {
  ballsToOversDecimal,
  ballsToOversDisplay,
  calculateRevisedNRR,
  convertOversToDecimal,
  getInitialData,
} from "../utils/nrr-calculate";

export class NRRService {
  /**
   * Given a match's details, calculate the NRR required by the yourTeam to achieve the desiredPosition.
   * @param data - An object with the following properties:
   *   - yourTeam: The name of the team that is playing.
   *   - oppositionTeam: The name of the opposition team.
   *   - runsScored: The number of runs scored by the yourTeam.
   *   - matchOvers: The number of overs played in the match.
   *   - tossResult: The result of the toss, either "bat" or "bowl".
   *   - desiredPosition: The desired position in the points table.
   * @returns An object with the following properties:
   *   - mode: The mode of the match, either "bat" or "bowl".
   *   - answer: An object with the following properties:
   *     - restrictRunsMin: The minimum number of runs that the opposition team can score to prevent the yourTeam from achieving the desired position.
   *     - restrictRunsMax: The maximum number of runs that the opposition team can score to prevent the yourTeam from achieving the desired position.
   *     - minOvers: The minimum number of overs that the yourTeam needs to bowl to achieve the desired position.
   *     - maxOvers: The maximum number of overs that the yourTeam needs to bowl to achieve the desired position.
   *   - currentPosition: The current position of the yourTeam in the points table.
   *   - desiredPosition: The desired position in the points table.
   *   - requiredNRR: The minimum NRR required by the yourTeam to achieve the desired position.
   *   - maxAllowedNRR: The maximum NRR allowed by the yourTeam to achieve the desired position.
   *   - teamAtDesiredPosition: The name of the team currently at the desired position.
   *   - positionAnalysis: An object with the following properties:
   *     - achievable: A boolean indicating whether the desired position is achievable.
   *     - reason: A string indicating the reason why the desired position is not achievable.
   *     - teamsWithSamePoints: An array of team objects with the same number of points as the yourTeam.
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
      forRuns: yourTeam.forRuns + data.runsScored,
      forOvers: {
        overs: yourTeam.forOvers.overs + data.matchOvers,
        balls: yourTeam.forOvers.balls,
      },
    };

    const opponentTeamAfterLoss = {
      ...opponentTeam,
      matches: opponentTeam.matches + 1,
      lost: opponentTeam.lost + 1,
      againstRuns: opponentTeam.againstRuns + data.runsScored,
      againstOvers: {
        overs: opponentTeam.againstOvers.overs + data.matchOvers,
        balls: opponentTeam.againstOvers.balls, // Assuming no extra balls
      },
    };

    yourTeamAfterWin.nrr = calculateRevisedNRR(
      yourTeamAfterWin,
      data.runsScored,
      data.matchOvers,
      opponentTeam.againstRuns,
      opponentTeam.againstOvers.overs + opponentTeam.againstOvers.balls / 6
    );

    opponentTeamAfterLoss.nrr = calculateRevisedNRR(
      opponentTeamAfterLoss,
      0,
      data.matchOvers,
      data.runsScored,
      data.matchOvers
    );

    teams[data.yourTeam] = yourTeamAfterWin;
    teams[data.oppositionTeam] = opponentTeamAfterLoss;

    const sortedTeams = Object.values(teams).sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.nrr - a.nrr;
    });

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
   * Analyze whether it is possible for your team to achieve the desired position after winning the match.
   * This function takes into account the points of all teams after your team wins the match.
   * It returns an object with the following properties:
   * - achievable: A boolean indicating whether it is possible to achieve the desired position.
   * - reason: A string describing why it is not possible to achieve the desired position, if achievable is false.
   * - teamsWithSamePoints: An array of teams that have the same points as your team after winning, if achievable is false.
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
   * Given the state of all teams after your team wins the match, calculates the required NRR range
   * for your team to achieve the desired position.
   *
   * This function takes into account the NRR of all teams after your team wins the match.
   * It returns an object with the following properties:
   * - minNRR: The minimum NRR required by your team to achieve the desired position.
   * - maxNRR: The maximum NRR allowed by your team to achieve the desired position.
   *
   * Note that the NRR range is calculated based on the points and NRR of all teams after your team wins the match.
   * The function assumes that the points and NRR of the teams are up-to-date and reflect the current state of the tournament.
   *
   * If the required NRR range is invalid, the function throws an error.
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
        minRequiredNRR = highestNRRAmongLower + 0.001; // Ensure a slight margin
      } else {
        minRequiredNRR = 0.001; // Default minimum NRR
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

      // Adjust maxAllowedNRR based on teams above
      if (
        samePointTeamsAbove > 0 &&
        samePointTeamsAbove <= sortedSamePointTeams.length
      ) {
        const teamAboveUs = sortedSamePointTeams[samePointTeamsAbove - 1];
        maxAllowedNRR = teamAboveUs.nrr - 0.001; // Ensure a slight margin
      }

      // Adjust minRequiredNRR based on teams below
      if (samePointTeamsAbove < sortedSamePointTeams.length) {
        const teamBelowUs = sortedSamePointTeams[samePointTeamsAbove];
        minRequiredNRR = teamBelowUs.nrr + 0.001; // Ensure a slight margin
      } else {
        const teamsWithFewerPoints = sortedOtherTeams.filter(
          (team) => team.points < yourTeamAfterWin.points
        );
        if (teamsWithFewerPoints.length > 0) {
          const highestNRRAmongLower = Math.max(
            ...teamsWithFewerPoints.map((t) => t.nrr)
          );
          minRequiredNRR = highestNRRAmongLower + 0.001; // Ensure a slight margin
        } else {
          minRequiredNRR = 0.001; // Default minimum NRR
        }
      }
    }

    // Special case for the top position
    if (desiredPosition === 1) {
      maxAllowedNRR = 999; // No upper limit for the top position
    }

    // Ensure minRequiredNRR is valid
    if (minRequiredNRR === -999) {
      minRequiredNRR = 0.001; // Default minimum NRR
    }

    // Adjust maxAllowedNRR if needed
    if (maxAllowedNRR === 999 && desiredPosition > 1) {
      maxAllowedNRR = sortedOtherTeams[desiredPosition - 2]?.nrr - 0.001 || 999; // Ensure a slight margin
    }

    // Validate the NRR range
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
   * Calculates the minimum and maximum runs that the opponent team can score to prevent the yourTeam from achieving the desired position.
   * @param yourTeam - The team that is batting
   * @param opponentTeam - The team that is bowling
   * @param matchOvers - The number of overs available in the match
   * @param yourScore - The number of runs scored by the yourTeam
   * @param minRequiredNRR - The minimum NRR required to achieve the desired position
   * @param maxAllowedNRR - The maximum NRR allowed to achieve the desired position
   * @returns An object with the following properties:
   *   - restrictRunsMin: The minimum number of runs that the opponent team can score to prevent the yourTeam from achieving the desired position
   *   - restrictRunsMax: The maximum number of runs that the opponent team can score to prevent the yourTeam from achieving the desired position
   *   - revisedNRRMin: The minimum NRR that the yourTeam will have if the opponent team scores the minimum number of runs
   *   - revisedNRRMax: The maximum NRR that the yourTeam will have if the opponent team scores the maximum number of runs
   *   - impossible: A boolean indicating whether the target NRR range is impossible to achieve
   *   - message: A string containing the message to display to the user
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

    const maxPossibleOpponentRuns = yourScore - 1; // RCB can score a maximum of one less than yourScore
    let restrictRunsMin = -1;
    let restrictRunsMax = -1;
    let validNRRMin = 999;
    let validNRRMax = -999;

    for (
      let opponentRuns = 0;
      opponentRuns <= maxPossibleOpponentRuns;
      opponentRuns++
    ) {
      const totalForRuns = yourTeam.forRuns + yourScore;
      const totalForOvers =
        convertOversToDecimal(yourTeam.forOvers) + matchOvers;
      const totalAgainstRuns = yourTeam.againstRuns + opponentRuns;
      const totalAgainstOvers =
        convertOversToDecimal(yourTeam.againstOvers) + matchOvers;
      const yourNRR =
        totalForRuns / totalForOvers - totalAgainstRuns / totalAgainstOvers;

      if (
        yourNRR >= minRequiredNRR &&
        (maxAllowedNRR === 999 || yourNRR <= maxAllowedNRR + 0.000001)
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
      // If no valid runs found, calculate best and worst case NRR
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
      restrictRunsMin,
      restrictRunsMax,
      revisedNRRMin: validNRRMin,
      revisedNRRMax: validNRRMax,
      impossible: false,
      message: `To achieve position, opponent must score between ${restrictRunsMin} and ${restrictRunsMax} runs`,
    };
  }

  /**
   * Given a match's details, calculate the number of overs required to chase the target to achieve the desired NRR.
   * @param yourTeam - The team that is batting
   * @param opponentTeam - The team that is bowling
   * @param matchOvers - The number of overs available in the match
   * @param targetScore - The target score to chase
   * @param minRequiredNRR - The minimum NRR required to achieve the desired position
   * @param maxAllowedNRR - The maximum NRR allowed to achieve the desired position
   * @returns An object with the following properties:
   *   - minOvers: The minimum number of overs required to chase the target and achieve the desired NRR
   *   - maxOvers: The maximum number of overs required to chase the target and achieve the desired NRR
   *   - revisedNRRMin: The minimum NRR that the yourTeam will have if they chase the target in the minimum number of overs
   *   - revisedNRRMax: The maximum NRR that the yourTeam will have if they chase the target in the maximum number of overs
   *   - impossible: A boolean indicating whether the target NRR range is impossible to achieve
   *   - message: A string containing the message to display to the user
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
      (convertOversToDecimal(yourTeam.againstOvers) + matchOvers);
    const totalForRuns = yourTeam.forRuns + yourScore;

    const maxOvers =
      totalForRuns / (minRequiredNRR + runRateAgainst) -
      convertOversToDecimal(yourTeam.forOvers);
    const minOvers =
      maxAllowedNRR === 999
        ? 0
        : totalForRuns / (maxAllowedNRR + runRateAgainst) -
          convertOversToDecimal(yourTeam.forOvers);

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

    console.log(
      `Chasing: minBalls=${adjustedMinBalls}, maxBalls=${adjustedMaxBalls}, revisedNRRMin=${revisedNRRMin}, revisedNRRMax=${revisedNRRMax}`
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
