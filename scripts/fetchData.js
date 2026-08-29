require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const APIFY_API_KEY = process.env.APIFY_API_KEY;
const MY_INSTAGRAM = process.env.MY_INSTAGRAM;
const COMPETITORS = process.env.COMPETITORS.split(',');

async function fetchInstagramData(username) {
  console.log(`📸 Fetching data for ${username}...`);
  
  try {
    // Using Apify's Instagram profile scraper
    const response = await fetch(
      `https://api.apify.com/v2/acts/instagram-scraper~instagram-profile-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usernames: [username],
          resultsLimit: 30,
        })
      }
    );

    if (!response.ok) {
      console.error(`❌ API Error for ${username}:`, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Successfully fetched ${username}`);
    return data;
  } catch (error) {
    console.error(`❌ Error fetching ${username}:`, error.message);
    return null;
  }
}

async function processInstagramData(rawData) {
  if (!rawData || rawData.length === 0) return null;

  const profile = rawData[0];
  
  // Calculate engagement metrics
  let totalEngagement = 0;
  let postCount = 0;

  if (profile.posts && Array.isArray(profile.posts)) {
    postCount = profile.posts.length;
    profile.posts.forEach(post => {
      const likes = post.likeCount || 0;
      const comments = post.commentsCount || 0;
      totalEngagement += likes + comments;
    });
  }

  const avgEngagement = postCount > 0 ? (totalEngagement / postCount).toFixed(2) : 0;
  const engagementRate = profile.followers ? ((totalEngagement / (profile.followers * postCount)) * 100).toFixed(2) : 0;

  return {
    username: profile.username || profile.name,
    followers: profile.followers || 0,
    following: profile.following || 0,
    biography: profile.biography || '',
    postsCount: postCount,
    avgEngagementPerPost: avgEngagement,
    engagementRate: engagementRate,
    profilePicUrl: profile.profilePicUrl || '',
    posts: profile.posts ? profile.posts.slice(0, 10) : []
  };
}

async function fetchAllData() {
  console.log('🚀 Starting Instagram data fetch...\n');

  const allData = {
    timestamp: new Date().toISOString(),
    myAccount: null,
    competitors: [],
    agentStats: {
      ideator: {
        ideasGenerated: 0,
        topTrend: 'Analyzing...',
        lastRun: new Date().toISOString()
      },
      hookWriter: {
        scriptsCreated: 0,
        avgHookLength: 0,
        lastRun: new Date().toISOString()
      },
      planner: {
        postsScheduled: 0,
        bestTimeToPost: '9:00 AM',
        lastRun: new Date().toISOString()
      },
      analyst: {
        engagementRate: 0,
        growthGap: 0,
        lastRun: new Date().toISOString()
      },
      dmManager: {
        dmsMonitored: 0,
        responseQueue: 'Clear',
        lastRun: new Date().toISOString()
      }
    }
  };

  try {
    // Fetch your account
    console.log(`\n👤 Fetching YOUR account: ${MY_INSTAGRAM}`);
    const yourRawData = await fetchInstagramData(MY_INSTAGRAM);
    if (yourRawData) {
      allData.myAccount = await processInstagramData(yourRawData);
      console.log(`   Followers: ${allData.myAccount.followers}`);
      console.log(`   Posts: ${allData.myAccount.postsCount}`);
      console.log(`   Engagement Rate: ${allData.myAccount.engagementRate}%\n`);
    }

    // Fetch competitors
    for (const competitor of COMPETITORS) {
      console.log(`\n🔍 Fetching competitor: ${competitor}`);
      const competitorRawData = await fetchInstagramData(competitor);
      if (competitorRawData) {
        const processedData = await processInstagramData(competitorRawData);
        allData.competitors.push(processedData);
        console.log(`   Followers: ${processedData.followers}`);
        console.log(`   Posts: ${processedData.postsCount}`);
        console.log(`   Engagement Rate: ${processedData.engagementRate}%`);
      }
    }

    // Calculate agent stats based on data
    if (allData.myAccount) {
      allData.agentStats.ideator.ideasGenerated = Math.floor(allData.myAccount.postsCount / 2);
      allData.agentStats.hookWriter.scriptsCreated = Math.floor(allData.myAccount.postsCount / 3);
      allData.agentStats.analyst.engagementRate = parseFloat(allData.myAccount.engagementRate);
      allData.agentStats.dmManager.dmsMonitored = allData.myAccount.followers;

      // Calculate growth gap vs competitors
      if (allData.competitors.length > 0) {
        const avgCompetitorFollowers = allData.competitors.reduce((sum, c) => sum + c.followers, 0) / allData.competitors.length;
        allData.agentStats.analyst.growthGap = ((avgCompetitorFollowers - allData.myAccount.followers) / avgCompetitorFollowers * 100).toFixed(2);
      }
    }

    // Save to public folder
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const outputPath = path.join(publicDir, 'data.json');
    fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2));

    console.log(`\n✅ All data saved to: ${outputPath}`);
    console.log('\n📊 Summary:');
    console.log(`  ✓ Your account: ${MY_INSTAGRAM}`);
    console.log(`  ✓ Competitors tracked: ${allData.competitors.length}`);
    console.log(`  ✓ Timestamp: ${allData.timestamp}`);
    console.log(`  ✓ Agent stats calculated\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run immediately if called directly
fetchAllData().catch(console.error);
