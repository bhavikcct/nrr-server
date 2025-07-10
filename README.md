# NRR Calculator API

This is a RESTful API for calculating the impact of a match on a team's net run rate (NRR) in a cricket league.

## Endpoints

### `POST /calculate`

Takes a JSON object with the following properties:

* `yourTeam`: The name of the team who batted first.
* `oppositionTeam`: The name of the team who batted second.
* `matchOvers`: The number of overs available in the match.
* `desiredPosition`: The position in the league table that the team wants to achieve.
* `tossResult`: The result of the toss. Should be either "bat" or "bowl".
* `runsScored`: The number of runs scored by the team who batted first.

Returns a JSON object with the following properties:

* `answer`: An object with the following properties:
	+ `restrictRunsMin`: The minimum number of runs that the team who batted second must make.
	+ `restrictRunsMax`: The maximum number of runs that the team who batted second must make.
	+ `revisedNRRMin`: The minimum NRR that the team will have if the team who batted second makes the minimum number of runs.
	+ `revisedNRRMax`: The maximum NRR that the team will have if the team who batted second makes the maximum number of runs.
* `error`: If there was an error with the request, this will contain the error message.

### Take a clone of this repository and start the project:

1. Clone the repository using `git clone https://github.com/bhavikcct/nrr-server.git`
2. Install the dependencies using `npm install`
3. Start the server using `npm  run serve`
