import { initServer } from "@ts-rest/fastify";
import * as AuthService from "./auth.service.ts";
import { contract } from "../../../../shared/contracts/index.ts";
import config from "../../config.ts";

const s = initServer();

export const authRouter = s.router(contract.auth, {
  getNonce: async () => {
    try {
      const { nonce, expiresAt } = await AuthService.generateNonce();
      return {
        status: 200,
        body: {
          nonce,
          expiresAt: expiresAt.toISOString(),
        },
      };
    } catch (error) {
      return { status: 500, body: { message: String(error) } };
    }
  },
  signIn: async ({ body, request, reply }) => {
    try {
      const { message, signature } = body;
      if (!message || !signature) {
        return {
          status: 400,
          body: { message: "Message and signature are required" },
        };
      }
      const { accessToken, refreshToken } =
        await AuthService.verifySignatureAndLogin(
          request.server,
          message,
          signature,
          reply
        );
      reply.setCookie(config.COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: config.IS_PRODUCTION,
        sameSite: "strict",
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
      return {
        status: 200,
        body: { accessToken, refreshToken },
      };
    } catch (error) {
      return { status: 500, body: { message: String(error) } };
    }
  },
  me: {
    handler: async ({ request }) => {
      try {
        const user = await AuthService.getCurrentUser(request);
        return { status: 200, body: user };
      } catch (error) {
        return { status: 401, body: { message: String(error) } };
      }
    },
    hooks: {
      onRequest: (req, ...rest) => req.server.authenticate(req, ...rest),
    },
  },
  refresh: async ({ request, reply }) => {
    try {
      const { accessToken, refreshToken } =
        await AuthService.refreshAccessToken(request, reply);
      reply.setCookie(config.COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: config.IS_PRODUCTION,
        sameSite: "strict",
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
      return {
        status: 200,
        body: { accessToken, refreshToken },
      };
    } catch (error) {
      return { status: 401, body: { message: String(error) } };
    }
  },
  logout: {
    handler: async ({ request, reply }) => {
      try {
        await AuthService.logout(request);
        reply.clearCookie(config.COOKIE_NAME);
        return { status: 200, body: { message: "Logged out successfully" } };
      } catch (error) {
        return { status: 500, body: { message: String(error) } };
      }
    },
    hooks: {
      onRequest: (req, ...rest) => req.server.authenticate(req, ...rest),
    },
  },
});
