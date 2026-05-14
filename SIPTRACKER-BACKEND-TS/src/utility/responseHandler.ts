import type { Response } from "express";

const successResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data: any = null
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (
  res: Response,
  statusCode: number,
  message: string,
  error: any = null
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
  });
};

export {
  successResponse,
  errorResponse,
};