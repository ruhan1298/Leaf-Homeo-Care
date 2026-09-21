const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

async function up() {
  try {
    await sequelize.getQueryInterface().addColumn('appointments', 'shiprocketOrderId', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    console.log('✅ Added shiprocketOrderId column to appointments table');
  } catch (error) {
    console.error('❌ Error adding column:', error);
  }
}

async function down() {
  try {
    await sequelize.getQueryInterface().removeColumn('appointments', 'shiprocketOrderId');
    console.log('✅ Removed shiprocketOrderId column from appointments table');
  } catch (error) {
    console.error('❌ Error removing column:', error);
  }
}

if (require.main === module) {
  up().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { up, down };