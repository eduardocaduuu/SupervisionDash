const fs = require('fs');
const path = require('path');
const { readAllRows } = require('./utils/xlsx');

// ═══════════════════════════════════════════════════════════════
// REGRAS DE SEGMENTAÇÃO (escada + metas)
// ═══════════════════════════════════════════════════════════════
const LADDER = ['Cobre', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Rubi', 'Esmeralda', 'Diamante'];
const SEG = {
  Cobre:     { minManter: 0,      metaSubir: 0.01 },
  Bronze:    { minManter: 0.01,   metaSubir: 3000 },
  Prata:     { minManter: 3000,   metaSubir: 9000 },
  Ouro:      { minManter: 9000,   metaSubir: 20000 },
  Platina:   { minManter: 20000,  metaSubir: 50000 },
  Rubi:      { minManter: 50000,  metaSubir: 80000 },
  Esmeralda: { minManter: 80000,  metaSubir: 130000 },
  Diamante:  { minManter: 130000, metaSubir: null }
};

function normSegmento(papel) {
  if (!papel) return null;
  let s = String(papel).replace(/\s*GB$/i, '').trim();
  s = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return SEG[s] ? s : null;
}
function segmentoPorTotal(total) {
  let r = 'Cobre';
  for (const s of LADDER) if (total >= SEG[s].minManter) r = s;
  return r;
}
function anterior(seg) { const i = LADDER.indexOf(seg); return i > 0 ? LADDER[i - 1] : LADDER[0]; }

function normCode(c) { return String(c || '').replace(/\./g, '').replace(/\s+/g, '').trim(); }

function parseValor(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  let s = String(v).replace(/[R$\s]/g, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseCiclo(str) {
  const m = String(str || '').match(/(\d{1,2})\s*\/\s*(\d{4})/);
  return m ? { num: parseInt(m[1], 10), ano: parseInt(m[2], 10) } : null;
}

// Janela fixa de acúmulo: ciclos 1–9 e 10–17 (zera na virada).
function janelaDoCiclo(num) {
  return (num >= 10 && num <= 17) ? { ini: 10, fim: 17 } : { ini: 1, fim: 9 };
}

// Estamos perto da virada? (nos últimos `n` ciclos da janela: 7-9 ou 15-17)
// Antes disso o acúmulo ainda está sendo construído — não faz sentido avisar "vai cair".
function pertoDaVirada(cicloAtual, n = 3) {
  const pc = parseCiclo(cicloAtual);
  if (!pc) return true; // sem ciclo válido: não suprime
  const { fim } = janelaDoCiclo(pc.num);
  return pc.num >= (fim - (n - 1));
}

// Lista de ciclos da janela atual, do início até o ciclo vigente.
function ciclosDaJanela(cicloAtual) {
  const pc = parseCiclo(cicloAtual);
  if (!pc) return [];
  const { ini, fim } = janelaDoCiclo(pc.num);
  const out = [];
  for (let n = ini; n <= Math.min(pc.num, fim); n++) {
    out.push(`${String(n).padStart(2, '0')}/${pc.ano}`);
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════
// LEITURA DE ARQUIVO (xlsx multi-aba OU csv com detecção de delimitador)
// ═══════════════════════════════════════════════════════════════
function readRowsFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') {
    const VendasService = require('./VendasService'); // parseCSV (delimitador pipe/;/,)
    return VendasService.parseCSV(fs.readFileSync(filePath, 'utf-8'));
  }
  return readAllRows(filePath);
}

// Agrega um arquivo de vendas (Tipo=Venda, ValorPraticado) -> por (codigo, ciclo)
function aggregateFile(filePath) {
  const rows = readRowsFromFile(filePath);
  const map = new Map(); // `${codigo}|${ciclo}` -> doc
  for (const r of rows) {
    const getVal = (keys) => {
      for (const k of keys) {
        const fk = Object.keys(r).find(rk => rk.toLowerCase().replace(/\s+/g, '') === k.toLowerCase().replace(/\s+/g, ''));
        if (fk && r[fk] !== '') return r[fk];
      }
      return '';
    };
    if (String(getVal(['Tipo'])).trim().toLowerCase() !== 'venda') continue;
    const codigo = normCode(getVal(['CodigoRevendedora', 'CodigoRevendedor', 'Codigo']));
    const ciclo = String(getVal(['CicloFaturamento', 'Ciclo'])).trim();
    const pc = parseCiclo(ciclo);
    if (!codigo || !pc) continue;
    const val = parseValor(getVal(['ValorPraticado']));
    const key = `${codigo}|${ciclo}`;
    if (!map.has(key)) {
      map.set(key, { codigo, setorId: '', ciclo, cicloNum: pc.num, ano: pc.ano, total: 0 });
    }
    map.get(key).total += val;
  }
  return [...map.values()];
}

// ═══════════════════════════════════════════════════════════════
// PREVISÃO: dado o segmento oficial (Papel) e o acumulado da janela,
// calcula meta de manter/subir, "onde cai" (1 nível) e "para onde sobe".
// ═══════════════════════════════════════════════════════════════
function forecast(papel, acumulado) {
  const seg = normSegmento(papel) || segmentoPorTotal(acumulado);
  const info = SEG[seg];
  const metaManter = info.minManter;
  const faltaManter = Math.max(0, metaManter - acumulado);
  const metaSubir = info.metaSubir;
  const faltaSubir = metaSubir != null ? Math.max(0, metaSubir - acumulado) : null;
  const mantem = acumulado >= metaManter;
  const cairiaPara = mantem ? null : anterior(seg);             // cai 1 nível na virada
  // sobe só para um nível ESTRITAMENTE acima do atual (paridade com index.js)
  let subiriaPara = null;
  if (metaSubir != null && acumulado >= metaSubir) {
    const alvo = segmentoPorTotal(acumulado);
    if (LADDER.indexOf(alvo) > LADDER.indexOf(seg)) subiriaPara = alvo;
  }
  return {
    segmento: seg,
    acumulado: Math.round(acumulado * 100) / 100,
    metaManter,
    faltaManter: Math.round(faltaManter * 100) / 100,
    metaSubir,
    faltaSubir: faltaSubir != null ? Math.round(faltaSubir * 100) / 100 : null,
    mantem,
    cairiaPara,
    subiriaPara
  };
}

// ═══════════════════════════════════════════════════════════════
// PERSISTÊNCIA NO MONGO (upsert por codigo+ciclo)
// ═══════════════════════════════════════════════════════════════
async function importHistorico(filePath) {
  const CicloVenda = require('./models/CicloVenda');
  const docs = aggregateFile(filePath);
  const agora = new Date();
  const ops = docs.map(d => ({
    updateOne: {
      filter: { codigo: d.codigo, ciclo: d.ciclo },
      update: { $set: { ...d, atualizadoEm: agora } },
      upsert: true
    }
  }));
  let upserts = 0, modificados = 0;
  for (let i = 0; i < ops.length; i += 1000) {
    const res = await CicloVenda.bulkWrite(ops.slice(i, i + 1000), { ordered: false });
    upserts += res.upsertedCount || 0;
    modificados += res.modifiedCount || 0;
  }
  clearCache();
  return { ciclos: [...new Set(docs.map(d => d.ciclo))].sort(), docs: docs.length, upserts, modificados };
}

// ═══════════════════════════════════════════════════════════════
// LEITURA DO HISTÓRICO (com cache em memória, invalidado a cada import)
// ═══════════════════════════════════════════════════════════════
let _detalheCache = null; // { cicloAtual, map: { codigo: { ciclo: total } } }

// Mapa { codigo: { ciclo: total } } para TODOS os ciclos da janela atual.
async function getDetalheTodos(cicloAtual) {
  if (_detalheCache && _detalheCache.cicloAtual === cicloAtual) return _detalheCache.map;
  const CicloVenda = require('./models/CicloVenda');
  const ciclos = ciclosDaJanela(cicloAtual);
  const linhas = await CicloVenda
    .find({ ciclo: { $in: ciclos } }, { codigo: 1, ciclo: 1, total: 1, _id: 0 })
    .lean();
  const map = {};
  for (const l of linhas) {
    (map[l.codigo] = map[l.codigo] || {})[l.ciclo] = l.total;
  }
  _detalheCache = { cicloAtual, map };
  return map;
}

// Acumulado por codigo na janela atual (somatório de todos os ciclos da janela).
async function getAcumuladoPorCodigo(cicloAtual) {
  const detalhe = await getDetalheTodos(cicloAtual);
  const map = {};
  for (const codigo of Object.keys(detalhe)) {
    map[codigo] = Object.values(detalhe[codigo]).reduce((s, v) => s + v, 0);
  }
  return map;
}

function clearCache() { _detalheCache = null; }

module.exports = {
  SEG, LADDER,
  normSegmento, segmentoPorTotal, anterior,
  parseCiclo, janelaDoCiclo, ciclosDaJanela, pertoDaVirada,
  aggregateFile, forecast, importHistorico,
  getDetalheTodos, getAcumuladoPorCodigo, clearCache
};
