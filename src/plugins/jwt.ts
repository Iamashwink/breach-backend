import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { env } from "@/initializers/load-env";

export const jwtPlugin = new Elysia({ name: "jwt" }).use(
  jwt({ name: "jwt", secret: env.JWT_SECRET, exp: "7d" })
);
