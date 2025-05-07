import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

const router = express.Router();

router.get("/leaderboard", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const numberOfPlayers = await User.count();

    const users = await User.findAll({
      order: [["wins", "DESC"]],
      limit: 10,
    });

    const leaderboard = users.reduce((leaderboard, user, index) => {
      leaderboard.push({
        id: user.id,
        username: user.username,
        wins: user.wins,
        gamesPlayed: user.gamesPlayed,
        avatar: user.avatar,
        rank: index + 1,
        winRate: (user.wins / user.gamesPlayed) * 100 || 0,
      });

      return leaderboard;
    }, []);

    return res.status(200).json({ leaderboard, numberOfPlayers });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
