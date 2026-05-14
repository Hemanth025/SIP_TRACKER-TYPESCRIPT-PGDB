import type { Request, Response } from "express";
import { pool } from "../utility/pgManager.js";
import { redisClient } from "../utility/redis.js";

interface CreateFundBody {
  amc_id: number;
  fund_name: string;
  fund_code: string;
  fund_type: string;
}

interface UpdateFundBody {
  nav_value: number;
  nav_date: string;
}

const createFund = async (
  req: Request<{}, {}, CreateFundBody>,
  res: Response
): Promise<Response> => {
  try {
    const { amc_id, fund_name, fund_code, fund_type } = req.body;

    const query = `
      INSERT INTO mutual_funds 
      (amc_id, fund_name, fund_code, fund_type) 
      VALUES ($1, $2, $3, $4) 
      RETURNING fund_id
    `;

    const result = await pool.query(query, [
      amc_id,
      fund_name,
      fund_code,
      fund_type,
    ]);

    await redisClient.del("all_funds");

    return res.status(201).json({
      message: "Fund Created Successfully.. ",
      fund_id: result.rows[0].fund_id,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: "Error Creating Fund.. ",
      error: err.message,
    });
  }
};

const getFunds = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const cachedFunds = await redisClient.get("all_funds");

    if (cachedFunds) {
      console.log("Funds fetched from Redis cache");

      return res.status(200).json(JSON.parse(cachedFunds));
    }

    const query = `
      SELECT mf.*, a.amc_name 
      FROM mutual_funds mf
      JOIN amcs a ON mf.amc_id = a.amc_id
    `;

    const result = await pool.query(query);

    await redisClient.set(
      "all_funds",
      JSON.stringify(result.rows),
      {
        EX: 3600,
      }
    );

    console.log("Funds stored in Redis Cache.");

    return res.status(200).json(result.rows);
  } catch (error: any) {
    return res.status(500).json({
      message: "Error Fetching funds",
      error: error.message,
    });
  }
};

const updateFund = async (
  req: Request<{ fund_id: string }, {}, UpdateFundBody>,
  res: Response
): Promise<Response> => {
  try {
    const fund_id = req.params.fund_id;
    const { nav_value, nav_date } = req.body;

    const query = `  INSERT INTO fund_nav_history (fund_id, nav_value, nav_date) 
  VALUES ($1, $2, $3) 
  ON CONFLICT (fund_id, nav_date) 
  DO UPDATE SET nav_value = EXCLUDED.nav_value
  RETURNING nav_id
`;


    const result = await pool.query(query, [
      fund_id,
      nav_value,
      nav_date,
    ]);

    await redisClient.del("all_funds");
    await redisClient.del(`fund_nav_${fund_id}`);

    return res.status(201).json({
      message: "Fund Updated Successfully.. ",
      nav_id: result.rows[0].nav_id,
    });
  } catch (err: any) {
    console.log(err);

    return res.status(500).json({
      message: "Error updating the fund",
      error: err.message,
    });
  }
};

export {
  createFund,
  getFunds,
  updateFund,
};