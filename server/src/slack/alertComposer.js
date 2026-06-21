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
    dashboardUrl,
    cicloAtual,
    vendidoNoCiclo,
    top5
  } = summary;

  // Saudação pelo horário (America/Maceio): manhã = Bom dia, tarde = Boa tarde
  const hora = parseInt(
    new Date().toLocaleString('en-US', { timeZone: 'America/Maceio', hour: '2-digit', hour12: false }),
    10
  );
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const emojiSaud = hora < 12 ? '☀️' : hora < 18 ? '🌤️' : '🌙';

  // Fallback text for notifications
  const text = riskCount > 0
    ? `${saudacao}! ${setorNome || 'Setor ' + setorId}: ${riskCount} de ${totalDealers} a acompanhar`
    : `${saudacao}! ${setorNome || 'Setor ' + setorId}: tudo certo 🎉`;

  const blocks = [];

  // Header (saudação no lugar de "EM RISCO" — tom mais leve)
  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: `${emojiSaud} ${saudacao}!`, emoji: true }
  });

  // Setor + ciclo
  blocks.push({
    type: 'context',
    elements: [{
      type: 'mrkdwn',
      text: `📍 *${setorNome || 'Setor ' + setorId}* · Setor ${setorId}${cicloAtual ? ` · Ciclo ${cicloAtual}` : ''}`
    }]
  });

  // Quanto o setor já vendeu no ciclo
  if (vendidoNoCiclo != null) {
    blocks.push({
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: `💰 Vendido no ciclo até agora: *${formatCurrency(vendidoNoCiclo)}*`
      }]
    });
  }

  // Divider
  blocks.push({ type: 'divider' });

  // Main message (tom de acompanhamento, sem alarme)
  if (riskCount > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${riskCount}* de *${totalDealers}* revendedores estão a caminho de cair de segmentação na virada, caso mantenham o acúmulo atual.`
      }
    });

    // Top 5 prioridades
    if (top5 && top5.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Top 5 prioridades:*'
        }
      });

      const dealersList = top5.map((dealer, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        const caiPara = dealer.cairiaPara ? ` → cai p/ *${dealer.cairiaPara}*` : '';
        return `${medal} *${dealer.nome}* (${dealer.codigo})${caiPara}\n    └ Falta ${formatCurrency(dealer.faltaManter)} p/ manter ${dealer.segmento}`;
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
        text: `🎉 *Tudo certo!* Nenhum dos ${totalDealers} revendedores está a caminho de cair de segmentação na virada.`
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
        style: 'primary'
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
