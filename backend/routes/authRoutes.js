import express from "express";
import {
  signupController,
  signinController,
  createProfileController,
  updateProfileController,
} from "../controllers/authController.js";
import { requireSignIn } from "../middlewares/authMiddleware.js";

// router object
const router = express.Router();

//routing

//Signup || METHOD POST
router.post("/signup", signupController);

//Signin || METHOD POST
router.post("/signin", signinController);

router.post("/profile", requireSignIn, createProfileController)

router.put("/update-profile", requireSignIn, updateProfileController)

export default router;
