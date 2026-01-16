/**
 * Cron Slack Alerts Module
 * Schedules and sends Slack alerts for at-risk dealers
 */

const cron = require('node-cron');
const slackClient = require('../slack/slackClient');
const alertComposer = require('../slack/alertComposer');
const riskService = require('../slack/riskService');

// Simple in-memory lock to prevent duplicate executions
const executionLocks = new Map();

/**
 * Get lock key for current minute
 * @param {string} jobName
 * @returns {string}
 */
function getLockKey(jobName) {
  const now = new Date();
  return `${jobName}-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
}

/**
 * Check and acquire lock
 * @param {string} jobName
 * @returns {boolean}
 */
function acquireLock(jobName) {
  const key = getLockKey(jobName);

  // Clean old locks (older than 5 minutes)
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [k, timestamp] of executionLocks.entries()) {
    if (timestamp < fiveMinutesAgo) {
      executionLocks.delete(k);
    }
  }

  if (executionLocks.has(key)) {
    return false;
  }

  executionLocks.set(key, Date.now());
  return true;
}

/**
 * Send alert for a single sector
 * @param {string} setorId
 * @param {object} slackConfig
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function sendAlertForSetor(setorId, slackConfig) {
  const testUserId = process.env.SLACK_TEST_USER_ID;

  // Determine recipient
  let userId;
  if (slackConfig.testMode) {
    if (!testUserId) {
      console.warn(`[CronSlack] testMode is ON but SLACK_TEST_USER_ID not set`);
      return { ok: false, error: 'SLACK_TEST_USER_ID not configured' };
    }
    userId = testUserId;
  } else {
    userId = slackConfig.supervisoresPorSetor?.[setorId];
    if (!userId) {
      console.log(`[CronSlack] No supervisor mapped for setor ${setorId}, skipping`);
      return { ok: false, error: 'No supervisor mapped' };
    }
  }

  // Get risk summary
  const summary = riskService.getSectorRiskSummary(setorId);

  // Check if we should send when zero
  if (summary.riskCount === 0 && !slackConfig.sendWhenZero) {
    console.log(`[CronSlack] Setor ${setorId}: 0 at risk, sendWhenZero=false, skipping`);
    return { ok: true, skipped: true, reason: 'No dealers at risk' };
  }

  // Compose message
  const { text, blocks } = alertComposer.composeRiskAlert(summary);

  // Send DM
  console.log(`[CronSlack] Sending alert for setor ${setorId} to user ${userId}...`);
  const result = await slackClient.sendDM(userId, text, blocks);

  if (result.ok) {
    console.log(`[CronSlack] ✅ Alert sent for setor ${setorId}: ${summary.riskCount} at risk`);
  } else {
    console.error(`[CronSlack] ❌ Failed to send alert for setor ${setorId}: ${result.error}`);
  }

  return result;
}

/**
 * Run scheduled alerts for all configured sectors
 * @param {string} jobName - Name for logging
 */
async function runScheduledAlerts(jobName = 'scheduled') {
  // Acquire lock to prevent duplicates
  if (!acquireLock(jobName)) {
    console.log(`[CronSlack] Job ${jobName} already running this minute, skipping`);
    return;
  }

  console.log(`\n[CronSlack] ═══════════════════════════════════════════════`);
  console.log(`[CronSlack] Starting ${jobName} at ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Maceio' })}`);

  const slackConfig = riskService.getSlackConfig();

  // Check if Slack is enabled
  if (!slackConfig.enabled) {
    console.log(`[CronSlack] Slack alerts disabled (slack.enabled=false)`);
    return;
  }

  // Check if token is configured
  if (!process.env.SLACK_BOT_TOKEN) {
    console.warn(`[CronSlack] SLACK_BOT_TOKEN not configured, skipping`);
    return;
  }

  // Get all setores
  const setores = riskService.getAllSetores();

  if (setores.length === 0) {
    console.warn(`[CronSlack] No setores found`);
    return;
  }

  console.log(`[CronSlack] Processing ${setores.length} setores...`);
  console.log(`[CronSlack] Mode: ${slackConfig.testMode ? 'TEST (all to test user)' : 'PRODUCTION'}`);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  // If in test mode with test user, only process sectors that have data
  const setoresToProcess = slackConfig.testMode
    ? setores.slice(0, 5) // Limit to 5 in test mode to avoid spam
    : Object.keys(slackConfig.supervisoresPorSetor || {});

  for (const setor of setoresToProcess) {
    const setorId = typeof setor === 'object' ? setor.id : setor;

    try {
      const result = await sendAlertForSetor(setorId, slackConfig);

      if (result.ok) {
        if (result.skipped) {
          skipped++;
        } else {
          sent++;
        }
      } else {
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[CronSlack] Error processing setor ${setorId}:`, error.message);
      failed++;
    }
  }

  console.log(`[CronSlack] Completed: ${sent} sent, ${skipped} skipped, ${failed} failed`);
  console.log(`[CronSlack] ═══════════════════════════════════════════════\n`);
}

/**
 * Initialize cron jobs
 * Schedule: Monday and Friday at 09:00 and 17:00 (America/Maceio)
 */
function initCronJobs() {
  const timezone = 'America/Maceio';

  console.log('[CronSlack] Initializing cron jobs...');

  // Monday 09:00
  cron.schedule('0 9 * * 1', () => runScheduledAlerts('monday-09'), {
    scheduled: true,
    timezone
  });
  console.log('[CronSlack] Scheduled: Monday 09:00 (America/Maceio)');

  // Monday 17:00
  cron.schedule('0 17 * * 1', () => runScheduledAlerts('monday-17'), {
    scheduled: true,
    timezone
  });
  console.log('[CronSlack] Scheduled: Monday 17:00 (America/Maceio)');

  // Friday 09:00
  cron.schedule('0 9 * * 5', () => runScheduledAlerts('friday-09'), {
    scheduled: true,
    timezone
  });
  console.log('[CronSlack] Scheduled: Friday 09:00 (America/Maceio)');

  // Friday 17:00
  cron.schedule('0 17 * * 5', () => runScheduledAlerts('friday-17'), {
    scheduled: true,
    timezone
  });
  console.log('[CronSlack] Scheduled: Friday 17:00 (America/Maceio)');

  console.log('[CronSlack] All cron jobs initialized');
}

/**
 * Manual trigger for testing
 * @param {string} setorId - Optional specific setor
 * @returns {Promise}
 */
async function triggerManual(setorId = null) {
  const slackConfig = riskService.getSlackConfig();

  if (setorId) {
    return sendAlertForSetor(setorId, slackConfig);
  }

  return runScheduledAlerts('manual-trigger');
}

module.exports = {
  initCronJobs,
  triggerManual,
  sendAlertForSetor,
  runScheduledAlerts
};
