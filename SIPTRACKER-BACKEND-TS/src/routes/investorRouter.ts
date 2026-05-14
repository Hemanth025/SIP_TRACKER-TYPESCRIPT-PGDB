import express from "express";
import authenticateUser from '../middlewares/authMiddleware.js';
import {displayInvestors, getInvestorById, getInvestorHoldings, getInvestorNetWorth} 
from "../controllers/InvestorController.js";

const router = express.Router();
router.get("/investors", authenticateUser, displayInvestors);
router.get("/investors/:investor_id", authenticateUser, getInvestorById);
router.get("/investors/:investor_id/holdings", authenticateUser, getInvestorHoldings);
router.get("/investors/:investor_id/networth",authenticateUser, getInvestorNetWorth);


export default router;