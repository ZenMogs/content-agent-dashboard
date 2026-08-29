require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const APIFY_API_KEY = process.env.APIFY_API_KEY;
const MY_INSTAGRAM = process.env.MY_INSTAGRAM;
const COMPETITORS = process.env.COMPETITORS.split(',');

export default async function handler(req, res) {
  console.log('🚀 Cron job started at', new Date().toISOString());

  async function scrapeInstagram(username) {
    try {
      const response = await fetch('https://api.apify.com/v2/acts/instagram-scraper~instagram-profile-scraper/run-sync-get-dataset-items', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${APIFY_API_KEY}`
        },
        body: JSON.stringify({
          usernames: [username],
          resultsLimit: 30
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching ${username}:`, error.message);
      return null;
    }
  }

  try {
    const allData = {
      timestamp: new Date().toISOString(),
      myAccount: null,
      competitors: []
    };

    // Fetch your data
    console.log(`📸 Fetching: ${MY_INSTAGRAM}`);
    allData.myAccount = await scrapeInstagram(MY_INSTAGRAM);

    // Fetch competitors
    for (const competitor of COMPETITORS) {
      console.log(`🔍 Fetching: ${competitor}`);
      const data = await scrapeInstagram(competitor);
      allData.competitors.push({ username: competitor, data });
    }

    // Update data.json in public folder
    const dataPath = path.join(process.cwd(), 'public', 'data.json');
    fs.writeFileSync(dataPath, JSON.stringify(allData, null, 2));

    console.log('✅ Data updated successfully');
    res.status(200).json({ 
      success: true, 
      message: 'Data fetched and updated',
      timestamp: allData.timestamp 
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
        }
