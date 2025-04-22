import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

let lastGeneratedRecipe = {}; // Temporary in-memory storage per session (you can replace with Redis for scalability)

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//create custom diet plan
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

//get all diet plans 
export const getAllDietPlansController = async (req, res) => {
    const userId = req.user.id;
  
    try {
      const plans = await prisma.dietPlan.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
  
      res.status(200).json({
        message: "All diet plans fetched successfully.",
        total: plans.length,
        plans,
      });
    } catch (error) {
      console.error("Fetch Diet Plans Error:", error);
      res.status(500).json({
        message: "Failed to fetch diet plans.",
        error: error.message,
      });
    }
  };


export const createCustomRecipeController = async (req, res) => {
  const userId = req.user.id;
  try {
    const {
      title,
      targetCalories,
      targetProtein,
      targetFat,
    } = req.body;

    if (!title || !targetCalories || !targetProtein || !targetFat) {
      return res.status(400).json({
        message: "Please provide title, calories, protein, and fat.",
      });
    }

    const prompt = `
      Create a modified version of the recipe titled "${title}".
      The final dish should have approximately:
      - ${targetCalories} calories
      - ${targetProtein}g protein
      - ${targetFat}g fat

      Respond in valid JSON format like:
            {
            "title": "...",
            "ingredients": ["...", "..."],
            "instructions": "...",
            "calories": ...,
            "protein": ...,
            "fat": ...
            }
    Return *only valid JSON*, no markdown or explanation.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a nutritionist and professional chef." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    const recipeData = JSON.parse(content);

    // Save in temporary memory
    lastGeneratedRecipe[userId] = recipeData;

    return res.status(200).json({
      message: "Recipe generated successfully. Use /recipes/save to store it.",
      recipe: recipeData,
    });
  } catch (error) {
    console.error("Generate Recipe Error:", error);
    return res.status(500).json({ message: "Failed to generate recipe." });
  }
};

export const saveGeneratedRecipeController = async (req, res) => {
    const userId = req.user.id;
  
    try {
      const recipe = lastGeneratedRecipe[userId];
      if (!recipe) {
        return res.status(404).json({
          message: "No generated recipe found. Please generate one first.",
        });
      }
  
      await prisma.recipe.create({
        data: {
          userId,
          title: recipe.title,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          calories: recipe.calories,
          protein: recipe.protein,
          fat: recipe.fat,
        },
      });
  
      // Clear it from memory
      delete lastGeneratedRecipe[userId];
  
      return res.status(201).json({
        message: "Recipe saved successfully.",
      });
    } catch (error) {
      console.error("Save Recipe Error:", error);
      return res.status(500).json({ message: "Failed to save recipe." });
    }
  };
  
export const getAllRecipesController = async (req, res) => {
    const userId = req.user.id;
  
    try {
      const recipes = await prisma.recipe.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
  
      return res.status(200).json({
        message: "Recipes fetched successfully.",
        recipes,
      });
    } catch (error) {
      console.error("Get All Recipes Error:", error);
      return res.status(500).json({ message: "Failed to fetch recipes." });
    }
  };


export const deleteDietPlanController = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
  
      // Find the workout plan and check ownership
      const plan = await prisma.dietPlan.findUnique({
        where: { id },
      });
  
      if (!plan) {
        return res.status(404).json({ message: "Diet plan not found." });
      }
  
      if (plan.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized: Not your diet plan." });
      }
  
      // Delete the workout plan
      await prisma.dietPlan.delete({
        where: { id },
      });
  
      res.status(200).json({
        message: "Diet plan deleted successfully.",
        deletedDietPlanId: id,
      });
    } catch (error) {
      console.error("Delete Diet Plan Error:", error);
      res.status(500).json({ message: "Internal server error while deleting diet plan." });
    }
  };

  export const deleteRecipeController = async (req, res) => {
      try {
        const { id } = req.params;
        const userId = req.user.id;
    
        // Find the workout plan and check ownership
        const plan = await prisma.recipe.findUnique({
          where: { id },
        });
    
        if (!plan) {
          return res.status(404).json({ message: "Recipe plan not found." });
        }
    
        if (plan.userId !== userId) {
          return res.status(403).json({ message: "Unauthorized: Not your Recipe plan." });
        }
    
        // Delete the workout plan
        await prisma.recipe.delete({
          where: { id },
        });
    
        res.status(200).json({
          message: "Recipe deleted successfully.",
          DeletedRecipeId: id,
        });
      } catch (error) {
        console.error("Delete Recipe Plan Error:", error);
        res.status(500).json({ message: "Internal server error while deleting Recipe." });
      }
    };



//Set the diet plan
export const setDietPlanController = async (req, res) => {
  const { dietPlanId } = req.params;
  const userId = req.user.id; // Assuming you're passing the logged-in user's ID in `req.userId`

  try {
    // Check if a UserCurrentPlan exists for the user
    let currentPlan = await prisma.userCurrentPlan.findUnique({
      where: { userId }
    });

    // If UserCurrentPlan doesn't exist, create a new one
    if (!currentPlan) {
      currentPlan = await prisma.userCurrentPlan.create({
        data: {
          userId,
          currentDietPlanId: dietPlanId
        }
      });
    } else {
      // If UserCurrentPlan exists, update the current diet plan
      currentPlan = await prisma.userCurrentPlan.update({
        where: { userId },
        data: { currentDietPlanId: dietPlanId }
      });
    }

    return res.status(200).json({ message: 'Diet plan set successfully!', currentPlan });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error setting diet plan' });
  }
};

