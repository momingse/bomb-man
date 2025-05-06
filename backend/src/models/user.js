import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const User = sequelize.define("User", {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  wins: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  gamesPlayed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  rank: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "🦸",
  },

});

export default User;
