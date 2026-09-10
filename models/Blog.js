const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Blog = sequelize.define(
  "Blog",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    Image: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Title cannot be empty"
        }
      }
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    type: {
      type: DataTypes.ENUM("Patient", "Doctor"),
      allowNull: false,
      defaultValue: "Patient",
      validate: {
        isIn: {
          args: [["Patient", "Doctor"]],
          msg: "Type must be either Patient or Doctor"
        }
      }
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Blog;