import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hostingRouter from "./hosting";
import adminRouter from "./admin";
import filesRouter from "./files";
import githubRouter from "./github";
import aiRouter from "./ai";
import discordAuthRouter from "./discord-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hostingRouter);
router.use(adminRouter);
router.use(filesRouter);
router.use(githubRouter);
router.use(aiRouter);
router.use(discordAuthRouter);

export default router;
