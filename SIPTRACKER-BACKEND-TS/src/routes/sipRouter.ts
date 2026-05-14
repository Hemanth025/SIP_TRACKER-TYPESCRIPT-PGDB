import express from 'express';
import authenticateUser from '../middlewares/authMiddleware.js';
import { createSIP, getSipById, getAllSIPs, processSips, getSIPTransactions} from "../controllers/sipController.js";
const router = express.Router();

router.post('/', authenticateUser, createSIP);
router.get('/', authenticateUser, getAllSIPs);
router.get('/:sip_id', authenticateUser, getSipById);
router.post('/:sip_id/process', authenticateUser, processSips);
router.get('/:sip_id/transactions', authenticateUser, getSIPTransactions);

export default router;