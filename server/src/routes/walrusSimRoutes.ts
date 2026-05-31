import { Router } from 'express';
import { 
    uploadSimulatedBlob, 
    getSimulatedBlob, 
    serveSimulatedImage 
} from '../controllers/walrusSimController';

const router = Router();

// POST /api/walrus/blobs - Upload/sync a simulated blob to database
router.post('/', uploadSimulatedBlob);

// GET /api/walrus/blobs/:blobId - Retrieve raw content of a simulated blob
router.get('/:blobId', getSimulatedBlob);

// GET /api/walrus/blobs/:blobId/image - Serve base64 simulated image as binary
router.get('/:blobId/image', serveSimulatedImage);

export default router;
