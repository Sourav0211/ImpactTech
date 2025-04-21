import express from "express";
import {
  signupController,
  signinController,
  createProfileController,
  updateProfileController,
  getProfileController,
} from "../controllers/authController.js";
import { requireSignIn } from "../middlewares/authMiddleware.js";

// router object
const router = express.Router();

//routing

//Signup || METHOD POST
router.post("/signup", signupController);

//Signin || METHOD POST
router.post("/signin", signinController);

router.post("/create-profile", requireSignIn, createProfileController)

router.put("/update-profile", requireSignIn, updateProfileController)

router.get("/get-profile", requireSignIn, getProfileController)

export default router;
