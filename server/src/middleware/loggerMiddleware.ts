import { Request, Response, NextFunction } from 'express';

/**
 * Clean, descriptive middleware to log request telemetry, methods, paths, status codes, and latencies.
 */
export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Once request has finished processing
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`🌐 [Express API] ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Time: ${duration}ms`);
    });

    next();
};
