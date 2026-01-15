const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Caminho para o arquivo estático: data/vendas_bd (na raiz do projeto)
// Aceita .xlsx ou .csv
const DATA_DIR = path.join(__dirname, '../../data');

function getDataFile() {
  const xlsxPath = path.join(DATA_DIR, 'vendas_bd.xlsx');
  const csvPath = path.join(DATA_DIR, 'vendas_bd.csv');

  if (fs.existsSync(xlsxPath)) return xlsxPath;
  if (fs.existsSync(csvPath)) return csvPath;
  return xlsxPath; // default
}

let cache = null;
let lastMtime = 0;

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

// Extrair código do setor (primeiro número da string)
function extractSetorId(setorString) {
  const match = String(setorString).match(/^\d+/);
  return match ? match[0] : null;
}

const VendasService = {
  /**
   * Lê o arquivo Excel/CSV de vendas e retorna os dados agrupados por setor/revendedor.
   * Faz cache em memória para evitar leitura de disco a cada request.
   */
  loadVendas: () => {
    const DATA_FILE = getDataFile();

    if (!fs.existsSync(DATA_FILE)) {
      console.warn(`[VendasService] Arquivo não encontrado: ${DATA_FILE}`);
      return [];
    }

    try {
      const stats = fs.statSync(DATA_FILE);

      // Se o arquivo não mudou desde a última leitura, retorna cache
      if (cache && stats.mtimeMs === lastMtime) {
        return cache;
      }

      console.log('[VendasService] Carregando base de vendas...');
      const workbook = XLSX.readFile(DATA_FILE);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      // Agrupar vendas por setor/revendedor
      const dealers = {};

      rawData.forEach(row => {
        // Função auxiliar para buscar valor ignorando maiúsculas/minúsculas
        const getVal = (keys) => {
          for (const k of keys) {
            const foundKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
            if (foundKey) return row[foundKey];
          }
          return '';
        };

        // Verificar se é venda
        const tipo = String(getVal(['Tipo', 'tipo'])).trim().toLowerCase();
        if (tipo !== 'venda') return;

        // Extrair setorId (primeiro número)
        const setorRaw = getVal(['Setor', 'setor', 'SetorId']);
        const setorId = extractSetorId(setorRaw);
        if (!setorId) return;

        const codigoRevendedor = String(getVal(['CodigoRevendedor', 'codigoRevendedor', 'Codigo'])).replace(/\s+/g, '').trim();
        const nomeRevendedor = getVal(['NomeRevendedora', 'NomeRevendedor', 'Nome']) || '';
        const ciclo = getVal(['CicloFaturamento', 'Ciclo', 'ciclo']) || '';
        const valor = parseCurrencyPTBR(getVal(['ValorPraticado', 'Valor', 'valor']));

        if (!codigoRevendedor || !ciclo) return;

        const key = `${setorId}-${codigoRevendedor}`;

        if (!dealers[key]) {
          dealers[key] = {
            codigo: codigoRevendedor,
            nome: nomeRevendedor,
            setorId: setorId,
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
  }
};

module.exports = VendasService;
