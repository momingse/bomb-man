import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import session from "express-session";
import SequelizeStore from "connect-session-sequelize";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { httpLogger } from "./logger.js";
import { createServer } from "http";
import { socketHandler } from "./socket.js";

// Import database configuration
import sequelize from "./config/db.js";

// Import routes
import authRoute from "./routes/auth.js";
import userRoute from "./routes/user.js";

// Import models
import "./models/User.js";

dotenv.config();

const expressApp = express();
const httpServer = createServer(expressApp);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

socketHandler(io);

expressApp.use(httpLogger);

const SessionStore = SequelizeStore(session.Store);
const store = new SessionStore({
  db: sequelize,
});

expressApp.use(bodyParser.json());
expressApp.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

expressApp.use(
  session({
    secret: process.env.SESSION_SECRET || "secret-key",
    store: store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  }),
);

// Routes
expressApp.use("/auth", authRoute);
expressApp.use("/user", userRoute);

// Basic route for testing
expressApp.get("/", (req, res) => {
  res.send("API is running");
});

const startServer = async () => {
  try {
    await sequelize.sync();
    await store.sync();
    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
  }
};

startServer();
