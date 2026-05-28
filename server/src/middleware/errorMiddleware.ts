import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

/**
 * Global centralized Express error-handling middleware.
 * Formats errors cleanly and responds with unified JSON structures.
 */
export const errorMiddleware = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let statusCode = 500;
    let status = 'error';
    let message = 'Internal Server Error';

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        status = err.status;
        message = err.message;
    } else {
        // Log unexpected programming or system crashes internally
        console.error("🔥 [System Crash Error]:", err);
    }

    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(statusCode).json({
        status,
        message,
        ...(isDevelopment && { stack: err.stack })
    });
};
