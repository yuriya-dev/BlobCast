const BASE_URL = 'http://localhost:8080/api';

export interface ApiUser {
  id: string;
  walletAddress: string;
  username: string | null;
  displayName: string | null;
  avatarBlobId: string | null;
  bannerBlobId: string | null;
  bio: string | null;
  verified: boolean;
  createdAt: string;
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
    const res = await fetch(`${BASE_URL}/posts?page=${page}&limit=${limit}`, {
      cache: 'no-store'
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch posts: ${res.statusText}`);
    }
    return res.json();
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
    const res = await fetch(`${BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create post reference');
    }
    return res.json();
  },

  /**
   * Fetch user Web3 visual profile metadata by wallet address.
   */
  async fetchUserProfile(walletAddress: string): Promise<{ status: string; data: { user: ApiUser & { posts: ApiPost[] } } }> {
    const res = await fetch(`${BASE_URL}/users/${walletAddress}`, {
      cache: 'no-store'
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch user profile: ${res.statusText}`);
    }
    return res.json();
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
  }): Promise<{ status: string; data: { user: ApiUser } }> {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to upsert user profile');
    }
    return res.json();
  },

  /**
   * Fetch latest indexing telemetry events directly from Express/Redis.
   */
  async fetchNotifications(): Promise<{ status: string; data: { notifications: any[] } }> {
    const res = await fetch(`${BASE_URL}/posts/notifications`, {
      cache: 'no-store'
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch notifications: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Fetch a single post detailed registry (including relational comment thread).
   */
  async fetchPostById(id: string): Promise<{ status: string; data: { post: ApiPost & { comments: any[] } } }> {
    const res = await fetch(`${BASE_URL}/posts/${id}`, {
      cache: 'no-store'
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch post: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Toggle like relationship on the PostgreSQL DB index.
   */
  async likePost(id: string, userId: string): Promise<{ status: string; liked: boolean; data: { likeCount: number } }> {
    const res = await fetch(`${BASE_URL}/posts/${id}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to toggle like');
    }
    return res.json();
  },

  /**
   * Register a permanent Walrus comment blob reference on the post thread.
   */
  async createComment(id: string, authorId: string, walrusBlobId: string): Promise<{ status: string; data: { comment: any } }> {
    const res = await fetch(`${BASE_URL}/posts/${id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authorId, walrusBlobId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit comment');
    }
    return res.json();
  },

  /**
   * Repost an existing post permanently.
   */
  async repostPost(id: string, authorId: string): Promise<{ status: string; reposted: boolean; data: { repostCount: number } }> {
    const res = await fetch(`${BASE_URL}/posts/${id}/repost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authorId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to repost');
    }
    return res.json();
  },
};
