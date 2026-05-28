import { Router } from 'express';
import { getAllPosts, getPostById, createPost, getNotifications } from '../controllers/postController';

const router = Router();

// GET /api/posts - Get social feed timeline with pagination
router.get('/', getAllPosts);

// GET /api/posts/notifications - Get latest active indexer telemetry logs from Redis
router.get('/notifications', getNotifications);

// GET /api/posts/:id - Get a specific post registry with author and comment threads
router.get('/:id', getPostById);

// POST /api/posts - Register new permanent post reference metadata
router.post('/', createPost);

export default router;
