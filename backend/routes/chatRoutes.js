import express from "express"
import { requireSignIn } from "../middlewares/authMiddleware.js";
import { createDailyLogController, getAiResponseController } from "../controllers/chatControllers.js";

const router = express.Router();


router.post("/create-daily-logs",requireSignIn, createDailyLogController);

router.post("/ai-coach",requireSignIn,getAiResponseController);

export default router;