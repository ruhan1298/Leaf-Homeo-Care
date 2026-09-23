const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    logging: false,
    timezone: '+05:30', // IST timezone (same for local and production)
    dialectOptions: {
    
    }
  }
);

module.exports = sequelize;