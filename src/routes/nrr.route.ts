import express from "express";
import { calculateMatchImpact } from "../controllers/nrr.controller";
import { validateRequest } from "../middleware/validate-request";
import { matchSchema } from "../schema/match.schema";

const router = express.Router();

router.post("/calculate", validateRequest(matchSchema), calculateMatchImpact);

export default router;