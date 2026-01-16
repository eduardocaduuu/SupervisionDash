/**
 * Slack Client Module
 * Handles Slack WebClient initialization and DM sending
 */

const { WebClient } = require('@slack/web-api');

// Singleton instance
let webClient = null;

/**
 * Initialize Slack WebClient
 * @returns {WebClient|null}
 */
function getClient() {
  if (webClient) return webClient;

  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn('[Slack] SLACK_BOT_TOKEN not configured - Slack alerts disabled');
    return null;
  }

  webClient = new WebClient(token);
  console.log('[Slack] WebClient initialized');
  return webClient;
}

/**
 * Send a Direct Message to a Slack user
 * @param {string} userId - Slack user ID (e.g., U0895CZ8HU7)
 * @param {string} text - Fallback text
 * @param {Array} blocks - Slack Block Kit blocks
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function sendDM(userId, text, blocks = null) {
  const client = getClient();

  if (!client) {
    return { ok: false, error: 'Slack client not initialized (missing SLACK_BOT_TOKEN)' };
  }

  if (!userId) {
    return { ok: false, error: 'User ID is required' };
  }

  try {
    // Step 1: Open DM channel with user
    console.log(`[Slack] Opening DM with user ${userId}...`);
    const imResponse = await client.conversations.open({
      users: userId
    });

    if (!imResponse.ok || !imResponse.channel?.id) {
      return { ok: false, error: `Failed to open DM: ${imResponse.error || 'unknown error'}` };
    }

    const channelId = imResponse.channel.id;
    console.log(`[Slack] DM channel opened: ${channelId}`);

    // Step 2: Send message to DM channel
    const messagePayload = {
      channel: channelId,
      text: text // Fallback for notifications
    };

    if (blocks && blocks.length > 0) {
      messagePayload.blocks = blocks;
    }

    const msgResponse = await client.chat.postMessage(messagePayload);

    if (!msgResponse.ok) {
      return { ok: false, error: `Failed to send message: ${msgResponse.error || 'unknown error'}` };
    }

    console.log(`[Slack] Message sent successfully to ${userId}`);
    return { ok: true, ts: msgResponse.ts, channel: channelId };

  } catch (error) {
    console.error(`[Slack] Error sending DM to ${userId}:`, error.message);
    return { ok: false, error: error.message };
  }
}

/**
 * Test Slack connection
 * @returns {Promise<{ok: boolean, botInfo?: object, error?: string}>}
 */
async function testConnection() {
  const client = getClient();

  if (!client) {
    return { ok: false, error: 'Slack client not initialized' };
  }

  try {
    const authTest = await client.auth.test();
    return {
      ok: true,
      botInfo: {
        botId: authTest.bot_id,
        userId: authTest.user_id,
        team: authTest.team,
        url: authTest.url
      }
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

module.exports = {
  getClient,
  sendDM,
  testConnection
};
