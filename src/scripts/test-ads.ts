/* eslint-disable no-console */
import axios from 'axios';
import { connectDB, sequelize } from '../config/database';
import { AdPlacement, AdDeviceTarget } from '../types/enums';

const API_URL = 'http://localhost:5000/api/v1';

async function testAds() {
  await connectDB();

  // 1. Get Admin Token
  console.log('\n[1] Logging in as Admin...');
  const loginRes = await axios.post(`${API_URL}/auth/login`, {
    email: 'admin@alltectamil.com',
    password: 'Admin@123',
  });
  const token = loginRes.data.data.accessToken;
  console.log(`✅ Logged in successfully.`);

  // 2. Create Active Ad (HOME_TOP)
  console.log('\n[2] Creating Active Ad (HOME_TOP, ALL)...');
  const ad1Res = await axios.post(
    `${API_URL}/ads`,
    {
      name: 'Test Ad 1 (Active)',
      placement: AdPlacement.HOME_TOP,
      ad_script: '<script>console.log("ad1")</script>',
      device_target: AdDeviceTarget.ALL,
      sort_order: 1,
      is_active: true,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const ad1Id = ad1Res.data.data.id;
  console.log(`✅ Created Ad 1: ${ad1Id}`);

  // 3. Create Inactive Ad (HOME_TOP)
  console.log('\n[3] Creating Inactive Ad (HOME_TOP, ALL)...');
  const ad2Res = await axios.post(
    `${API_URL}/ads`,
    {
      name: 'Test Ad 2 (Inactive)',
      placement: AdPlacement.HOME_TOP,
      ad_script: '<script>console.log("ad2")</script>',
      device_target: AdDeviceTarget.ALL,
      sort_order: 2,
      is_active: false,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const ad2Id = ad2Res.data.data.id;
  console.log(`✅ Created Ad 2: ${ad2Id}`);

  // 4. Create Desktop-specific Ad (BLOG_SIDEBAR)
  console.log('\n[4] Creating Desktop Ad (BLOG_SIDEBAR, DESKTOP)...');
  const ad3Res = await axios.post(
    `${API_URL}/ads`,
    {
      name: 'Test Ad 3 (Desktop Only)',
      placement: AdPlacement.BLOG_SIDEBAR,
      ad_script: '<script>console.log("ad3")</script>',
      device_target: AdDeviceTarget.DESKTOP,
      sort_order: 1,
      is_active: true,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const ad3Id = ad3Res.data.data.id;
  console.log(`✅ Created Ad 3: ${ad3Id}`);

  // 5. Test Public Query (HOME_TOP) - should exclude inactive ad
  console.log('\n[5] Testing Public GET /ads?placement=HOME_TOP (Should only return active Ad 1)...');
  const publicRes1 = await axios.get(`${API_URL}/ads?placement=${AdPlacement.HOME_TOP}`);
  const publicAds1 = publicRes1.data.data;
  console.log(`Returned ${publicAds1.length} ad(s).`);
  if (publicAds1.length === 1 && publicAds1[0].id === ad1Id) {
    console.log(`✅ Success: Inactive ads were correctly hidden!`);
  } else {
    console.log(`❌ Failed: Returned unexpected ads.`);
    console.log(publicAds1);
  }

  // 6. Test Public Query with Device Filter
  console.log('\n[6] Testing Public GET /ads?placement=BLOG_SIDEBAR&device_target=desktop (Should return Ad 3)...');
  const publicRes2 = await axios.get(
    `${API_URL}/ads?placement=${AdPlacement.BLOG_SIDEBAR}&device_target=${AdDeviceTarget.DESKTOP}`
  );
  const publicAds2 = publicRes2.data.data;
  console.log(`Returned ${publicAds2.length} ad(s).`);
  if (publicAds2.length > 0 && publicAds2.some((a: any) => a.id === ad3Id)) {
    console.log(`✅ Success: Device filter correctly captured the Desktop ad!`);
  } else {
    console.log(`❌ Failed: Desktop ad was missing.`);
  }

  // 7. Test Admin Query (getAll)
  console.log('\n[7] Testing Admin GET /ads (Should return all ads including inactive)...');
  const adminRes = await axios.get(`${API_URL}/ads`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const allAds = adminRes.data.data;
  const foundTestAds = allAds.filter((a: any) => [ad1Id, ad2Id, ad3Id].includes(a.id));
  console.log(`Admin query found ${foundTestAds.length} of our test ads.`);
  if (foundTestAds.length === 3) {
    console.log(`✅ Success: Admin endpoint correctly bypassed active/device filters!`);
  }

  // 8. Cleanup
  console.log('\n[8] Cleaning up test ads...');
  await axios.delete(`${API_URL}/ads/${ad1Id}`, { headers: { Authorization: `Bearer ${token}` } });
  await axios.delete(`${API_URL}/ads/${ad2Id}`, { headers: { Authorization: `Bearer ${token}` } });
  await axios.delete(`${API_URL}/ads/${ad3Id}`, { headers: { Authorization: `Bearer ${token}` } });
  console.log(`✅ Cleanup complete.`);

  await sequelize.close();
  console.log('\n🎉 All Ad Tests Completed Successfully!');
}

testAds().catch((err) => {
  console.error('\n❌ Test failed:', err.response?.data || err.message);
  sequelize.close();
});
