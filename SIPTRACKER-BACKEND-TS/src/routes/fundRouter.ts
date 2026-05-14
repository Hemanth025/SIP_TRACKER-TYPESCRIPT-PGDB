import express from "express";
import { createFund,getFunds, updateFund} from "../controllers/fundController.js";
import authenticateUser from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post("/", authenticateUser, createFund);
router.get("/", authenticateUser, getFunds);
router.put("/:fund_id", authenticateUser, updateFund);

export default router;