import express from "express";
import { getProfile } from "../controllers/profileController.js";
import authenticateUser from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authenticateUser, getProfile);

export default router