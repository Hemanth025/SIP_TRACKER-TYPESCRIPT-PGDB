import type{ Request, Response } from "express";
import bcrypt from "bcrypt";
import { pool } from "../utility/pgManager.js";
import { generateToken } from "../utility/authManager.js";
import { successResponse, errorResponse } from "../utility/responseHandler.js";
import { redisClient } from "../utility/redis.js";

interface RegisterBody {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  dob: string;
  pan_number: string;
  adhaar_number: string;
  address: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface UserRow {
  user_id: number;
  email: string;
  password: string;
  investor_id: number;
  first_name: string;
  last_name: string;
}

const JWT_SECRET : string =  "SPITRACKER_AND_PORTFOLIOVALUATION_AS_SECRET_KEY";

// REGISTER
const register = async (
  req: Request<{}, {}, RegisterBody>,
  res: Response
): Promise<Response> => {
  // 1. Acquire a client from the pool to manage a persistent connection for the transaction
  const client = await pool.connect();

  try {
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      dob,
      pan_number,
      adhaar_number,
      address,
    } = req.body;

    // Start the Transaction
    await client.query("BEGIN");

    // Check if user exists (using the client in transaction)
    const checkUserQuery = `SELECT user_id FROM users WHERE email = $1`;
    const existingUser = await client.query(checkUserQuery, [email]);

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK"); // Always rollback before returning if inside a transaction
      return res.status(400).json({
        message: "Email already Exists.. ",
      });
    }

    const hashed_password = await bcrypt.hash(password, 10);

    // Insert into Users
    const insertUserQuery = `
      INSERT INTO users (email, password)
      VALUES ($1, $2)
      RETURNING user_id
    `;
    const userResult = await client.query(insertUserQuery, [
      email,
      hashed_password,
    ]);

    const user_id = userResult.rows[0].user_id;

    // Insert into Investors
    const insertInvestorQuery = `
      INSERT INTO investors 
      (user_id, first_name, last_name, phone, dob, pan_number, adhaar_number, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING investor_id
    `;
    
    const investorResult = await client.query(insertInvestorQuery, [
      user_id,
      first_name,
      last_name,
      phone,
      dob,
      pan_number,
      adhaar_number,
      address,
    ]);

    // If we reached here, both queries were successful. Commit them!
    await client.query("COMMIT");

    return successResponse(
      res,
      201,
      "User Registered Successfully... ",
      {
        user_id,
        investor_id: investorResult.rows[0].investor_id,
      }
    );
  } catch (error: any) {
    // If ANY error occurs (e.g., duplicate PAN, DB connection loss), undo everything
    await client.query("ROLLBACK");
    
    return res.status(500).json({
      message: error.message,
    });
  } finally {
    // Crucial: Release the client back to the pool
    client.release();
  }
};

// LOGIN
const login = async (
  req: Request<{}, {}, LoginBody>,
  res: Response
): Promise<Response> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(
        res,
        400,
        "Email and Password are Required.. "
      );
    }

    const cachedUser = await redisClient.get(`user_${email}`);

    let user: UserRow;

    if (cachedUser) {
      user = JSON.parse(cachedUser);

      console.log("User Fetched from redis cache.. ");
    } else {
      const query = `
        SELECT
          u.user_id,
          u.email,
          u.password,
          i.investor_id,
          i.first_name,
          i.last_name
        FROM users u
        JOIN investors i
        ON u.user_id = i.user_id
        WHERE u.email = $1
      `;

      const result = await pool.query(query, [email]);

      if (result.rows.length === 0) {
        return res.status(401).json({
          message: "Invalid Email or Password.. ",
        });
      }

      user = result.rows[0];

      await redisClient.set(
        `user_${email}`,
        JSON.stringify(user),
        {
          EX: 3600,
        }
      );
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid Email or Password.. ",
      });
    }

    const token = generateToken({
      investorId: user.investor_id,
      email: user.email,
    });

    await redisClient.set(
      `token:${user.investor_id}`,
      token,
      {
        EX: 3600,
      }
    );

    return successResponse(
      res,
      200,
      "Login Successfull.. ",
      {
        token,
        investor: {
          user_id: user.user_id,
          investor_id: user.investor_id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
        },
      }
    );
  } catch (error: any) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// LOGOUT
const logout = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return errorResponse(
        res,
        401,
        "Authorization Header Missing.. "
      );
    }

    const token = authHeader.split(" ")[1];

    await redisClient.set(
      `blacklist_${token}`,
      "true",
      {
        EX: 3600,
      }
    );

    return successResponse(
      res,
      200,
      "LogOut Successfull.. ."
    );
  } catch (err: any) {
    return errorResponse(res, 500, err.message);
  }
};

export {
  register,
  login,
  logout,
};