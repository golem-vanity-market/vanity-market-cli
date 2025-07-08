import { initServer } from "@ts-rest/fastify";
import * as AuthService from "./auth.service.ts";
import { contract } from "../../../../shared/contracts/index.ts";

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
  signIn: async ({ body, request }) => {
    try {
      const { message, signature } = body;
      if (!message || !signature) {
        return {
          status: 400,
          body: { message: "Message and signature are required" },
        };
      }
      const { token } = await AuthService.verifySignatureAndLogin(
        request.server,
        message,
        signature
      );
      return {
        status: 200,
        body: { accessToken: token, refreshToken: token },
      }; //TODO: refresh token
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
});
