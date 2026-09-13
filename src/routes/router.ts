import { Elysia } from "elysia";
import { authRoutes } from "@/routes/auth.routes";

export const router = new Elysia().use(authRoutes);
