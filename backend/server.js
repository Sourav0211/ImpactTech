import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import colors from "colors";
import authRoutes from "./routes/authRoutes.js";
import dietRoutes from "./routes/dietRoutes.js";
import workoutRoutes from "./routes/workoutRoutes.js";
import chatRoutes from "./routes/chatRoutes.js"

//configure env
dotenv.config();

const app = express();

//middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/diet", dietRoutes);
app.use("/api/v1/workout", workoutRoutes);
app.use("/api/v1/chat",chatRoutes);

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("<h1>Welcome to My App</h1>");
});

app.listen(PORT, () => {
  console.log(
    `App is running in ${process.env.DEV_MODE} on ${PORT}`.bgGreen.white
  );
});
