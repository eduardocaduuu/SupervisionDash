/**
 * Alert Composer Module
 * Builds Slack Block Kit messages for risk alerts
 */

/**
 * Format currency in Brazilian Real
 * @param {number} value
 * @returns {string}
 */
function formatCurrency(value) {
  return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

/**
 * Compose risk alert message for Slack
 * @param {object} summary - Risk summary from riskService
 * @param {string} summary.setorId - Sector ID
 * @param {string} summary.setorNome - Sector name
 * @param {number} summary.riskCount - Number of dealers at risk
 * @param {number} summary.totalDealers - Total dealers in sector
 * @param {number} summary.threshold - Risk threshold percentage
 * @param {string} summary.dashboardUrl - Dashboard URL for this sector
 * @param {Array} summary.top5 - Top 5 critical dealers
 * @returns {{text: string, blocks: Array}}
 */
function composeRiskAlert(summary) {
  const {
    setorId,
    setorNome,
    riskCount,
    totalDealers,
    threshold,
    dashboardUrl,
    top5
  } = summary;

  // Fallback text for notifications
  const text = riskCount > 0
    ? `⚠️ ALERTA: ${riskCount} revendedor(es) em risco no Setor ${setorId}`
    : `✅ Setor ${setorId}: Nenhum revendedor em risco`;

  const blocks = [];

  // Header
  blocks.push({
    type: 'header',
    text: {
      type: 'plain_text',
      text: riskCount > 0 ? `⚠️ EM RISCO — Setor ${setorId}` : `✅ Setor ${setorId}`,
      emoji: true
    }
  });

  // Sector info
  if (setorNome) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📍 *${setorNome}*`
        }
      ]
    });
  }

  // Divider
  blocks.push({ type: 'divider' });

  // Main message
  if (riskCount > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${riskCount}* de *${totalDealers}* revendedores estão abaixo de *${threshold}%* da meta de manter (9 ciclos).`
      }
    });

    // Top 5 critical dealers
    if (top5 && top5.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*🔥 Top 5 Mais Críticos:*'
        }
      });

      const dealersList = top5.map((dealer, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        return `${medal} *${dealer.nome}* (${dealer.codigo})\n    └ ${dealer.percentManter.toFixed(1)}% da meta | Falta: ${formatCurrency(dealer.faltaManter)}`;
      }).join('\n\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: dealersList
        }
      });
    }
  } else {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🎉 *Parabéns!* Todos os ${totalDealers} revendedores estão acima de ${threshold}% da meta de manter.`
      }
    });
  }

  // Divider
  blocks.push({ type: 'divider' });

  // Dashboard link button
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '📊 Ver Dashboard Completo',
          emoji: true
        },
        url: dashboardUrl,
        style: riskCount > 0 ? 'danger' : 'primary'
      }
    ]
  });

  // Footer with timestamp
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `📅 Atualizado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Maceio' })}`
      }
    ]
  });

  return { text, blocks };
}

/**
 * Compose a simple test message
 * @param {string} setorId
 * @returns {{text: string, blocks: Array}}
 */
function composeTestMessage(setorId) {
  return {
    text: `🧪 Teste de alerta Slack para o Setor ${setorId}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🧪 Teste de Alerta Slack',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Este é um teste do sistema de alertas para o *Setor ${setorId}*.\n\nSe você recebeu esta mensagem, o Slack está configurado corretamente! ✅`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `⏰ Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Maceio' })}`
          }
        ]
      }
    ]
  };
}

module.exports = {
  composeRiskAlert,
  composeTestMessage,
  formatCurrency
};
