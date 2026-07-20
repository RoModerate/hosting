import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";

const SESSION_SECRET = process.env["SESSION_SECRET"];
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required.");
}

const app: Express = express();

// ─── Security headers ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // handled by Vite/frontend
  crossOriginEmbedderPolicy: false,
}));

// ─── Request logging ─────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));

// ─── Trust proxy (required for accurate IP behind Replit's reverse proxy) ────
app.set("trust proxy", 1);

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(cookieParser(SESSION_SECRET));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ─── Rate limiting ───────────────────────────────────────────────────────────
// General API rate limit: 300 req/min per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
  skip: (req) => req.path === "/healthz",
});

// Auth endpoints: stricter — 20 req/min per IP
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please wait a moment." },
});

// AI chat: 30 req/min per IP (each call can be expensive)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI rate limit reached. Please wait a moment before sending another message." },
});

app.use("/api", generalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/ai", aiLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Global error handler ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  const status = (err as any)?.status ?? (err as any)?.statusCode ?? 500;
  logger.error({ err }, "Unhandled route error");
  res.status(status).json({ error: status >= 500 ? "An internal error occurred." : message });
});

export default app;
