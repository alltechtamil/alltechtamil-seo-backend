import axios from 'axios';
import logger from '../utils/logger';

const BASE_URL = 'http://localhost:5000/api/v1/public';

/**
 * Utility to make HTTP requests and log the output cleanly
 */
const testEndpoint = async (method: 'GET' | 'POST', path: string, payload?: any) => {
  try {
    const url = `${BASE_URL}${path}`;
    const start = Date.now();
    const response = await axios({
      method,
      url,
      data: payload,
      validateStatus: () => true, // Don't throw on 4xx/5xx
    });
    const duration = Date.now() - start;

    const statusObj = response.status === 200 ? `✅ ${response.status}` : `❌ ${response.status}`;
    
    // Determine data size/length to show it works
    let snippet = '';
    if (response.data && response.data.data) {
      if (Array.isArray(response.data.data)) {
        snippet = `(Array: ${response.data.data.length} items)`;
      } else {
        snippet = `(Object returned)`;
      }
    }

    logger.info(`[${method}] ${path.padEnd(40)} -> ${statusObj} in ${duration}ms ${snippet}`);
    
    if (response.status !== 200) {
      logger.info(`   └─ Message: ${response.data.message || 'No message'}`);
    }
  } catch (error) {
    logger.info(`[${method}] ${path.padEnd(40)} -> ❌ Error: ${(error as Error).message}`);
  }
};

/**
 * Main Test Runner
 */
const runTests = async () => {
  logger.info('==================================================');
  logger.info('🔍 VERIFYING ALL PUBLIC API ENDPOINTS');
  logger.info('==================================================\n');

  // 1. Blogs
  await testEndpoint('GET', '/blogs');
  await testEndpoint('GET', '/blogs/public-api-test-blog'); // Using known slug from backup
  
  // 2. Search & Filters
  await testEndpoint('GET', '/search?q=test');
  // 3. Categories
  const categoriesRes = await axios.get(`${BASE_URL}/categories`);
  const catList = categoriesRes.data?.data || [];

  await testEndpoint('GET', '/categories');
  if (catList.length > 0) {
    const existingCatSlug = catList[0].slug;
    await testEndpoint('GET', `/categories/${existingCatSlug}`);
    await testEndpoint('GET', `/search/category/${existingCatSlug}`);
  } else {
    logger.info('   └─ Skipped GET /categories/:slug (No categories found in DB)');
  }
  // 4. Tags
  const tagsRes = await axios.get(`${BASE_URL}/tags`);
  const tagsList = tagsRes.data?.data || [];
  
  await testEndpoint('GET', '/tags');
  if (tagsList.length > 0) {
    const existingTagSlug = tagsList[0].slug;
    await testEndpoint('GET', `/tags/${existingTagSlug}`);
    await testEndpoint('GET', `/search/tag/${existingTagSlug}`);
  } else {
    logger.info('   └─ Skipped GET /tags/:slug (No tags found in DB)');
  }
  
  // 5. Ads
  await testEndpoint('GET', '/ads?placement=HOME_TOP');
  
  // 6. Analytics Tracking (POST)
  await testEndpoint('POST', '/analytics/track/view', {
    blogId: '9dd47567-a479-4d48-b256-8fea92913307', // Known blog UUID from backup
    readTimeSec: 15,
    isBounce: false
  });

  logger.info('\n==================================================');
  logger.info('✅ TEST COMPLETE. If you see 404s, restart the server!');
  logger.info('==================================================');
};

// Execute
runTests();
