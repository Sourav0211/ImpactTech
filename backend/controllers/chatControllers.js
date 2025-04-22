import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const createDailyLogController = async (req, res) => {
  const { workoutDone, dietFollowed, notes } = req.body;
  const userId = req.user.id; // Assuming you're passing the logged-in user's ID in `req.userId`

  const today = new Date();
  const date = today.toISOString().split("T")[0]; // Format as YYYY-MM-DD

  try {
    // Get current workout and diet plan for the user
    const currentPlan = await prisma.userCurrentPlan.findUnique({
      where: { userId },
    });

    if (!currentPlan) {
      return res.status(400).json({
        message: "User does not have a current workout or diet plan.",
      });
    }

    // Create daily log entry
    const dailyLog = await prisma.dailyLog.create({
      data: {
        userId,
        date: new Date(date),
        workoutPlanId: currentPlan.currentWorkoutPlanId,
        dietPlanId: currentPlan.currentDietPlanId,
        workoutDone,
        dietFollowed,
        notes,
      },
    });

    return res
      .status(200)
      .json({ message: "Daily log created successfully!", dailyLog });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error creating daily log" });
  }
};

export const getAiResponseController = async (req, res) => {
  const { query } = req.body; // Extract user query from the request body
  const userId = req.user.id; // Get user ID from authenticated user (e.g., from JWT token)

  try {
    // Fetch user's current workout and diet plans (relationships based on userId)
    const currentPlan = await prisma.userCurrentPlan.findUnique({
      where: { userId },
      //   include: {
      //     currentWorkoutPlan: true, // Including related workout plan
      //     currentDietPlan: true, // Including related diet plan
      //   },
    });

    // Debugging: Log the fetched currentPlan
    console.log("Fetched currentPlan: ", currentPlan);

    if (
      !currentPlan ||
      !currentPlan.currentWorkoutPlanId ||
      !currentPlan.currentDietPlanId
    ) {
      return res.status(404).json({ error: "User current plans not found." });
    }


    

    // Fetch the user's current workout plan and diet plan
    // const userWorkoutPlan = currentPlan.currentWorkoutPlan;

    const userWorkoutPlan = await prisma.workoutPlan.findUnique({
        where : { id: currentPlan.currentWorkoutPlanId}
    })
    const userDietPlan = await prisma.dietPlan.findUnique({
        where : {
            id: currentPlan.currentDietPlanId
        }
    })

    // Debugging: Log the current workout and diet plan
    // console.log("Current workout plan: ", userWorkoutPlan);
    // console.log("Current diet plan: ", userDietPlan);

    // Fetch last 7 days of daily logs
    const dailyLogs = await prisma.dailyLog.findMany({
      where: { userId },
      take: 7,
      orderBy: { date: "desc" },
    });

    // Construct the prompt to send to OpenAI
    const lastWeekProgress = dailyLogs.map((log) => ({
      date: log.date,
      workoutDone: log.workoutDone,
      dietFollowed: log.dietFollowed,
      notes: log.notes,
    }));

    const prompt = `
              The user’s current workout plan is: ${
                userWorkoutPlan.goal
              } with a focus on ${userWorkoutPlan.workoutType}.
              Their daily logs for the past week show the following progress:
              ${lastWeekProgress
                .map(
                  (log) =>
                    `On ${log.date}: Workout done: ${log.workoutDone}, Diet followed: ${log.dietFollowed}, Notes: ${log.notes}`
                )
                .join("\n")}
              The user’s current diet plan is for: ${
                userDietPlan.goal
              } and includes meals tailored for ${userDietPlan.dietType}.
              Based on this information, the user asked: "${query}".
              Please provide a personalized response.
          `;

    // Get AI response from OpenAI
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Use GPT-3.5 Turbo
      messages: [{ role: "user", content: prompt }],
    });

    // Return the AI response to the client
    return res.json({
      response: aiResponse.choices[0].message.content.trim(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate AI response" });
  }
};
