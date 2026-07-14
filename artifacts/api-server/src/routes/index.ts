import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hostingRouter from "./hosting";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hostingRouter);
router.use(adminRouter);

export default router;
