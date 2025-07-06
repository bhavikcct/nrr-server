import { Request, Response } from "express";
import { NRRService } from "../services/nrr.service";

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
export const calculateMatchImpact = (req: Request, res: Response) => {
  try {
    const result = NRRService.calculateMatchImpact(req.body);
    res.status(200).json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};