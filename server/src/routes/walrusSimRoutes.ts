import { Router } from 'express';
import { 
    uploadSimulatedBlob, 
    publishWalrusBlob,
    mintWalrusUploadToken,
    getSimulatedBlob, 
    serveSimulatedImage,
    getWalrusStatus
} from '../controllers/walrusSimController';

const router = Router();

// GET /api/walrus/status - Fetch real-time status of Walrus Storage Network
router.get('/status', getWalrusStatus);

// POST /api/walrus/blobs - Upload/sync a simulated blob to database
router.post('/blobs', uploadSimulatedBlob);

// POST /api/walrus/publish - Publish a real blob via server-side publisher
router.post('/publish', publishWalrusBlob);

// POST /api/walrus/auth - Mint a JWT token for authenticated publisher uploads
router.post('/auth', mintWalrusUploadToken);

// GET /api/walrus/blobs/:blobId - Retrieve raw content of a simulated blob
router.get('/blobs/:blobId', getSimulatedBlob);

// GET /api/walrus/blobs/:blobId/image - Serve base64 simulated image as binary
router.get('/blobs/:blobId/image', serveSimulatedImage);

export default router;
