import express from "express";
import {
  createCustomWorkoutPlanController,
  createWorkoutProgressController,
  deleteWorkoutPlanController,
  getAllWorkoutPlansController,
  getVisualProgressController,
} from "../controllers/workoutController.js";
import { requireSignIn } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post(
  "/custom-workout",
  requireSignIn,
  createCustomWorkoutPlanController
);

router.post("/progress", requireSignIn, createWorkoutProgressController);

router.get("/get-all-workouts", requireSignIn, getAllWorkoutPlansController);

router.get("/visual-progress",requireSignIn,getVisualProgressController );



router.delete("/delete/:id", requireSignIn, deleteWorkoutPlanController);


export default router;
