import { Router } from 'express';
import { 
    getUserProfile, 
    upsertUserProfile, 
    getAllUsers, 
    followUser, 
    unfollowUser, 
    getUserFollowers, 
    getUserFollowing,
    getUserNotifications,
    markNotificationsRead
} from '../controllers/userController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// GET /api/users - Get all registered users
router.get('/', getAllUsers);

// GET /api/users/notifications - Get user notifications
router.get('/notifications', requireAuth, getUserNotifications);

// POST /api/users/notifications/read - Mark user notifications as read
router.post('/notifications/read', requireAuth, markNotificationsRead);

// GET /api/users/:walletAddress - Get profile details by SUI address
router.get('/:walletAddress', getUserProfile);

// GET /api/users/:walletAddress/followers - Get list of followers
router.get('/:walletAddress/followers', getUserFollowers);

// GET /api/users/:walletAddress/following - Get list of followed users
router.get('/:walletAddress/following', getUserFollowing);

// POST /api/users - Register or update profile identities
router.post('/', requireAuth, upsertUserProfile);

// POST /api/users/:walletAddress/follow - Follow user
router.post('/:walletAddress/follow', requireAuth, followUser);

// POST /api/users/:walletAddress/unfollow - Unfollow user
router.post('/:walletAddress/unfollow', requireAuth, unfollowUser);

export default router;
