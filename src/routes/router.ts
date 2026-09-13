import { Elysia } from "elysia";
import { authRoutes } from "./auth.routes";

export const router = new Elysia().use(authRoutes);
