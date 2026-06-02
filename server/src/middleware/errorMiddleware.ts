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
    let code: string | undefined = undefined;

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        status = err.status;
        message = err.message;
        code = err.code;
    } else {
        // Log unexpected programming or system crashes internally
        console.error("🔥 [System Crash Error]:", err);
    }

    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(statusCode).json({
        status,
        message,
        ...(code && { code }),
        ...(isDevelopment && { stack: err.stack })
    });
};
