import { createClient, RedisClientType } from "redis";
import { env } from "../../config/env.service";
import { BadRequestError } from "../exceptions/error.exceptions";
import { Types } from "mongoose";

export class RedisService {
  private client: RedisClientType;

  constructor() {
    this.client = createClient({ url: env.redis_url as string });
    this.handlingConnection();
  }

  async connectRedis() {
    await this.client.connect();
  }

  handlingConnection() {
    this.client.on("error", () => {
      console.log("redis connection failed");
    });
    this.client.on("ready", () => {
      console.log("redis connected successfully");
    });
  }

  async set({
    key,
    value,
    ttl,
  }: {
    key: string;
    value: any;
    ttl?: number;
  }) {
    if (typeof value == "object") {
      value = JSON.stringify(value);
    }
    ttl
      ? await this.client.set(key, value, { EX: ttl })
      : await this.client.set(key, value);
  }

  async get({ key }: { key: string }) {
    return await this.client.get(key);
  }

  async ttl({ key }: { key: string }) {
    return await this.client.ttl(key);
  }

  async exists({ key }: { key: string }) {
    return await this.client.exists(key);
  }

  async redis_delete({ key }: { key: string }) {
    return await this.client.del(key);
  }

  async redis_mget({ keys }: { keys: string[] }): Promise<string[]> {
    return (await this.client.mGet(keys)) as string[];
  }

  createRevokeToken({
    userId,
    token,
  }: {
    userId: Types.ObjectId;
    token: string;
  }) {
    return `revokeToken::${userId}:${token}`;
  }

  // Key naming helper: e.g., "user:sockets:65f1a2b3c4d5e6f7"
  private getKey(userId: string): string {
    return `user:sockets:${userId}`;
  }

  /**
   * Add a socket ID for a user (on connect)
   */
  async addSocket(userId: string, socketId: string): Promise<void> {
    const key = this.getKey(userId);
    await this.client.sAdd(key, socketId);
  }

  /**
   * Remove a socket ID for a user (on disconnect)
   */
  async removeSocket(userId: string, socketId: string): Promise<void> {
    const key = this.getKey(userId);
    await this.client.sRem(key, socketId);
  }

  /**
   * Get all active socket IDs for a specific user
   */
  async getUserSockets(userId: string): Promise<string[]> {
    const key = this.getKey(userId);
    return await this.client.sMembers(key);
  }

  /**
   * Get socket IDs for multiple users at once using node-redis multi()
   */
  async getUsersSockets(userIds: string[]): Promise<string[]> {
    if (!userIds || userIds.length === 0) return [];

    const multi = this.client.multi();

    userIds.forEach((id) => {
      multi.sMembers(this.getKey(id)); // 👈 Fixed: changed smembers to sMembers
    });

const results = (await multi.exec()) as unknown as string[][];

if (!results) return [];

return results.flat();
  }

  /**
   * Remove all socket connections for a user
   */
  async clearUserSockets(userId: string): Promise<void> {
    const key = this.getKey(userId);
    await this.client.del(key);
  }
}

export const redisService = new RedisService();