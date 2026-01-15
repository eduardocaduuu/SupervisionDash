const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const SegmentService = require('./SegmentService');

// Caminho para o arquivo estático: data/vendas_bd (na raiz do projeto)
const DATA_DIR = path.join(__dirname, '../../data');

function getDataFile() {
  const xlsxPath = path.join(DATA_DIR, 'vendas_bd.xlsx');
  const csvPath = path.join(DATA_DIR, 'vendas_bd.csv');

  if (fs.existsSync(xlsxPath)) return xlsxPath;
  if (fs.existsSync(csvPath)) return csvPath;
  return xlsxPath;
}

let cache = null;
let lastMtime = 0;
let setorNameToCodeMap = null;

// Converter moeda PT-BR para número (1.234,56 -> 1234.56)
function parseCurrencyPTBR(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const str = String(value).trim();
  let clean = str.replace(/R\$\s*/gi, '').trim();

  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',') && !clean.includes('.')) {
    clean = clean.replace(',', '.');
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Normalizar código (remover pontos e espaços)
function normalizeCode(code) {
  return String(code || '').replace(/\./g, '').replace(/\s+/g, '').trim();
}

// Construir mapa de nome de setor para código
function buildSetorNameToCodeMap() {
  if (setorNameToCodeMap) return setorNameToCodeMap;

  const segmentos = SegmentService.loadSegments();
  setorNameToCodeMap = {};

  segmentos.forEach(s => {
    // O SegmentService já normaliza, mas precisamos do nome original
    // Vamos ler o arquivo diretamente para pegar EstruturaComercial
  });

  // Ler arquivo diretamente para pegar o mapeamento nome -> código
  const segmentosPath = path.join(DATA_DIR, 'Segmentos_bd.xlsx');
  if (fs.existsSync(segmentosPath)) {
    try {
      const workbook = XLSX.readFile(segmentosPath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      rawData.forEach(row => {
        const nome = (row.EstruturaComercial || '').trim();
        const codigo = normalizeCode(row.CodigoEstruturaComercial);
        if (nome && codigo) {
          setorNameToCodeMap[nome] = codigo;
        }
      });

      console.log(`[VendasService] Mapa de setores construído: ${Object.keys(setorNameToCodeMap).length} entradas`);
    } catch (e) {
      console.error('[VendasService] Erro ao construir mapa de setores:', e);
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

// Parse CSV com detecção de delimitador (inclui pipe)
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];

  const firstLine = lines[0];

  // Detectar delimitador (pipe tem prioridade pois é comum em exports BR)
  const pipeCount = (firstLine.match(/\|/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;

  let delimiter = ',';
  if (pipeCount > semicolonCount && pipeCount > commaCount) {
    delimiter = '|';
  } else if (semicolonCount > commaCount) {
    delimiter = ';';
  }

  // Parse header
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["'\uFEFF]|["']$/g, ''));

  // Parse rows
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

const VendasService = {
  /**
   * Lê o arquivo Excel/CSV de vendas e retorna os dados agrupados por setor/revendedor.
   */
  loadVendas: () => {
    const DATA_FILE = getDataFile();

    if (!fs.existsSync(DATA_FILE)) {
      console.warn(`[VendasService] Arquivo não encontrado: ${DATA_FILE}`);
      return [];
    }

    try {
      const stats = fs.statSync(DATA_FILE);

      if (cache && stats.mtimeMs === lastMtime) {
        return cache;
      }

      console.log('[VendasService] Carregando base de vendas...');

      let rawData;
      const ext = path.extname(DATA_FILE).toLowerCase();

      if (ext === '.csv') {
        const content = fs.readFileSync(DATA_FILE, 'utf-8');
        rawData = parseCSV(content);
      } else {
        const workbook = XLSX.readFile(DATA_FILE);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        rawData = XLSX.utils.sheet_to_json(worksheet);
      }

      // Agrupar vendas por setor/revendedor
      const dealers = {};

      rawData.forEach(row => {
        // Função auxiliar para buscar valor
        const getVal = (keys) => {
          for (const k of keys) {
            const foundKey = Object.keys(row).find(rk =>
              rk.toLowerCase().replace(/\s+/g, '') === k.toLowerCase().replace(/\s+/g, '')
            );
            if (foundKey && row[foundKey]) return row[foundKey];
          }
          return '';
        };

        // Verificar se é venda
        const tipo = String(getVal(['Tipo', 'tipo'])).trim().toLowerCase();
        if (tipo !== 'venda') return;

        // Pegar nome do setor e converter para código
        const setorNome = getVal(['Setor', 'setor', 'SetorNome']);
        const setorId = findSetorCode(setorNome);

        if (!setorId) {
          // Se não encontrou o código, tenta extrair número do nome (fallback)
          const match = String(setorNome).match(/\d{4,}/);
          if (!match) return;
        }

        const finalSetorId = setorId || String(setorNome).match(/\d{4,}/)?.[0];
        if (!finalSetorId) return;

        // Normalizar código do revendedor
        const codigoRevendedor = normalizeCode(getVal(['CodigoRevendedora', 'CodigoRevendedor', 'codigoRevendedor', 'Codigo']));
        const nomeRevendedor = getVal(['NomeRevendedora', 'NomeRevendedor', 'Nome']) || '';
        const ciclo = getVal(['CicloFaturamento', 'Ciclo', 'ciclo']) || '';
        const valor = parseCurrencyPTBR(getVal(['ValorPraticado', 'Valor', 'valor', 'Faturamento']));

        if (!codigoRevendedor || !ciclo) return;

        const key = `${finalSetorId}-${codigoRevendedor}`;

        if (!dealers[key]) {
          dealers[key] = {
            codigo: codigoRevendedor,
            nome: nomeRevendedor,
            setorId: finalSetorId,
            ciclos: {}
          };
        }

        if (!dealers[key].ciclos[ciclo]) {
          dealers[key].ciclos[ciclo] = 0;
        }
        dealers[key].ciclos[ciclo] += valor;
      });

      const result = Object.values(dealers);
      cache = result;
      lastMtime = stats.mtimeMs;
      console.log(`[VendasService] Sucesso: ${result.length} revendedores com vendas carregados.`);

      return result;
    } catch (error) {
      console.error('[VendasService] Erro crítico ao ler arquivo:', error);
      return [];
    }
  },

  /**
   * Retorna vendas filtradas por setor
   */
  getVendasBySetor: (setorId) => {
    const vendas = VendasService.loadVendas();
    return vendas.filter(v => v.setorId === setorId);
  },

  /**
   * Limpa o cache para forçar recarregamento
   */
  clearCache: () => {
    cache = null;
    lastMtime = 0;
    setorNameToCodeMap = null;
  }
};

module.exports = VendasService;
