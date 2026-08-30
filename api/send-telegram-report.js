const fetch = require('node-fetch');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BLOB_DATA_URL = process.env.BLOB_DATA_URL; // we'll set this after confirming blob works

async function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: 'HTML'
    })
  });

  return await response.json();
}

module.exports = async function handler(req, res) {
  try {
    // For now, send a simple test report
    // Once Blob data works, we'll pull real stats here
    const message = `
🚀 <b>Content Agent Dashboard</b>

📊 <b>Daily Report</b>
Timestamp: ${new Date().toISOString()}

✅ 5 Agents Active:
💡 Ideator
✍️ Hook & Script
📅 Planner
📊 Analyst
💬 DM Manager

Dashboard: content-agent-dashboard-one.vercel.app
    `.trim();

    const result = await sendTelegramMessage(message);

    if (result.ok) {
      res.status(200).json({ success: true, message: 'Report sent to Telegram!' });
    } else {
      res.status(500).json({ success: false, error: result.description });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
