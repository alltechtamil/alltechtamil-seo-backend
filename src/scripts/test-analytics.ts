/* eslint-disable no-console */
import axios from 'axios';
import { connectDB, sequelize } from '../config/database';
import { AnalyticsService } from '../services/analytics.service';
import Blog from '../models/Blog';
import { BlogStatus } from '../types/enums';

const API_URL = 'http://localhost:5000/api/v1';

async function testAnalytics() {
  await connectDB();

  // 1. Get Admin Token
  console.log('\n[1] Logging in as Admin...');
  const loginRes = await axios.post(`${API_URL}/auth/login`, {
    email: 'admin@alltectamil.com',
    password: 'Admin@123',
  });
  const token = loginRes.data.data.accessToken;
  console.log(`✅ Logged in successfully.`);

  // 2. Fetch a published blog
  console.log('\n[2] Fetching a published blog from DB...');
  const blog = await Blog.findOne({ where: { status: BlogStatus.PUBLISHED } });
  if (!blog) {
    console.log('❌ No published blogs found. Run seed script first.');
    process.exit(1);
  }
  const blogId = blog.id;
  console.log(`✅ Using Blog ID: ${blogId}`);

  // 3. Test tracking endpoint: send 3 requests
  console.log('\n[3] Testing POST /api/v1/analytics/track/view (Sending 3 requests)...');
  for (let i = 1; i <= 3; i++) {
    const res = await axios.post(
      `${API_URL}/analytics/track/view`,
      {
        blogId,
        readTimeSec: 30 * i,
        isBounce: false,
      },
      {
        headers: {
          'X-Forwarded-For': `192.168.1.${i}`,
          'User-Agent': `TestAgent-${i}`,
        },
      }
    );
    console.log(`Request ${i}: HTTP ${res.status} - ${res.data.message}`);
  }

  // 4. Test Search to generate some search trends
  console.log('\n[4] Simulating a search query to test search trends...');
  await axios.get(`${API_URL}/public/search?q=typescript`);

  console.log('\n⏳ Waiting 2 seconds for async DB writes to complete...');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 5. Manually trigger aggregation
  console.log('\n[5] Manually triggering Analytics Aggregator Job...');
  const aggRes = await AnalyticsService.aggregateBlogAnalytics();
  console.log(`✅ Aggregation complete. Updated ${aggRes.updatedCount} blogs.`);

  // 6. Test Overview Endpoint
  console.log('\n[6] Testing GET /api/v1/analytics/overview...');
  const overviewRes = await axios.get(`${API_URL}/analytics/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('✅ Overview Response:');
  console.log(JSON.stringify(overviewRes.data.data, null, 2));

  // 7. Test Blog Stats Endpoint
  console.log(`\n[7] Testing GET /api/v1/analytics/blogs/${blogId}...`);
  const statsRes = await axios.get(`${API_URL}/analytics/blogs/${blogId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('✅ Blog Stats Response:');
  console.log(JSON.stringify(statsRes.data.data, null, 2));

  // 8. Test Search Trends Endpoint
  console.log('\n[8] Testing GET /api/v1/analytics/search-trends...');
  const trendsRes = await axios.get(`${API_URL}/analytics/search-trends`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('✅ Search Trends Response:');
  console.log(JSON.stringify(trendsRes.data.data, null, 2));

  await sequelize.close();
  console.log('\n🎉 All Analytics Tests Completed Successfully!');
}

testAnalytics().catch((err) => {
  console.error('\n❌ Test failed:', err.response?.data || err.message);
  sequelize.close();
});
