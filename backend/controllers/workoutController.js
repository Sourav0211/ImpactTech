import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const createCustomWorkoutPlanController = async (req, res) => {
  const userId = req.user.id;

  try {
    const {
      goal,
      experienceLevel,
      availableEquipment = [],
      workoutDaysPerWeek,
      preferredWorkoutTime,
      injuries = [],
      sessionDurationMinutes,
      workoutType,
    } = req.body;

    // Get user fitness profile
    const profile = await prisma.fitnessProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return res.status(404).json({
        message:
          "Profile not found. Please complete your fitness profile first.",
      });
    }

    // Build prompt for OpenAI
    const prompt = `
      Create a personalized ${workoutType} workout plan for a ${
      profile.age
    }-year-old ${profile.gender} with the goal to ${goal}.
      Experience level: ${experienceLevel}.
      Available equipment: ${
        availableEquipment.join(", ") || "bodyweight only"
      }.
      Workout frequency: ${workoutDaysPerWeek} days/week, Preferred time: ${preferredWorkoutTime}, Duration: ${sessionDurationMinutes} mins per session.
      Injuries: ${injuries.join(", ") || "None"}.

      Return a structured 7-day JSON plan like this format:
      {
        "day1": {
          "focus": "Upper Body Strength",
          "exercises": [
            { "name": "Push-ups", "sets": 3, "reps": "12-15" },
            { "name": "Dumbbell Bench Press", "sets": 3, "reps": "10-12" }
          ]
        },
        "day2": { ... }
      }
    Return *only valid JSON*, no markdown or explanation.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // or gpt-4
      messages: [
        { role: "system", content: "You are a certified personal trainer." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const generatedPlan = response.choices[0].message.content;

    // Save to DB
    const savedPlan = await prisma.workoutPlan.create({
      data: {
        userId,
        goal,
        experienceLevel,
        availableEquipment,
        workoutDaysPerWeek,
        preferredWorkoutTime,
        injuries,
        sessionDurationMinutes,
        workoutType,
        planJson: JSON.parse(generatedPlan),
      },
    });

    return res.status(200).json({
      message: "Workout plan created successfully.",
      plan: savedPlan,
    });
  } catch (err) {
    console.error("Workout Plan Error:", err);
    return res.status(500).json({
      message: "Failed to generate workout plan.",
      error: err.message,
    });
  }
};

export const getAllWorkoutPlansController = async (req, res) => {
  const userId = req.user.id;

  try {
    const workoutPlans = await prisma.workoutPlan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      message: "Fetched all workout plans successfully.",
      count: workoutPlans.length,
      plans: workoutPlans,
    });
  } catch (error) {
    console.error("Get Workout Plans Error:", error);
    return res.status(500).json({
      message: "Failed to fetch workout plans.",
      error: error.message,
    });
  }
};

export const deleteWorkoutPlanController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the workout plan and check ownership
    const plan = await prisma.workoutPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      return res.status(404).json({ message: "Workout plan not found." });
    }

    if (plan.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized: Not your workout plan." });
    }

    // Delete the workout plan
    await prisma.workoutPlan.delete({
      where: { id },
    });

    res.status(200).json({
      message: "Workout plan deleted successfully.",
      deletedPlanId: id,
    });
  } catch (error) {
    console.error("Delete Workout Plan Error:", error);
    res
      .status(500)
      .json({ message: "Internal server error while deleting workout plan." });
  }
};

export const createWorkoutProgressController = async (req, res) => {
  try {
    // Get data from request body
    const { bodyWeight, exercises } = req.body;
    const userId = req.user.id;

    // Get the current date to calculate month and year
    const progressDate = new Date();
    const month = progressDate.getMonth() + 1; // getMonth() returns 0-11, so add 1
    const year = progressDate.getFullYear();

    // Calculate total volume lifted across all exercises
    let totalVolume = 0;
    exercises.forEach((exercise) => {
      const { weight, reps, sets } = exercise;
      const volume = weight * reps * sets;
      totalVolume += volume;
    });

    // Save workout progress into the database
    const workoutProgress = await prisma.workoutProgress.create({
      data: {
        userId,
        bodyWeight,
        exercises,
        month,
        year,
        date: progressDate, // Timestamp of the workout progress
        totalVolume, // Store the total volume
      },
    });

    return res.status(201).json({
      message: "Workout progress saved successfully.",
      progress: workoutProgress,
    });
  } catch (error) {
    console.error("Error saving workout progress:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const getVisualProgressController = async (req, res) => {
    try {
        const userId = req.user.id;
  
      // Fetch all workout progress records for the user, ordered by date
      const progressRecords = await prisma.workoutProgress.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      });
  
      // Check if the user has any progress records
      if (!progressRecords || progressRecords.length === 0) {
        return res.status(404).json({ message: "No workout progress found for this user." });
      }
  
      // Assuming the user has height stored in their profile (in cm)
      const userProfile = await prisma.FitnessProfile.findUnique({
        where: { userId: userId },
        select: { heightCm: true },
      });
  
      if (!userProfile || !userProfile.heightCm) {
        return res.status(400).json({ message: "User height not found." });
      }
  
      // Convert height from cm to meters for BMI calculation
      const heightInMeters = userProfile.heightCm / 100;
  
      // Process the data
      const progressData = progressRecords.map(record => {
        // Calculate BMI
        const bmi = (record.bodyWeight / (heightInMeters ** 2)).toFixed(2);
  
        return {
          date: record.date,
          month: record.month,
          year: record.year,
          bodyWeight: record.bodyWeight,
          bmi,
          totalVolume: record.totalVolume,
        };
      });
  
      // Return the visual progress data
      return res.status(200).json({
        message: "Fetched visual progress successfully.",
        data: progressData,
      });
    } catch (error) {
      console.error("Error fetching visual progress:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  };
  
