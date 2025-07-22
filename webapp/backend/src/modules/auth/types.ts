import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface AuthService {
  generateNonce(): Promise<{ nonce: string; expiresAt: Date }>;
  verifySignatureAndLogin(
    fastify: FastifyInstance,
    message: string,
    signature: `0x${string}`,
    reply: FastifyReply,
    anonymousSessionId?: string
  ): Promise<{ accessToken: string; refreshToken: string }>;
  getCurrentUser(request: FastifyRequest): Promise<{
    address: string;
    createdAt: string;
    updatedAt: string;
  }>;
  refreshAccessToken(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ accessToken: string; refreshToken: string }>;
  logout(request: FastifyRequest): Promise<void>;
}
