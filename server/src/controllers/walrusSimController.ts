import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';

/**
 * Controller to upload a simulated Walrus blob
 * POST /api/walrus/blobs
 */
export const uploadSimulatedBlob = asyncHandler(async (req: Request, res: Response) => {
    const { blobId, content } = req.body;

    if (!blobId || !content) {
        throw new AppError('blobId and content are required', 400);
    }

    const blob = await prisma.simulatedBlob.upsert({
        where: { id: blobId },
        update: { content },
        create: { id: blobId, content }
    });

    res.status(201).json({
        status: 'success',
        data: { blob }
    });
});

/**
 * Controller to fetch the raw content of a simulated Walrus blob
 * GET /api/walrus/blobs/:blobId
 */
export const getSimulatedBlob = asyncHandler(async (req: Request, res: Response) => {
    const { blobId } = req.params;

    if (!blobId) {
        throw new AppError('blobId parameter is required', 400);
    }

    const blob = await prisma.simulatedBlob.findUnique({
        where: { id: blobId }
    });

    if (!blob) {
        throw new AppError('Simulated blob not found in database', 404);
    }

    // Attempt to parse JSON content if possible
    let parsedContent = blob.content;
    try {
        parsedContent = JSON.parse(blob.content);
    } catch {
        // Keep as string if not JSON
    }

    res.status(200).send(parsedContent);
});

/**
 * Controller to serve base64 simulated image blobs as actual binary images
 * GET /api/walrus/blobs/:blobId/image
 */
export const serveSimulatedImage = asyncHandler(async (req: Request, res: Response) => {
    const { blobId } = req.params;

    if (!blobId) {
        throw new AppError('blobId parameter is required', 400);
    }

    const blob = await prisma.simulatedBlob.findUnique({
        where: { id: blobId }
    });

    if (!blob) {
        return res.status(404).send('Not Found');
    }

    const content = blob.content.trim();

    // Check if the content is a base64 Data URL (wrapped in quotes or not)
    const cleanContent = content.startsWith('"') && content.endsWith('"')
        ? content.slice(1, -1)
        : content;

    const match = cleanContent.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        return res.send(buffer);
    }

    // Default fallback: if it's plain text or not an image
    res.status(400).send('Requested blob is not a base64 encoded image');
});
