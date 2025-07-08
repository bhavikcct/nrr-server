import { Team } from "../types";
import {
  calculateRevisedNRR,
  getInitialData,
  convertOversToDecimal,
} from "../utils/nrr-calculate";

export class NRRService {
 
  /**
   * Calculates the impact of a match on a team's Net Run Rate (NRR) with respect to its position in the league table.
   * @param data - an object with the following properties:
   *   - yourTeam: The name of the team who batted first.
   *   - oppositionTeam: The name of the team who batted second.
   *   - matchOvers: The number of overs available in the match.
   *   - desiredPosition: The position in the league table that the team wants to achieve.
   *   - tossResult: The result of the toss. Should be either "bat" or "bowl".
   *   - runsScored: The number of runs scored by the team who batted first.
   * @returns an object with the following properties:
   *   - mode: "bat" if the team batted first, "bowl" if the team batted second.
   *   - answer: An object with the following properties:
   *     - restrictRunsMin: The minimum number of runs that the opposition must make.
   *     - restrictRunsMax: The maximum number of runs that the opposition must make.
   *     - revisedNRRMin: The minimum NRR that the team will have if the opposition makes the minimum number of runs.
   *     - revisedNRRMax: The maximum NRR that the team will have if the opposition makes the maximum number of runs.
   *   - currentPosition: The current position of the team in the league table.
   *   - desiredPosition: The desired position of the team in the league table.
   *   - requiredNRR: The required NRR to achieve the desired position.
   *   - teamAtDesiredPosition: The name of the team who is currently at the desired position.
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

    if (data.desiredPosition < 1 || data.desiredPosition > sortedTeams.length) {
      throw new Error(`Desired position must be between 1 and ${sortedTeams.length}.`);
    }

    const teamAtDesiredPosition = sortedTeams[data?.desiredPosition - 1];
    
    const currentPosition = sortedTeams.findIndex(team => team.name === data.yourTeam) + 1;
    
    let requiredNRR: number;
    
    if (currentPosition <= data.desiredPosition) {
      requiredNRR = teamAtDesiredPosition.nrr + 0.001;
    } else {
      requiredNRR = teamAtDesiredPosition.nrr + 0.001;
    }

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
        currentPosition: currentPosition,
        desiredPosition: data.desiredPosition,
        requiredNRR: requiredNRR,
        teamAtDesiredPosition: teamAtDesiredPosition.name
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
        currentPosition: currentPosition,
        desiredPosition: data.desiredPosition,
        requiredNRR: requiredNRR,
        teamAtDesiredPosition: teamAtDesiredPosition.name
      };
    }

    return result;
  }


  /**
   * Computes the range of runs that the opposition must make in order for the team to achieve the desired NRR.
   * @param team - The team who batted first.
   * @param matchOvers - The number of overs available in the match.
   * @param yourScore - The number of runs scored by the team who batted first.
   * @param requiredNRR - The target NRR that the team wants to achieve.
   * @returns an object with the following properties:
   *   - restrictRunsMin: The minimum number of runs that the opposition must make.
   *   - restrictRunsMax: The maximum number of runs that the opposition must make.
   *   - revisedNRRMin: The minimum NRR that the team will have if the opposition makes the minimum number of runs.
   *   - revisedNRRMax: The maximum NRR that the team will have if the opposition makes the maximum number of runs.
   *   - impossible: A boolean indicating whether the target NRR cannot be achieved with the given score.
   *   - message: An error message if the target NRR cannot be achieved.
   */
  private static computeRestrictOpponentRuns(
    team: Team,
    matchOvers: number,
    yourScore: number,
    requiredNRR: number
  ) {
    const maxPossibleRuns = yourScore - 1;
    let restrictRunsMin = 0;
    let restrictRunsMax = maxPossibleRuns;
    let foundValidRange = false;

    for (let runs = 0; runs <= maxPossibleRuns; runs++) {
      const nrr = calculateRevisedNRR(
        team,
        yourScore,
        matchOvers,
        runs,
        matchOvers
      );
      
      if (nrr >= requiredNRR) {
        restrictRunsMax = runs;
        foundValidRange = true;
      } else {
        break;
      }
    }

    if (!foundValidRange) {
      return {
        restrictRunsMin: 0,
        restrictRunsMax: 0,
        revisedNRRMin: calculateRevisedNRR(team, yourScore, matchOvers, maxPossibleRuns, matchOvers),
        revisedNRRMax: calculateRevisedNRR(team, yourScore, matchOvers, 0, matchOvers),
        impossible: true,
        message: "Target NRR cannot be achieved with the given score"
      };
    }

    restrictRunsMin = 0; 

    const nrrMin = calculateRevisedNRR(
      team,
      yourScore,
      matchOvers,
      restrictRunsMax,
      matchOvers
    );
    const nrrMax = calculateRevisedNRR(
      team,
      yourScore,
      matchOvers,
      restrictRunsMin,
      matchOvers
    );

    return {
      restrictRunsMin: restrictRunsMin,
      restrictRunsMax: restrictRunsMax,
      revisedNRRMin: nrrMin,
      revisedNRRMax: nrrMax,
      impossible: false
    };
  }

 
  /**
   * Computes the range of overs that the team must chase in order to achieve the desired NRR.
   * @param team - The team who is chasing the target.
   * @param matchOvers - The number of overs available in the match.
   * @param chasedTarget - The target that the team must chase.
   * @param requiredNRR - The target NRR that the team wants to achieve.
   * @returns an object with the following properties:
   *   - minOvers: The minimum number of overs that the team must chase in order to achieve the desired NRR.
   *   - maxOvers: The maximum number of overs that the team must chase in order to achieve the desired NRR.
   *   - revisedNRRMin: The minimum NRR that the team will have if they chase for the minimum number of overs.
   *   - revisedNRRMax: The maximum NRR that the team will have if they chase for the maximum number of overs.
   *   - impossible: A boolean indicating whether the target NRR cannot be achieved by chasing this target.
   *   - message: An error message if the target NRR cannot be achieved.
   */
  private static computeChaseOversToBeatNRR(
    team: Team,
    matchOvers: number,
    chasedTarget: number,
    requiredNRR: number
  ) {
    let minOvers = 1;
    let maxOvers = matchOvers; 
    let foundValidRange = false;

    for (let overs = 1; overs <= matchOvers; overs++) {
      const nrr = calculateRevisedNRR(
        team,
        chasedTarget,
        overs,
        chasedTarget,
        matchOvers
      );
      
      if (nrr >= requiredNRR) {
        maxOvers = overs;
        foundValidRange = true;
      } else {
        break;
      }
    }

    if (foundValidRange && maxOvers > 1) {
      const startBalls = Math.floor(maxOvers) * 6;
      const endBalls = maxOvers * 6;
      
      for (let balls = startBalls; balls <= endBalls; balls++) {
        const overs = parseFloat((balls / 6).toFixed(2));
        if (overs > matchOvers) break;
        
        const nrr = calculateRevisedNRR(
          team,
          chasedTarget,
          overs,
          chasedTarget,
          matchOvers
        );
        
        if (nrr >= requiredNRR) {
          maxOvers = overs;
        } else {
          break;
        }
      }
    }

    if (!foundValidRange) {
      return {
        minOvers: 1,
        maxOvers: matchOvers,
        revisedNRRMin: calculateRevisedNRR(team, chasedTarget, matchOvers, chasedTarget, matchOvers),
        revisedNRRMax: calculateRevisedNRR(team, chasedTarget, 1, chasedTarget, matchOvers),
        impossible: true,
        message: "Target NRR cannot be achieved by chasing this target"
      };
    }

    const nrrMin = calculateRevisedNRR(
      team,
      chasedTarget,
      maxOvers,
      chasedTarget,
      matchOvers
    );
    const nrrMax = calculateRevisedNRR(
      team,
      chasedTarget,
      minOvers,
      chasedTarget,
      matchOvers
    );

    return {
      minOvers: minOvers,
      maxOvers: maxOvers,
      revisedNRRMin: nrrMin,
      revisedNRRMax: nrrMax,
      impossible: false
    };
  }

}