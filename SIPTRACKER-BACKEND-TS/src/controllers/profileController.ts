import type {
  Request,
  Response,
} from "express";

import {pool} from "../utility/pgManager.js";

import {
  getOrCreatePortfolioId,
} from "../utility/portfolioManager.js";

interface AuthRequest extends Request {
  user?: {
    investorId: number;
  };
}

interface ProfileRow {
  investor_id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  dob: string;
  pan_number: string;
  adhaar_number: string;
  address: string;
  email: string;
  portfolio_id: number;
}

const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const investorId =
      req.user?.investorId;

    if (!investorId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const portfolioId =
      await getOrCreatePortfolioId(
        investorId
      );

    const query = `
      SELECT
        i.*,
        u.email,
        $2::int AS portfolio_id

      FROM investors i

      JOIN users u
      ON i.user_id = u.user_id

      WHERE i.investor_id = $1
    `;

    const result =
      await pool.query<ProfileRow>(
        query,
        [investorId, portfolioId]
      );

    return res.status(200).json({
      user: result.rows[0],
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

export {
  getProfile,
};