import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sensorsRouter from "./sensors";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sensorsRouter);

export default router;
