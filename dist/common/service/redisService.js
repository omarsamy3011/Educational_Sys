"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = exports.RedisService = void 0;
const redis_1 = require("redis");
const env_service_1 = require("../../config/env.service");
class RedisService {
    client;
    constructor() {
        this.client = (0, redis_1.createClient)({ url: env_service_1.env.redis_url });
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
    async set({ key, value, ttl, }) {
        if (typeof value == "object") {
            value = JSON.stringify(value);
        }
        ttl
            ? await this.client.set(key, value, { EX: ttl })
            : await this.client.set(key, value);
    }
    async get({ key }) {
        return await this.client.get(key);
    }
    async ttl({ key }) {
        return await this.client.ttl(key);
    }
    async exists({ key }) {
        return await this.client.exists(key);
    }
    async redis_delete({ key }) {
        return await this.client.del(key);
    }
    async redis_mget({ keys }) {
        return (await this.client.mGet(keys));
    }
    createRevokeToken({ userId, token, }) {
        return `revokeToken::${userId}:${token}`;
    }
    getKey(userId) {
        return `user:sockets:${userId}`;
    }
    async addSocket(userId, socketId) {
        const key = this.getKey(userId);
        await this.client.sAdd(key, socketId);
    }
    async removeSocket(userId, socketId) {
        const key = this.getKey(userId);
        await this.client.sRem(key, socketId);
    }
    async getUserSockets(userId) {
        const key = this.getKey(userId);
        return await this.client.sMembers(key);
    }
    async getUsersSockets(userIds) {
        if (!userIds || userIds.length === 0)
            return [];
        const multi = this.client.multi();
        userIds.forEach((id) => {
            multi.sMembers(this.getKey(id));
        });
        const results = (await multi.exec());
        if (!results)
            return [];
        return results.flat();
    }
    async clearUserSockets(userId) {
        const key = this.getKey(userId);
        await this.client.del(key);
    }
}
exports.RedisService = RedisService;
exports.redisService = new RedisService();
