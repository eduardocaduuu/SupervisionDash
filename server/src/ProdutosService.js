const path = require('path');
const fs = require('fs');
const { readAllRows } = require('./utils/xlsx');

// Caminho para o arquivo de vendas
const DATA_DIR = path.join(__dirname, '../../data');

function getDataFile() {
  const xlsxPath = path.join(DATA_DIR, 'vendas_bd.xlsx');
  const csvPath = path.join(DATA_DIR, 'vendas_bd.csv');

  if (fs.existsSync(xlsxPath)) return xlsxPath;
  if (fs.existsSync(csvPath)) return csvPath;
  return xlsxPath;
}

let rawCache = null;
let rawLastMtime = 0;
let setorNameToCodeMap = null;

// Normalizar código (remover pontos e espaços)
function normalizeCode(code) {
  return String(code || '').replace(/\./g, '').replace(/\s+/g, '').trim();
}

// Construir mapa de nome de setor para código
function buildSetorNameToCodeMap() {
  if (setorNameToCodeMap) return setorNameToCodeMap;

  const segmentosPath = path.join(DATA_DIR, 'Segmentos_bd.xlsx');
  setorNameToCodeMap = {};

  if (fs.existsSync(segmentosPath)) {
    try {
      const rawData = readAllRows(segmentosPath);

      rawData.forEach(row => {
        const nome = (row.EstruturaComercial || '').trim();
        const codigo = normalizeCode(row.CodigoEstruturaComercial);
        if (nome && codigo) {
          setorNameToCodeMap[nome] = codigo;
        }
      });
    } catch (e) {
      console.error('[ProdutosService] Erro ao construir mapa de setores:', e);
    }
  }

  return setorNameToCodeMap;
}

// Encontrar código do setor pelo nome
function findSetorCode(setorName) {
  const map = buildSetorNameToCodeMap();
  const nome = (setorName || '').trim();
  return map[nome] || null;
}

// Parse CSV com detecção de delimitador
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];

  const firstLine = lines[0];

  const pipeCount = (firstLine.match(/\|/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;

  let delimiter = ',';
  if (pipeCount > semicolonCount && pipeCount > commaCount) {
    delimiter = '|';
  } else if (semicolonCount > commaCount) {
    delimiter = ';';
  }

  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["'\uFEFF]|["']$/g, ''));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length >= 2) {
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }
  }

  return rows;
}

// Carregar dados brutos de vendas (com produtos)
function loadVendasRaw() {
  const DATA_FILE = getDataFile();

  if (!fs.existsSync(DATA_FILE)) {
    console.warn(`[ProdutosService] Arquivo não encontrado: ${DATA_FILE}`);
    return [];
  }

  try {
    const stats = fs.statSync(DATA_FILE);

    if (rawCache && stats.mtimeMs === rawLastMtime) {
      return rawCache;
    }

    console.log('[ProdutosService] Carregando dados de produtos...');

    let rawData;
    const ext = path.extname(DATA_FILE).toLowerCase();

    if (ext === '.csv') {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      rawData = parseCSV(content);
    } else {
      rawData = readAllRows(DATA_FILE);
    }

    rawCache = rawData;
    rawLastMtime = stats.mtimeMs;
    console.log(`[ProdutosService] Sucesso: ${rawData.length} registros carregados.`);

    return rawData;
  } catch (error) {
    console.error('[ProdutosService] Erro ao ler arquivo:', error);
    return [];
  }
}

// Função auxiliar para buscar valor em uma row
function getVal(row, keys) {
  for (const k of keys) {
    const foundKey = Object.keys(row).find(rk =>
      rk.toLowerCase().replace(/\s+/g, '') === k.toLowerCase().replace(/\s+/g, '')
    );
    if (foundKey && row[foundKey]) return row[foundKey];
  }
  return '';
}

const ProdutosService = {
  /**
   * Retorna análise de associação de produtos para um setor
   * @param {string} setorId - Código do setor
   * @returns {object} Dados de associação
   */
  getAssociacoesBySetor: (setorId) => {
    const rawData = loadVendasRaw();

    // Filtrar por setor
    const vendasSetor = rawData.filter(row => {
      const setorNome = getVal(row, ['Setor', 'setor', 'SetorNome']);
      const rowSetorId = findSetorCode(setorNome);

      // Verificar se é venda
      const tipo = String(getVal(row, ['Tipo', 'tipo'])).trim().toLowerCase();
      if (tipo !== 'venda') return false;

      return rowSetorId === setorId;
    });

    if (vendasSetor.length === 0) {
      return {
        setorId,
        totalTransacoes: 0,
        totalProdutosUnicos: 0,
        associacoes: [],
        topProdutos: []
      };
    }

    // Agrupar por transação (CodigoRevendedora + DataCaptacao)
    const transacoes = {};
    const produtosContagem = {};

    vendasSetor.forEach(row => {
      const codigoRevendedora = normalizeCode(getVal(row, ['CodigoRevendedora', 'CodigoRevendedor']));
      const dataCaptacao = getVal(row, ['DataCaptacao', 'dataCaptacao', 'Data']);
      const nomeProduto = getVal(row, ['NomeProduto', 'nomeProduto', 'Produto']);
      const quantidade = parseInt(getVal(row, ['QuantidadeItens', 'quantidadeItens', 'Quantidade'])) || 1;

      if (!codigoRevendedora || !nomeProduto) return;

      // Criar chave de transação
      const transacaoKey = `${codigoRevendedora}|${dataCaptacao}`;

      if (!transacoes[transacaoKey]) {
        transacoes[transacaoKey] = new Set();
      }
      transacoes[transacaoKey].add(nomeProduto);

      // Contar produtos
      if (!produtosContagem[nomeProduto]) {
        produtosContagem[nomeProduto] = 0;
      }
      produtosContagem[nomeProduto] += quantidade;
    });

    // Calcular pares de produtos
    const paresContagem = {};
    const transacoesArray = Object.values(transacoes);
    const totalTransacoes = transacoesArray.length;

    transacoesArray.forEach(produtos => {
      const produtosArray = Array.from(produtos);

      // Só considerar transações com 2+ produtos
      if (produtosArray.length < 2) return;

      // Criar todos os pares possíveis
      for (let i = 0; i < produtosArray.length; i++) {
        for (let j = i + 1; j < produtosArray.length; j++) {
          // Ordenar para garantir consistência (A+B = B+A)
          const par = [produtosArray[i], produtosArray[j]].sort();
          const parKey = par.join('|||');

          if (!paresContagem[parKey]) {
            paresContagem[parKey] = {
              produto1: par[0],
              produto2: par[1],
              frequencia: 0
            };
          }
          paresContagem[parKey].frequencia++;
        }
      }
    });

    // Ordenar pares por frequência e pegar top 20
    const associacoes = Object.values(paresContagem)
      .sort((a, b) => b.frequencia - a.frequencia)
      .slice(0, 20)
      .map(par => ({
        ...par,
        percentual: totalTransacoes > 0
          ? Math.round((par.frequencia / totalTransacoes) * 1000) / 10
          : 0
      }));

    // Top 10 produtos mais vendidos
    const topProdutos = Object.entries(produtosContagem)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nome, quantidade]) => ({ nome, quantidade }));

    return {
      setorId,
      totalTransacoes,
      totalProdutosUnicos: Object.keys(produtosContagem).length,
      associacoes,
      topProdutos
    };
  },

  /**
   * Limpa o cache
   */
  clearCache: () => {
    rawCache = null;
    rawLastMtime = 0;
    setorNameToCodeMap = null;
  }
};

module.exports = ProdutosService;
