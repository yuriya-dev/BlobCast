import { Router } from 'express';
import { 
    uploadSimulatedBlob, 
    getSimulatedBlob, 
    serveSimulatedImage,
    getWalrusStatus
} from '../controllers/walrusSimController';

const router = Router();

// GET /api/walrus/status - Fetch real-time status of Walrus Storage Network
router.get('/status', getWalrusStatus);

// POST /api/walrus/blobs - Upload/sync a simulated blob to database
router.post('/blobs', uploadSimulatedBlob);

// GET /api/walrus/blobs/:blobId - Retrieve raw content of a simulated blob
router.get('/blobs/:blobId', getSimulatedBlob);

// GET /api/walrus/blobs/:blobId/image - Serve base64 simulated image as binary
router.get('/blobs/:blobId/image', serveSimulatedImage);

export default router;
