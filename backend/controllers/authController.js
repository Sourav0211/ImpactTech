import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { hash, compare } from "../helpers/scrypt.js";

const prisma = new PrismaClient();

export const signupController = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await hash(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        // role: type, // assuming your model has `role`
      },
    });

    // const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    //   expiresIn: "7d",
    // });

    return res.status(200).json({
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(400).json({ message: "Internal server error" });
  }
};

export const signinController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid Email" });
    }

    const isMatch = await compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Password" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const _id = user.id;
    return res.status(200).json({
      message: "Signin successful",
      token,
      _id,
    });
  } catch (error) {
    console.error("Signin Error:", error);
    return res.status(400).json({ message: "Internal server error" });
  }
};

export const createProfileController = async (req, res) => {
    const userId = req.user.id;
    try {
      const {
        gender,
        dateOfBirth,
        heightCm,
        weightKg,
        fitnessGoal,
        activityLevel,
        experienceLevel,
        medicalConditions,
        dietType,
        preferredWorkoutTime,
        profilePictureUrl,
      } = req.body;
  
      // Validate required fields
      if (
        !userId ||
        !gender ||
        !dateOfBirth ||
        !heightCm ||
        !weightKg ||
        !fitnessGoal ||
        !activityLevel ||
        !experienceLevel
      ) {
        return res.status(400).json({
          message: 'Missing required fields. Please ensure all fields are provided.',
        });
      }
  
      // Create profile in the database
      const profile = await prisma.fitnessProfile.create({
        data: {
          userId,
          gender,
          dateOfBirth: new Date(dateOfBirth),
          heightCm,
          weightKg,
          fitnessGoal,
          activityLevel,
          experienceLevel,
          medicalConditions: medicalConditions || null,
          dietType: dietType || null,
          preferredWorkoutTime: preferredWorkoutTime || null,
          profilePictureUrl: profilePictureUrl || null,
        },
      });
  
      // Respond with success message
      return res.status(200).json({
        message: 'Profile created successfully',
        profile,
      });
    } catch (error) {
      console.error('Profile creation error:', error);
      return res.status(500).json({
        message: 'Internal server error, unable to create profile.',
      });
    }
  };

export const updateProfileController = async (req, res) => {
    const userId = req.user.id;
  
    try {
      // Check if profile exists
      const existingProfile = await prisma.fitnessProfile.findUnique({
        where: { userId },
      });
  
      if (!existingProfile) {
        return res.status(400).json({
          message: "Profile not found. Please create a profile first.",
        });
      }
  
      // Prepare update data only with fields provided
      const {
        gender,
        dateOfBirth,
        heightCm,
        weightKg,
        fitnessGoal,
        activityLevel,
        experienceLevel,
        medicalConditions,
        dietType,
        preferredWorkoutTime,
        profilePictureUrl,
      } = req.body;
  
      const updateData = {
        ...(gender && { gender }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(heightCm && { heightCm }),
        ...(weightKg && { weightKg }),
        ...(fitnessGoal && { fitnessGoal }),
        ...(activityLevel && { activityLevel }),
        ...(experienceLevel && { experienceLevel }),
        ...(medicalConditions !== undefined && { medicalConditions }),
        ...(dietType !== undefined && { dietType }),
        ...(preferredWorkoutTime !== undefined && { preferredWorkoutTime }),
        ...(profilePictureUrl !== undefined && { profilePictureUrl }),
      };
  
      const updatedProfile = await prisma.fitnessProfile.update({
        where: { userId },
        data: updateData,
      });
  
      return res.status(200).json({
        message: "Profile updated successfully",
        updatedProfile,
      });
    } catch (error) {
      console.error("Profile update error:", error);
      return res.status(400).json({
        message: "Internal server error, unable to update profile.",
      });
    }
  };

export const getProfileController = async (req,res) => {

  const userId = req.user.id;

  try {
    const existingProfile = await prisma.fitnessProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      return res.status(400).json({
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      message: "Profile fetched successfully",
      profile: existingProfile,
    });


  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({
      message: "Internal server error while fetching profile.",
    });
  }
}
  
