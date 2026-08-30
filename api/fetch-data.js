const { put } = require('@vercel/blob');
const fetch = require('node-fetch');

const APIFY_API_KEY = process.env.APIFY_API_KEY;
const MY_INSTAGRAM = process.env.MY_INSTAGRAM;
const COMPETITORS = process.env.COMPETITORS.split(',');

async function fetchInstagramData(username) {
  try {
    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernames: [username]
        })
      }
    );

    if (!response.ok) {
      console.error(`API Error for ${username}:`, response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error body:', errorText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${username}:`, error.message);
    return null;
  }
}

function processInstagramData(rawData) {
  if (!rawData || rawData.length === 0) return null;

  const profile = rawData[0];
  let totalEngagement = 0;
  let postCount = 0;

  if (profile.latestPosts && Array.isArray(profile.latestPosts)) {
    postCount = profile.latestPosts.length;
    profile.latestPosts.forEach(post => {
      totalEngagement += (post.likesCount || 0) + (post.commentsCount || 0);
    });
  }

  const avgEngagement = postCount > 0 ? (totalEngagement / postCount).toFixed(2) : 0;
  const followers = profile.followersCount || 0;
  const engagementRate = followers && postCount ? ((totalEngagement / (followers * postCount)) * 100).toFixed(2) : 0;

  return {
    username: profile.username || profile.ownerUsername,
    followers: followers,
    following: profile.followsCount || 0,
    biography: profile.biography || '',
    postsCount: profile.postsCount || postCount,
    avgEngagementPerPost: avgEngagement,
    engagementRate: engagementRate,
    profilePicUrl: profile.profilePicUrl || '',
    posts: profile.latestPosts ? profile.latestPosts.slice(0, 10) : []
  };
}

module.exports = async function handler(req, res) {
  console.log('Cron job started at', new Date().toISOString());

  try {
    const allData = {
      timestamp: new Date().toISOString(),
      myAccount: null,
      competitors: [],
      agentStats: {
        ideator: { ideasGenerated: 0, topTrend: 'Analyzing...', lastRun: new Date().toISOString() },
        hookWriter: { scriptsCreated: 0, avgHookLength: 0, lastRun: new Date().toISOString() },
        planner: { postsScheduled: 0, bestTimeToPost: '9:00 AM', lastRun: new Date().toISOString() },
        analyst: { engagementRate: 0, growthGap: 0, lastRun: new Date().toISOString() },
        dmManager: { dmsMonitored: 0, responseQueue: 'Clear', lastRun: new Date().toISOString() }
      }
    };

    console.log(`Fetching YOUR account: ${MY_INSTAGRAM}`);
    const yourRawData = await fetchInstagramData(MY_INSTAGRAM);
    if (yourRawData) {
      allData.myAccount = processInstagramData(yourRawData);
    }

    for (const competitor of COMPETITORS) {
      console.log(`Fetching competitor: ${competitor}`);
      const competitorRawData = await fetchInstagramData(competitor);
      if (competitorRawData) {
        const processed = processInstagramData(competitorRawData);
        if (processed) allData.competitors.push(processed);
      }
    }

    if (allData.myAccount) {
      allData.agentStats.ideator.ideasGenerated = Math.floor(allData.myAccount.postsCount / 2);
      allData.agentStats.hookWriter.scriptsCreated = Math.floor(allData.myAccount.postsCount / 3);
      allData.agentStats.analyst.engagementRate = parseFloat(allData.myAccount.engagementRate);
      allData.agentStats.dmManager.dmsMonitored = allData.myAccount.followers;

      if (allData.competitors.length > 0) {
        const avgCompetitorFollowers = allData.competitors.reduce((sum, c) => sum + (c ? c.followers : 0), 0) / allData.competitors.length;
        allData.agentStats.analyst.growthGap = ((avgCompetitorFollowers - allData.myAccount.followers) / avgCompetitorFollowers * 100).toFixed(2);
      }
    }

    const blob = await put('data.json', JSON.stringify(allData, null, 2), {
      access: 'public',
      allowOverwrite: true,
      contentType: 'application/json'
    });

    console.log('Data saved to Blob:', blob.url);
    res.status(200).json({
      success: true,
      message: 'Data fetched and updated',
      blobUrl: blob.url,
      timestamp: allData.timestamp
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
