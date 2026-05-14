import express, {type Request, type Response} from "express";
import cors from "cors";

import authRouter from "./src/routes/authRouter.js";
import investorRouter from "./src/routes/investorRouter.js";
import fundRouter from "./src/routes/fundRouter.js";
import sipRoutes from "./src/routes/sipRouter.js";
import dashboardRouter from "./src/routes/dashboardRouter.js"
import profileRouter from "./src/routes/profileRouter.js"

import "./src/utility/pgManager.js";
import { connectRedis } from "./src/utility/redis.js";

const app = express();

// Connect Redis
connectRedis();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/auth", authRouter);
app.use("/api", investorRouter);
app.use("/api/funds", fundRouter);
app.use("/api/sips", sipRoutes);
app.use("/api/dashboard", dashboardRouter);

app.use("/api/profile", profileRouter);

// Root Route
app.get(
  "/",
  (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "SIP Tracker Backend Running",
    });
  }
);

// Server Port
const PORT: number = Number(
  process.env.PORT
) || 5000;

// Start Server
app.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT}`
  );
});