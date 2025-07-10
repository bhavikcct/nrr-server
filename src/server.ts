import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import nrrRoute from "./routes/nrr.route";

dotenv.config({
  path: ".env.dev",
});
const app: Express = express();
const PORT = process.env.PORT ?? 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "NRR Calculator API is running!" });
});

app.use("/api", nrrRoute);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
