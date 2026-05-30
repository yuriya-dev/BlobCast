import http from 'http';
import app from './app';
import { createWebSocketServer } from './lib/websocket';
import './indexer'; // Start the off-chain event indexer

// Intercept uncaught synchronous programming mistakes to prevent silent process failures
process.on('uncaughtException', (err: Error) => {
    console.error('🔥 UNCAUGHT EXCEPTION! Shutting down server engine safely...');
    console.error(err.name, err.message, err.stack);
    process.exit(1);
});

const PORT = process.env.PORT || 8080;

// Create native HTTP server so WebSocket and Express share the same port
const server = http.createServer(app);

// Attach WebSocket server to the same HTTP server on path /ws
createWebSocketServer(server);

server.listen(PORT, () => {
    console.log(`🚀 ===================================================`);
    console.log(`🚀 [BlobCast Backend Server] Engine online on port ${PORT}`);
    console.log(`🚀 Supabase Database Engine Connected via Prisma client`);
    console.log(`🚀 WebSocket server running on ws://localhost:${PORT}/ws`);
    console.log(`🚀 ===================================================`);
});

// Intercept asynchronous rejected promises (e.g. database disconnects) to prevent node shell drops
process.on('unhandledRejection', (err: any) => {
    console.error('🔥 UNHANDLED REJECTION! Closing connection gates safely...');
    console.error(err.name, err.message);
    
    server.close(() => {
        process.exit(1);
    });
});
