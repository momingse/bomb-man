import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import EMOJI from "../constants/emoji.js";
import { logger } from "../logger.js";
import { Op } from "sequelize";

const router = express.Router();

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Create new user
    const numberOfUsers = await User.count();
    const avatar = EMOJI[numberOfUsers % EMOJI.length];
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await User.create({
      username,
      password: hashedPassword,
      avatar,
    });

    // Return user without password
    const userData = {
      id: user.id,
      username: user.username,
      wins: user.wins,
      gamesPlayed: user.gamesPlayed,
      avatar: user.avatar,
      rank: numberOfUsers + 1,
    };
    req.session.user = userData;

    return res.status(201).json({
      message: "User registered successfully",
      user: userData,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res
      .status(500)
      .json({ message: "Server error during registration" });
  }
});

// Login existing user
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const rank =
      (await User.count({
        where: {
          wins: {
            [Op.gt]: user.wins,
          },
        },
      })) + 1;

    // Set session
    const userData = {
      id: user.id,
      username: user.username,
      wins: user.wins,
      gamesPlayed: user.gamesPlayed,
      avatar: user.avatar,
      rank,
    };
    req.session.user = userData;

    return res.status(200).json({
      message: "Login successful",
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Could not log out" });
    }
    res.clearCookie("connect.sid");
    return res.status(200).json({ message: "Logged out successfully" });
  });
});

// Get current user
router.get("/me", async (req, res) => {
  if (req.session.user) {
    // update req.session.user
    const user = await User.findByPk(req.session.user.id);
    const rank =
      (await User.count({
        where: {
          wins: {
            [Op.gt]: user.wins,
          },
        },
      })) + 1;
    req.session.user = {
      id: user.id,
      username: user.username,
      wins: user.wins,
      gamesPlayed: user.gamesPlayed,
      avatar: user.avatar,
      rank,
    };
    return res.status(200).json({ user: req.session.user });
  }
  return res.status(401).json({ message: "Not authenticated" });
});

export default router;
