const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:5000/api/v1';

async function run() {
  try {
    const loginRes = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: 'admin@alltectamil.com',
      password: 'Admin@123'
    });
    
    const token = loginRes.data.data.accessToken;

    const htmlContent = fs.readFileSync(path.join(__dirname, 'script.txt'), 'utf8');

    const blogPayload = {
      content_html: htmlContent
    };

    const blogRes = await axios.put(`${BASE_URL}/admin/blogs/72424c69-53fa-4338-94c3-d43710b0c491`, blogPayload, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Blog update success!');
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

run();
