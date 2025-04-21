import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const createCustomDietPlanController = async (req, res) => {
  const userId = req.user.id;

  try {
    const {
      goal,
      dietType,
      activityLevel,
      mealsPerDay,
      dislikes = [],
      allergies = [],
      cuisinePreference,
      budget,
    } = req.body;

    // Fetch user profile
    const profile = await prisma.fitnessProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return res.status(404).json({
        message: "Profile not found. Please create your fitness profile first.",
      });
    }

    const age = profile.dateOfBirth
      ? new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear()
      : 25;

    // Prompt with macros per meal
    const prompt = `
Generate a 3-day personalized ${dietType} diet plan for a ${age}-year-old ${profile.gender}.
Height: ${profile.heightCm} cm, Weight: ${profile.weightKg} kg.
Goal: ${goal}, Activity Level: ${activityLevel}, Meals per day: ${mealsPerDay}.
Dislikes: ${dislikes.join(", ") || "None"}, Allergies: ${
      allergies.join(", ") || "None"
    }.
Cuisine Preference: ${cuisinePreference || "Any"}, Budget: ${
      budget || "Moderate"
    }.

Each meal should include:
- 3 food options under "items"
- Estimated "calories" in kcal
- Estimated "protein" in grams
- Estimated "fat" in grams

Respond in valid JSON format like:
{
  "day1": {
    "breakfast": {
      "items": ["Option 1", "Option 2"],
      "calories": 350,
      "protein": 25,
      "fat": 12
    },
    "lunch": {
      ...
    },
    "dinner": {
      ...
    }
  },
  ...
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a professional nutritionist." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    let generatedPlan = response.choices[0].message.content.trim();

    // Clean and parse JSON
    if (generatedPlan.startsWith("```")) {
      generatedPlan = generatedPlan
        .replace(/^```(?:json)?/, "")
        .replace(/```$/, "")
        .trim();
    }

    let parsedPlan;
    try {
      parsedPlan = JSON.parse(generatedPlan);
    } catch (err) {
      console.error("JSON parse error:", err);
      return res.status(500).json({
        message: "Failed to parse the generated diet plan.",
        rawOutput: generatedPlan,
      });
    }

    // Save to DB
    const saved = await prisma.dietPlan.create({
      data: {
        userId,
        goal,
        dietType,
        activityLevel,
        mealsPerDay,
        dislikes,
        allergies,
        cuisinePreference,
        budget,
        planJson: parsedPlan,
      },
    });

    return res.status(200).json({
      message: "Custom diet plan generated and saved successfully.",
      plan: parsedPlan,
      id: saved.id,
    });
  } catch (err) {
    console.error("Diet Plan Error:", err);
    return res.status(500).json({
      message: "Failed to generate diet plan.",
      error: err.message,
    });
  }
};


