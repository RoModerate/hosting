import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hostingRouter from "./hosting";
import adminRouter from "./admin";
import filesRouter from "./files";
import githubRouter from "./github";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hostingRouter);
router.use(adminRouter);
router.use(filesRouter);
router.use(githubRouter);

export default router;
