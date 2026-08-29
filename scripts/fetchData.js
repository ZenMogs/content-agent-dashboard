require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const APIFY_API_KEY = process.env.APIFY_API_KEY;
const MY_INSTAGRAM = process.env.MY_INSTAGRAM;
const COMPETITORS = process.env.COMPETITORS.split(',');

async function scrapeInstagram(username) {
  console.log(`📸 Scraping ${username}...`);
  
  try {
    const response = await fetch('https://api.apify.com/v2/actor-tasks/instagram-scraper~instagram-profile-scraper/runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APIFY_API_KEY}`
      },
      body: JSON.stringify({
        actorId: 'instagram-scraper~instagram-profile-scraper',
        input: {
          usernames: [username],
          resultsLimit: 30
        }
      })
    });

    const data = await response.json();
    console.log(`✅ ${username} data fetched`);
    return data;
  } catch (error) {
    console.error(`❌ Error fetching ${username}:`, error.message);
    return null;
  }
}

async function fetchAllData() {
  console.log('🚀 Starting data fetch...\n');

  const allData = {
    timestamp: new Date().toISOString(),
    myAccount: null,
    competitors: []
  };

  // Fetch your data
  console.log(`\n👤 Fetching your account: ${MY_INSTAGRAM}`);
  allData.myAccount = await scrapeInstagram(MY_INSTAGRAM);

  // Fetch competitors
  for (const competitor of COMPETITORS) {
    console.log(`\n🔍 Fetching competitor: ${competitor}`);
    const data = await scrapeInstagram(competitor);
    allData.competitors.push({ username: competitor, data });
  }

  // Save to file
  const dashboardDir = path.join(__dirname, '../dashboard');
  if (!fs.existsSync(dashboardDir)) {
    fs.mkdirSync(dashboardDir, { recursive: true });
  }

  const outputPath = path.join(dashboardDir, 'data.json');
  fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2));

  console.log(`\n✅ All data saved to: ${outputPath}`);
  console.log('\n📊 Data Summary:');
  console.log(`  - Your account: ${MY_INSTAGRAM}`);
  console.log(`  - Competitors tracked: ${COMPETITORS.length}`);
  console.log(`  - Timestamp: ${allData.timestamp}`);
}

fetchAllData().catch(console.error);
