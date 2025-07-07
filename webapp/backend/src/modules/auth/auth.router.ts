import { initServer } from "@ts-rest/fastify";
import { contract } from "../../contracts/index.ts";
import * as AuthService from "./auth.service.ts";

const s = initServer();

export const authRouter = s.router(contract.auth, {
  signIn: async ({ body }) => {
    const { address, signature } = body;
    try {
      const { accessToken, refreshToken } =
        await AuthService.signInWithEthereum(address, signature);
      return { status: 200, body: { accessToken, refreshToken } };
    } catch (error) {
      return { status: 401, body: { message: String(error) } };
    }
  },
});
