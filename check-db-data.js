const sequelize = require('./config/database');
const { TermsConditions, PrivacyPolicy } = require('./models');

async function checkDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    const terms = await TermsConditions.findOne();
    const privacy = await PrivacyPolicy.findOne();

    console.log('\n=== Database Data Check ===');
    console.log('Terms & Conditions:', terms ? '✅ Found' : '❌ Not found');
    console.log('Privacy Policy:', privacy ? '✅ Found' : '❌ Not found');

    if (terms) {
      console.log('\n--- Terms & Conditions Data ---');
      console.log('ID:', terms.id);
      console.log('Text length:', terms.text?.length || 0);
      console.log('Created at:', terms.createdAt);
      console.log('Updated at:', terms.updatedAt);
    }

    if (privacy) {
      console.log('\n--- Privacy Policy Data ---');
      console.log('ID:', privacy.id);
      console.log('Text length:', privacy.text?.length || 0);
      console.log('Created at:', privacy.createdAt);
      console.log('Updated at:', privacy.updatedAt);
    }

    await sequelize.close();
    console.log('\n✅ Database check completed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
