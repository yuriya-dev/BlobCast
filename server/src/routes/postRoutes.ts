import { Router } from 'express';
import { 
    getAllPosts, 
    getPostById, 
    createPost, 
    getNotifications, 
    likePost, 
    createComment, 
    repostPost 
} from '../controllers/postController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// GET /api/posts - Get social feed timeline with pagination
router.get('/', getAllPosts);

// GET /api/posts/notifications - Get latest active indexer telemetry logs from Redis
router.get('/notifications', getNotifications);

// GET /api/posts/:id - Get a specific post registry with author and comment threads
router.get('/:id', getPostById);

// POST /api/posts - Register new permanent post reference metadata
router.post('/', requireAuth, createPost);

// POST /api/posts/:id/like - Toggle post liking in the indexer DB
router.post('/:id/like', requireAuth, likePost);

// POST /api/posts/:id/comments - Register a permanent sub-blob comment relationship
router.post('/:id/comments', requireAuth, createComment);

// POST /api/posts/:id/repost - Repost an existing post reference
router.post('/:id/repost', requireAuth, repostPost);

export default router;
