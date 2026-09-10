// Simple test script to check blog API
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_URL = 'http://localhost:5000';

async function testBlogAPI() {
  try {
    console.log('Testing Blog API...\n');

    // Test 1: Get blogs (public route)
    console.log('1. Testing Get Blogs (Public)...');
    try {
      const getResponse = await axios.get(`${API_URL}/api/v1/admin/get-blogs`);
      console.log('Get Response:', getResponse.data);
    } catch (error) {
      console.error('Get Blogs Error:', error.response ? error.response.data : error.message);
    }

    // Test 2: Create a blog (needs auth)
    console.log('\n2. Testing Create Blog (with auth)...');
    const formData = new FormData();
    formData.append('title', 'Test Blog');
    formData.append('description', '<p>This is a test blog description</p>');
    formData.append('type', 'Patient');

    try {
      const createResponse = await axios.post(`${API_URL}/api/v1/admin/add-blog`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
        }
      });
      console.log('Create Response:', createResponse.data);
    } catch (error) {
      console.error('Create Blog Error:', error.response ? error.response.data : error.message);
    }

  } catch (error) {
    console.error('General Error:', error.response ? error.response.data : error.message);
  }
}

testBlogAPI();