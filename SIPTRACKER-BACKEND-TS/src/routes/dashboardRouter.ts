import express from "express";
const router = express.Router();

import { getDashboardData } from "../controllers/dashboardController.js";
import authenticateUser from "../middlewares/authMiddleware.js";

router.get("/", authenticateUser, getDashboardData);

export default router