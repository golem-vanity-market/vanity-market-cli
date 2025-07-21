import fp from "fastify-plugin";
import { AppError } from "../errors/index.ts";

export default fp(async (fastify) => {
  fastify.setErrorHandler(async (error, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({
        message: error.message,
        code: error.code,
      });
      return;
    }
    reply.code(500).send({
      message: "Internal Server Error",
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});
