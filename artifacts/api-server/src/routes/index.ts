import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sensorsRouter from "./sensors";
import integrationsRouter from "./integrations";

const router: IRouter = Router();

router.use("/health", healthRouter);
router.use(sensorsRouter);
router.use("/integrations", integrationsRouter);

export default router;
