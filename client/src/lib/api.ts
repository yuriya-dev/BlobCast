const BASE_URL = 'http://localhost:8080/api';

function requestInit(init: RequestInit = {}): RequestInit {
  return {
    credentials: 'include',
    ...init,
    headers: {
      ...(init.headers || {}),
    },
  };
}

async function parseJsonResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || fallbackMessage);
  }

  return res.json();
}

export interface ApiUser {
  id: string;
  walletAddress: string;
  username: string | null;
  displayName: string | null;
  avatarBlobId: string | null;
  bannerBlobId: string | null;
  bio: string | null;
  website?: string | null;
  github?: string | null;
  pinnedPostId?: string | null;
  verified: boolean;
  createdAt: string;
}

export interface ApiSessionResponse {
  status: string;
  data: { user: ApiUser };
}

export interface ApiPost {
  id: string;
  authorId: string;
  suiObjectId: string | null;
  walrusBlobId: string;
  blobHash: string;
  contentType: number;
  visibility: number;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  score: number;
  createdAt: string;
  author?: ApiUser;
  media?: any[];
  likes?: any[];
  reposts?: any[];
  repostOf?: ApiPost | null;
}

export const api = {
  /**
   * Fetch all casts timeline feed from Express backend (PostgreSQL indexed).
   */
  async fetchPosts(page = 1, limit = 15): Promise<{ status: string; data: { posts: ApiPost[] }; pagination: any }> {
    const res = await fetch(`${BASE_URL}/posts?page=${page}&limit=${limit}`, requestInit({
      cache: 'no-store'
    }));
    return parseJsonResponse(res, 'Failed to fetch posts');
  },

  /**
   * Create a new immutable cast registry block in the PostgreSQL index.
   */
  async createPost(postData: {
    authorId: string;
    suiObjectId?: string | null;
    walrusBlobId: string;
    blobHash: string;
    contentType: number;
    visibility: number;
  }): Promise<{ status: string; data: { post: ApiPost } }> {
    const res = await fetch(`${BASE_URL}/posts`, requestInit({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    }));
    return parseJsonResponse(res, 'Failed to create post reference');
  },

  /**
   * Fetch user Web3 visual profile metadata by wallet address.
   */
  async fetchUserProfile(walletAddress: string): Promise<{ status: string; data: { user: ApiUser & { posts: ApiPost[] } } }> {
    const res = await fetch(`${BASE_URL}/users/${walletAddress}`, requestInit({
      cache: 'no-store'
    }));
    return parseJsonResponse(res, 'Failed to fetch user profile');
  },

  /**
   * Fetch all registered users in the database.
   */
  async fetchAllUsers(): Promise<{ status: string; data: { users: ApiUser[] } }> {
    const res = await fetch(`${BASE_URL}/users`, requestInit({
      cache: 'no-store'
    }));
    return parseJsonResponse(res, 'Failed to fetch registered users');
  },

  /**
   * Synchronize or register User Profile identity metadata onto Supabase.
   */
  async upsertUserProfile(profileData: {
    walletAddress: string;
    username?: string;
    displayName?: string;
    avatarBlobId?: string | null;
    bannerBlobId?: string | null;
    bio?: string | null;
    website?: string | null;
    github?: string | null;
    pinnedPostId?: string | null;
  }): Promise<{ status: string; data: { user: ApiUser } }> {
    const res = await fetch(`${BASE_URL}/users`, requestInit({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    }));
    return parseJsonResponse(res, 'Failed to upsert user profile');
  },

  /**
   * Register a new wallet-backed account and create a backend session.
   */
  async registerWithWallet(profileData: {
    walletAddress: string;
    username: string;
    displayName: string;
    avatarBlobId?: string | null;
    bannerBlobId?: string | null;
    bio?: string | null;
    website?: string | null;
    github?: string | null;
    pinnedPostId?: string | null;
  }): Promise<ApiSessionResponse> {
    const res = await fetch(`${BASE_URL}/auth/register`, requestInit({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    }));
    return parseJsonResponse(res, 'Failed to register account');
  },

  /**
   * Login with a connected wallet address and create a backend session.
   */
  async loginWithWallet(walletAddress: string): Promise<ApiSessionResponse> {
    const res = await fetch(`${BASE_URL}/auth/login`, requestInit({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress }),
    }));
    return parseJsonResponse(res, 'Failed to login');
  },

  /**
   * Fetch the current authenticated session.
   */
  async fetchCurrentSession(): Promise<ApiSessionResponse> {
    const res = await fetch(`${BASE_URL}/auth/me`, requestInit({
      cache: 'no-store'
    }));
    return parseJsonResponse(res, 'Not authenticated');
  },

  /**
   * Clear the current authenticated session.
   */
  async logout(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${BASE_URL}/auth/logout`, requestInit({
      method: 'POST'
    }));
    return parseJsonResponse(res, 'Failed to logout');
  },

  /**
   * Fetch latest indexing telemetry events directly from Express/Redis.
   */
  async fetchNotifications(): Promise<{ status: string; data: { notifications: any[] } }> {
    const res = await fetch(`${BASE_URL}/posts/notifications`, requestInit({
      cache: 'no-store'
    }));
    return parseJsonResponse(res, 'Failed to fetch notifications');
  },

  /**
   * Fetch a single post detailed registry (including relational comment thread).
   */
  async fetchPostById(id: string): Promise<{ status: string; data: { post: ApiPost & { comments: any[] } } }> {
    const res = await fetch(`${BASE_URL}/posts/${id}`, requestInit({
      cache: 'no-store'
    }));
    return parseJsonResponse(res, 'Failed to fetch post');
  },

  /**
   * Toggle like relationship on the PostgreSQL DB index.
   */
  async likePost(id: string, userId: string): Promise<{ status: string; liked: boolean; data: { likeCount: number } }> {
    const res = await fetch(`${BASE_URL}/posts/${id}/like`, requestInit({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    }));
    return parseJsonResponse(res, 'Failed to toggle like');
  },

  /**
   * Register a permanent Walrus comment blob reference on the post thread.
   */
  async createComment(id: string, authorId: string, walrusBlobId: string): Promise<{ status: string; data: { comment: any } }> {
    const res = await fetch(`${BASE_URL}/posts/${id}/comments`, requestInit({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authorId, walrusBlobId }),
    }));
    return parseJsonResponse(res, 'Failed to submit comment');
  },

  /**
   * Repost an existing post permanently.
   */
  async repostPost(id: string, authorId: string): Promise<{ status: string; reposted: boolean; data: { repostCount: number } }> {
    const res = await fetch(`${BASE_URL}/posts/${id}/repost`, requestInit({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authorId }),
    }));
    return parseJsonResponse(res, 'Failed to repost');
  },
};
