const sequelize = require("../config/database");

async function syncDatabase() {
  try {
    console.log("Syncing database with model changes...");
    
    // Check current table structure
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
      ORDER BY ordinal_position
    `);
    
    console.log("Current columns:", columns.map(col => col.column_name));
    
    // Check if shippingStatus exists
    const hasShippingStatus = columns.some(col => col.column_name === 'shippingstatus');
    const hasTrackerId = columns.some(col => col.column_name === 'trackerid');
    
    console.log("shippingStatus exists:", hasShippingStatus);
    console.log("trackerId exists:", hasTrackerId);
    
    if (!hasShippingStatus) {
      console.log("Adding shippingStatus column...");
      await sequelize.query(`
        ALTER TABLE appointments 
        ADD COLUMN shippingStatus VARCHAR(20) DEFAULT 'draft'
      `);
      console.log("✅ shippingStatus column added");
    }
    
    if (!hasTrackerId) {
      console.log("Adding trackerId column...");
      await sequelize.query(`
        ALTER TABLE appointments 
        ADD COLUMN trackerId VARCHAR(255)
      `);
      console.log("✅ trackerId column added");
    }
    
    console.log("✅ Database sync completed successfully!");
    
  } catch (error) {
    console.error("❌ Database sync failed:", error);
    throw error;
  }
}

// Run sync
syncDatabase()
  .then(() => {
    console.log("Database sync completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Database sync failed:", error);
    process.exit(1);
  });