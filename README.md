# SUPERVISION // SEGMENTS TRACKER

> Dashboard Neo-Brutalista Retro Gamer para rastreamento de segmentos de revendedores.

![Neo-Brutalist Design](https://img.shields.io/badge/Design-Neo%20Brutalist-b8d977?style=for-the-badge)
![Retro Gamer](https://img.shields.io/badge/Style-Retro%20Gamer-77d9c3?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge)

## 📸 Screenshots

### Terminal de Entrada
Tela estilo "LOGIN TERMINAL" retro com autocomplete de setores e status do sistema.

```
╔═══════════════════════════════════════╗
║     SETOR ACCESS                      ║
║     ─────────────────────             ║
║     [DATABASE LOOKUP]                 ║
║     > Digite o nome do setor...       ║
║                                       ║
║     [ENTER DASHBOARD]                 ║
╚═══════════════════════════════════════╝
```

### Dashboard Principal
- HUD Header fixo com status do sistema
- KPIs em cards neobrutalistas
- Grid de cards de revendedores
- Tabs: REVENDEDORES | CICLOS | RANK DO DIA

### Admin Panel
- Upload de CSV (Manhã/Tarde)
- Toggle de snapshot ativo
- Configuração de representatividade por ciclo

## 🎨 Design System

### Paleta de Cores (Pastel Retro + Verde Abacate)
```css
--color-neon-primary: #b8d977    /* Verde Abacate */
--color-neon-secondary: #77d9c3  /* Ciano Menta */
--color-neon-accent: #d977b8     /* Magenta Pastel */
--color-neon-warning: #d9c377    /* Amarelo Pastel */
--color-neon-danger: #d97777     /* Vermelho Pastel */
```

### Tipografia
- **Títulos**: Space Grotesk (bold, uppercase)
- **Números/Labels**: JetBrains Mono (monospace)

### Características Visuais
- Bordas grossas (3-4px)
- Sombras duras deslocadas
- Grid sutil no fundo
- Scanlines opcionais (toggle)
- Microinterações: hover "lift", click "press"

## 🚀 Instalação

```bash
# Clonar repositório
git clone https://github.com/eduardocaduuu/SupervisionDash.git
cd SupervisionDash

# Instalar dependências
npm run install:all

# Rodar em desenvolvimento
npm run dev
```

O servidor roda em `http://localhost:3001`
O cliente roda em `http://localhost:5173`

## 📁 Estrutura do Projeto

```
├── client/                 # Frontend React + Vite
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   │   ├── Panel.jsx
│   │   │   ├── HUDHeader.jsx
│   │   │   ├── MetricCard.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   ├── DealerCard.jsx
│   │   │   ├── DealerModal.jsx
│   │   │   ├── BadgeSegment.jsx
│   │   │   └── AlertChip.jsx
│   │   ├── pages/         # Páginas
│   │   │   ├── Terminal.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CiclosTab.jsx
│   │   │   ├── RankTab.jsx
│   │   │   ├── Admin.jsx
│   │   │   └── AdminLogin.jsx
│   │   └── styles/        # Design System
│   │       ├── global.css
│   │       └── components.css
│   └── index.html
├── server/                 # Backend Express
│   ├── src/
│   │   └── index.js       # API endpoints
│   └── data/              # Dados CSV e config
└── package.json
```

## 🔌 API Endpoints

### Públicos
- `GET /api/health` - Status do sistema
- `GET /api/setores` - Lista de setores
- `GET /api/config` - Configuração pública
- `GET /api/setor/:setorId` - Dashboard do setor
- `GET /api/setor/:setorId/ciclos` - Dados por ciclo
- `GET /api/setor/:setorId/rank` - Ranking do dia
- `GET /api/dealer/:codigo` - Detalhe do revendedor

### Admin (requer autenticação)
- `POST /api/admin/login` - Login admin
- `POST /api/admin/upload` - Upload CSV
- `POST /api/admin/snapshot` - Alterar snapshot ativo
- `POST /api/admin/ciclo` - Alterar ciclo atual
- `POST /api/admin/representatividade` - Atualizar pesos

## 🎮 Funcionalidades

### Terminal de Entrada
- Input com autocomplete de setores
- Status do snapshot e ciclo atual
- Acesso rápido ao admin

### Dashboard do Setor
- **KPIs**: Total, Qtd Revendedores, Near Level Up, At Risk
- **Cards de Revendedores**:
  - Segmento atual (Bronze/Prata/Ouro/Diamante/Elite)
  - Barras de progresso (KEEP / LEVEL UP)
  - Valores faltantes para metas
  - Impulso (mensagem motivacional)
  - Delta do dia (Δ Tarde - Manhã)
- **Busca e Ordenação**
- **Visualização Grid/Lista**

### Ciclos
- Gráfico de barras por ciclo
- Tabela com representatividade

### Rank do Dia
- Top 10 maior Δ do dia
- Mission Boosters (mensagens motivacionais)

### Admin
- Upload de CSV por snapshot
- Toggle de snapshot ativo
- Configuração de representatividade (0-100%)

## 🔧 Configuração

### Segmentos e Metas
```javascript
SEGMENTOS = {
  'Bronze':   { metaManter: 5000,   metaSubir: 15000  },
  'Prata':    { metaManter: 15000,  metaSubir: 35000  },
  'Ouro':     { metaManter: 35000,  metaSubir: 70000  },
  'Diamante': { metaManter: 70000,  metaSubir: 120000 },
  'Elite':    { metaManter: 120000, metaSubir: null   }
}
```

### Admin Padrão
- Senha: `admin123`

## 📱 Responsividade

- **Desktop**: 3 colunas de cards
- **Tablet**: 2 colunas
- **Mobile**: 1 coluna

## ⚡ Performance

- Skeleton loading
- Lazy loading de componentes
- Cache de dados
- Animações otimizadas (toggle disponível)

## 📢 Slack Alerts

O sistema pode enviar alertas automáticos via DM no Slack para supervisoras quando há revendedores "em risco" (percentManter < 50%).

### Agendamento

- Todos os dias: 09:00 e 16:30
- Timezone: America/Maceio

### Configuração do Slack App

1. **Criar Slack App**
   - Acesse [api.slack.com/apps](https://api.slack.com/apps)
   - Clique em "Create New App" → "From scratch"
   - Nome: `SuperVision Alerts`
   - Workspace: Selecione seu workspace

2. **Configurar Bot Token Scopes**
   - Vá em "OAuth & Permissions"
   - Em "Bot Token Scopes", adicione:
     - `chat:write` - Enviar mensagens
     - `im:write` - Abrir DMs com usuários

3. **Instalar no Workspace**
   - Clique em "Install to Workspace"
   - Autorize o app
   - Copie o "Bot User OAuth Token" (começa com `xoxb-`)

4. **Obter User IDs**
   - No Slack, clique no perfil do usuário
   - Clique em "..." → "Copy member ID"
   - O ID tem formato `U0895CZ8HU7`

### Variáveis de Ambiente (Render)

Adicione no Render (Environment Variables):

```
SLACK_BOT_TOKEN=xoxb-seu-token-aqui
SLACK_TEST_USER_ID=U0895CZ8HU7
SLACK_BASE_URL=https://supervisiondashboard.onrender.com
```

### Endpoints Admin

```bash
# Ver status do Slack
GET /api/admin/slack/status

# Testar conexão
GET /api/admin/slack/connection

# Testar envio de alerta (usa testMode)
POST /api/admin/slack/test?setorId=4005

# Atualizar configuração
PUT /api/admin/slack/config
{
  "enabled": true,
  "testMode": false,
  "riskThresholdPercent": 50,
  "sendWhenZero": false,
  "supervisoresPorSetor": {
    "4005": "U0895CZ8HU7",
    "14245": "UXXXXXXXX"
  }
}
```

### Ativar Alertas

1. **Testar primeiro** (testMode=true):
   ```bash
   # Configure SLACK_BOT_TOKEN e SLACK_TEST_USER_ID no Render
   # Acesse: POST /api/admin/slack/test?setorId=4005
   # Verifique se recebeu a DM no Slack
   ```

2. **Ativar em produção**:
   ```bash
   PUT /api/admin/slack/config
   {
     "enabled": true,
     "testMode": false,
     "supervisoresPorSetor": {
       "4005": "U0895CZ8HU7"
     }
   }
   ```

### Estrutura da Mensagem

```
⚠️ EM RISCO — Setor 4005
📍 Nome do Setor

5 de 20 revendedores estão abaixo de 50% da meta de manter (9 ciclos).

🔥 Top 5 Mais Críticos:
🥇 Maria Silva (10001)
   └ 23.5% da meta | Falta: R$ 2.300,00
🥈 Ana Santos (10002)
   └ 35.2% da meta | Falta: R$ 1.800,00
...

[📊 Ver Dashboard Completo]

📅 Atualizado em: 16/01/2026, 09:00:00
```

## 📄 Licença

MIT © 2026
