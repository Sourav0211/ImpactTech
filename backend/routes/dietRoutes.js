import express from "express";
import { requireSignIn } from "../middlewares/authMiddleware.js";
import {
  createCustomDietPlanController,
  createCustomRecipeController,
  deleteDietPlanController,
  deleteRecipeController,
  getAllDietPlansController,
  getAllRecipesController,
  getCurrentDietPlanController,
  saveGeneratedRecipeController,
  updateDietPlanController,
} from "../controllers/dietController.js";

const router = express.Router();

router.post("/custom-plan", requireSignIn, createCustomDietPlanController);

router.get("/all-diet-plans", requireSignIn, getAllDietPlansController);

router.post("/custom-recipe", requireSignIn, createCustomRecipeController);

router.post("/save-recipe", requireSignIn, saveGeneratedRecipeController);

router.get("/get-all-recipes", requireSignIn, getAllRecipesController);

router.delete("/delete-diet/:id", requireSignIn, deleteDietPlanController);

router.delete("/delete-recipe/:id", requireSignIn, deleteRecipeController);

router.put("/set-diet/:dietPlanId", requireSignIn, updateDietPlanController);

router.get("/get-current-diet", requireSignIn, getCurrentDietPlanController);

export default router;
