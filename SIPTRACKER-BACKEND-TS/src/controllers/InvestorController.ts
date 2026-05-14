import type { Request, Response } from "express";
import { pool } from "../utility/pgManager.js";
import { redisClient } from "../utility/redis.js";

// --------------------
// TYPES
// --------------------

interface Investor {
  investor_id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  dob: string;
  pan_number: string;
  adhaar_number: string;
  address: string;
  email?: string;
}

interface Holding {
  fund_name: string;
  fund_type: string;
  total_units: number;
  latest_nav: number;
  nav_date: string;
  current_value: number;
}

interface NetWorthRow {
  investor_id: number;
  first_name: string;
  last_name: string;
  fund_name: string;
  total_units: number;
  nav_value: number;
  current_value: string;
}

// --------------------
// DISPLAY INVESTORS
// --------------------

const displayInvestors = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const cachedInvestors = await redisClient.get(
      "all_investors"
    );

    if (cachedInvestors) {
      console.log("Investors fetched from Redis.. ");

      return res
        .status(200)
        .json(JSON.parse(cachedInvestors));
    }

    const query = `SELECT * FROM investors`;

    const result = await pool.query(query);

    await redisClient.set(
      "all_investors",
      JSON.stringify(result.rows),
      {
        EX: 3600,
      }
    );

    console.log("Investors stored in Redis.. ");

    return res.status(200).json(result.rows);
  } catch (err: any) {
    return res.status(500).json({
      message: "Error Fetching Investors.. ",
      error: err.message,
    });
  }
};

// --------------------
// GET INVESTOR BY ID
// --------------------

const getInvestorById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const investor_id = req.params.investor_id;

    const cachedInvestor = await redisClient.get(
      `investor_${investor_id}`
    );

    if (cachedInvestor) {
      console.log("Investor fetched from Redis.. ");

      return res
        .status(200)
        .json(JSON.parse(cachedInvestor));
    }

    const query = `
      SELECT
        i.investor_id,
        i.user_id,
        i.first_name,
        i.last_name,
        i.phone,
        i.dob,
        i.pan_number,
        i.adhaar_number,
        i.address,
        u.email
      FROM investors i
      INNER JOIN users u
      ON i.user_id = u.user_id
      WHERE i.investor_id = $1
    `;

    const result = await pool.query<Investor>(query, [
      investor_id,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Investor Not Found.. ",
      });
    }

    await redisClient.set(
      `investor_${investor_id}`,
      JSON.stringify(result.rows[0]),
      {
        EX: 3600,
      }
    );

    console.log("Investor stored in Redis.. ");

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching investor details",
      error: error.message,
    });
  }
};

// --------------------
// GET INVESTOR HOLDINGS
// --------------------

const getInvestorHoldings = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const investor_id = req.params.investor_id;

    const cachedHoldings = await redisClient.get(
      `holdings_${investor_id}`
    );

    if (cachedHoldings) {
      console.log("Holdings fetched from Redis.. ");

      return res
        .status(200)
        .json(JSON.parse(cachedHoldings));
    }

    const query = `
      SELECT
        h.*,
        mf.fund_name,
        mf.fund_type,
        COALESCE(
          latest_nav.nav_value,
          h.average_purchase_nav,
          0
        ) AS latest_nav,
        latest_nav.nav_date,
        h.total_units *
        COALESCE(
          latest_nav.nav_value,
          h.average_purchase_nav,
          0
        ) AS current_value
      FROM holdings h
      JOIN mutual_funds mf
      ON h.fund_id = mf.fund_id
      LEFT JOIN (
        SELECT DISTINCT ON (fund_id)
          fund_id,
          nav_value,
          nav_date
        FROM fund_nav_history
        ORDER BY fund_id, nav_date DESC
      ) latest_nav
      ON h.fund_id = latest_nav.fund_id
      WHERE h.investor_id = $1
      ORDER BY current_value DESC
    `;

    const result = await pool.query<Holding>(query, [
      investor_id,
    ]);

    await redisClient.set(
      `holdings_${investor_id}`,
      JSON.stringify(result.rows),
      {
        EX: 3600,
      }
    );

    console.log("Holdings stored in Redis");

    return res.status(200).json(result.rows);
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching holdings",
      error: error.message,
    });
  }
};

// --------------------
// GET INVESTOR NET WORTH
// --------------------

const getInvestorNetWorth = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const investor_id = req.params.investor_id;

    const cachedNetWorth = await redisClient.get(
      `networth_${investor_id}`
    );

    if (cachedNetWorth) {
      console.log("Net Worth fetched from Redis..");

      return res
        .status(200)
        .json(JSON.parse(cachedNetWorth));
    }

    const query = `
      SELECT
        i.investor_id,
        i.first_name,
        i.last_name,
        mf.fund_name,
        h.total_units,
        nav.nav_value,
        ROUND(
          (h.total_units * nav.nav_value)::numeric,
          2
        ) AS current_value
      FROM investors i
      JOIN holdings h
      ON i.investor_id = h.investor_id
      JOIN mutual_funds mf
      ON h.fund_id = mf.fund_id
      JOIN fund_nav_history nav
      ON mf.fund_id = nav.fund_id
      WHERE i.investor_id = $1
    `;

    const result = await pool.query<NetWorthRow>(query, [
      investor_id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Investor holding not found.. ",
      });
    }

    let totalNetWorth = 0;

    result.rows.forEach((row) => {
      totalNetWorth += parseFloat(row.current_value);
    });

    const firstRow = result.rows[0];
    if (!firstRow) {
        return res.status(404).json({
            message: "Investor holding not found.. ",
        });
    }
    
    const responseData = {
        investor_id: firstRow.investor_id,
        investor_name: firstRow.first_name + " " + firstRow.last_name,
        holdings: result.rows,
        totalNetWorth: totalNetWorth.toFixed(2),
    };

    await redisClient.set(
      `networth_${investor_id}`,
      JSON.stringify(responseData),
      {
        EX: 3600,
      }
    );

    console.log("Net Worth stored in Redis..");

    return res.status(200).json(responseData);
  } catch (error: any) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

export {
  displayInvestors,
  getInvestorById,
  getInvestorHoldings,
  getInvestorNetWorth,
};