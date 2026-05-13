import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tafsirsRouter from "./tafsirs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tafsirsRouter);

export default router;
