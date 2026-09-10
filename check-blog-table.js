// Check if Blog table exists and its structure
const sequelize = require('./config/database');
const Blog = require('./models/Blog');

async function checkBlogTable() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    console.log('\nSyncing Blog model...');
    await Blog.sync({ alter: true });
    console.log('✅ Blog table synced');

    console.log('\nChecking table structure...');
    const tableInfo = await sequelize.getQueryInterface().describeTable('Blogs');
    console.log('Table structure:', JSON.stringify(tableInfo, null, 2));

    console.log('\nTesting blog creation...');
    const testBlog = await Blog.create({
      title: 'Test Blog',
      description: '<p>Test description</p>',
      type: 'Patient',
      Image: null
    });
    console.log('✅ Test blog created:', testBlog.toJSON());

    console.log('\nFetching all blogs...');
    const blogs = await Blog.findAll();
    console.log('✅ Total blogs:', blogs.length);

    // Clean up test blog
    await testBlog.destroy();
    console.log('✅ Test blog cleaned up');

    console.log('\n✅ All checks passed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

checkBlogTable();