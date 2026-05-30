import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { loggerMiddleware } from './middleware/loggerMiddleware';
import { errorMiddleware } from './middleware/errorMiddleware';
import { AppError } from './utils/appError';
import userRoutes from './routes/userRoutes';
import postRoutes from './routes/postRoutes';
import authRoutes from './routes/authRoutes';
import dmRoutes from './routes/dmRoutes';

// Load environment configurations
dotenv.config();

const app: Application = express();

// --- 1. Global Middleware Configs ---
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom request logger telemetry
app.use(loggerMiddleware);

// --- 2. API Routes Mapping ---
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dm', dmRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'success',
        message: 'BlobCast professional Express API server online',
        uptime: process.uptime()
    });
});

// Intercept undefined route lookups (404 errors)
app.all('*', (req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`API Endpoint ${req.originalUrl} not found on this server`, 404));
});

// --- 3. Centralized Error Handler ---
app.use(errorMiddleware);

export default app;
