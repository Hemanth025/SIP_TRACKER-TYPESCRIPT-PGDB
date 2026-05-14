import type{ Request, Response, NextFunction } from "express";
import { verifyJWT } from "../utility/authManager.js";
import { errorResponse } from "../utility/responseHandler.js";

interface AuthenticatedRequest extends Request {
  user?: any;
}

const authenticateUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return errorResponse(
        res,
        401,
        "Token missing"
      );
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return errorResponse(
        res,
        401,
        "Invalid token format"
      );
    }

    const decoded = verifyJWT(token);

    req.user = decoded;

    next();
  } catch (error) {
    return errorResponse(
      res,
      401,
      "Invalid or expired token"
    );
  }
};

export default authenticateUser;