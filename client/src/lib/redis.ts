import Redis from 'ioredis';

let redis: Redis | null = null;
let isRedisMock = false;

// RAM-backed Redis Simulator
class RedisMock {
  private store: Map<string, string> = new Map();
  private expirations: Map<string, number> = new Map();

  async get(key: string): Promise<string | null> {
    const expired = this.checkExpired(key);
    if (expired) return null;
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    this.store.set(key, value);
    if (mode === 'EX' && duration) {
      this.expirations.set(key, Date.now() + duration * 1000);
    } else {
      this.expirations.delete(key);
    }
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const deleted = this.store.delete(key);
    this.expirations.delete(key);
    return deleted ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const expired = this.checkExpired(key);
    const val = expired ? 0 : parseInt(this.store.get(key) || '0', 10);
    const newVal = val + 1;
    this.store.set(key, newVal.toString());
    return newVal;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (this.store.has(key)) {
      this.expirations.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  private checkExpired(key: string): boolean {
    const expiry = this.expirations.get(key);
    if (expiry && expiry < Date.now()) {
      this.store.delete(key);
      this.expirations.delete(key);
      return true;
    }
    return false;
  }
}

const redisMock = new RedisMock();

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL);
    redis.on('error', (err) => {
      console.warn("⚠️ Redis client connection error. Falling back to Redis RAM Simulator.", err);
      isRedisMock = true;
    });
  } catch (error) {
    console.warn("⚠️ Failed to initialize standard Redis Client. Falling back to Redis RAM Simulator.", error);
    isRedisMock = true;
  }
} else {
  console.warn("⚠️ REDIS_URL is not set. Falling back to Redis RAM Simulator.");
  isRedisMock = true;
}

// Custom wrapper client to unify calls
export const cache = {
  async get(key: string): Promise<string | null> {
    if (isRedisMock || !redis) {
      return redisMock.get(key);
    }
    try {
      return await redis.get(key);
    } catch {
      return redisMock.get(key);
    }
  },

  async set(key: string, value: string, seconds?: number): Promise<void> {
    if (isRedisMock || !redis) {
      await redisMock.set(key, value, seconds ? 'EX' : undefined, seconds);
      return;
    }
    try {
      if (seconds) {
        await redis.set(key, value, 'EX', seconds);
      } else {
        await redis.set(key, value);
      }
    } catch {
      await redisMock.set(key, value, seconds ? 'EX' : undefined, seconds);
    }
  },

  async del(key: string): Promise<void> {
    if (isRedisMock || !redis) {
      await redisMock.del(key);
      return;
    }
    try {
      await redis.del(key);
    } catch {
      await redisMock.del(key);
    }
  },

  async incr(key: string): Promise<number> {
    if (isRedisMock || !redis) {
      return redisMock.incr(key);
    }
    try {
      return await redis.incr(key);
    } catch {
      return redisMock.incr(key);
    }
  },

  async expire(key: string, seconds: number): Promise<void> {
    if (isRedisMock || !redis) {
      await redisMock.expire(key, seconds);
      return;
    }
    try {
      await redis.expire(key, seconds);
    } catch {
      await redisMock.expire(key, seconds);
    }
  }
};

export { redis, isRedisMock };
