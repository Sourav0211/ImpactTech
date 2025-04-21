import express from "express";
import { requireSignIn } from "../middlewares/authMiddleware.js";
import { createCustomDietPlanController } from "../controllers/dietController.js";

const router = express.Router();

router.post("/custom-plan", requireSignIn, createCustomDietPlanController);

export default router;
