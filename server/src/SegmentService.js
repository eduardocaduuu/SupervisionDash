const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Caminho para o arquivo estático: data/Segmentos_bd.xlsx (na raiz do projeto)
// __dirname em src/ aponta para server/src, então ../../data sobe para a raiz/data
const DATA_FILE = path.join(__dirname, '../../data/Segmentos_bd.xlsx');

let cache = null;
let lastMtime = 0;

const SegmentService = {
  /**
   * Lê o arquivo Excel estático e retorna os dados normalizados.
   * Faz cache em memória para evitar leitura de disco a cada request,
   * atualizando apenas se o arquivo for modificado.
   */
  loadSegments: () => {
    if (!fs.existsSync(DATA_FILE)) {
      console.warn(`[SegmentService] Arquivo não encontrado: ${DATA_FILE}`);
      // Retorna array vazio para não quebrar a aplicação se o arquivo faltar
      return [];
    }

    try {
      const stats = fs.statSync(DATA_FILE);
      
      // Se o arquivo não mudou desde a última leitura, retorna cache
      if (cache && stats.mtimeMs === lastMtime) {
        return cache;
      }

      console.log('[SegmentService] Carregando base de segmentos...');
      const workbook = XLSX.readFile(DATA_FILE);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      const normalizedData = rawData.map(row => {
        // Função auxiliar para buscar valor ignorando maiúsculas/minúsculas
        const getVal = (keys) => {
          for (const k of keys) {
            const foundKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
            if (foundKey) return row[foundKey];
          }
          return '';
        };

        // Função para normalizar código (remover pontos e espaços)
        const normalizeCode = (code) => String(code || '').replace(/\./g, '').replace(/\s+/g, '').trim();

        // Mapeamento das colunas (De-Para)
        return {
          codigo: normalizeCode(getVal(['CodigoRevendedor', 'Codigo'])),
          nome: getVal(['Nome', 'NomeRevendedora', 'Revendedor']) || 'Sem Nome',
          setorId: normalizeCode(getVal(['CodigoEstruturaComercial', 'SetorId', 'Setor'])),
          segmentoOficial: getVal(['Papel', 'SegmentoAtual', 'Segmento']) || 'Bronze'
        };
      }).filter(d => d.codigo && d.setorId); // Filtra linhas inválidas

      cache = normalizedData;
      lastMtime = stats.mtimeMs;
      console.log(`[SegmentService] Sucesso: ${normalizedData.length} segmentos carregados.`);
      
      return normalizedData;
    } catch (error) {
      console.error('[SegmentService] Erro crítico ao ler arquivo:', error);
      return [];
    }
  }
};

module.exports = SegmentService;