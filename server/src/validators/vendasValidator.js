/**
 * Validador da planilha de Vendas.
 *
 * Analisa o arquivo SEM persistir e devolve um relatório categorizado
 * (erros que bloqueiam × avisos). A única correção aplicável na app é o
 * mapeamento de nome de setor → código (setores que não resolvem sozinhos).
 *
 * O arquivo de vendas pode ser grande, então NÃO devolvemos as linhas ao
 * cliente: o relatório é agregado e, no commit, o cliente reenvia o arquivo
 * junto com o mapa de correções de setor.
 */
const XLSX = require('xlsx');

const normCode = (c) => String(c ?? '').replace(/\./g, '').replace(/\s+/g, '').trim();

function parseCicloStr(s) {
  const m = String(s ?? '').trim().match(/^(\d{1,2})\s*\/\s*(\d{4})$/);
  return m ? { num: parseInt(m[1], 10), ano: parseInt(m[2], 10) } : null;
}

// Mesmo parse de valor do HistoryService (R$, milhar, vírgula decimal)
function parseValor(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  let s = String(v).replace(/[R$\s]/g, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function findKey(sampleRow, alts) {
  const keys = Object.keys(sampleRow || {});
  const simplify = (x) => x.toLowerCase().replace(/\s+/g, '');
  for (const a of alts) {
    const k = keys.find(rk => simplify(rk) === simplify(a));
    if (k) return k;
  }
  return null;
}

// Lê o arquivo (buffer). CSV usa o parser do VendasService (detecção de delimitador).
function parse(buffer, filename) {
  const ext = String(filename || '').toLowerCase();
  if (ext.endsWith('.csv')) {
    const VendasService = require('../VendasService');
    return VendasService.parseCSV(buffer.toString('utf-8'));
  }
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const rows = [];
  for (const name of wb.SheetNames) {
    const r = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' });
    for (const row of r) rows.push(row);
  }
  return rows;
}

// Resolve o setor pelo nome (mesma lógica do VendasService): mapa nome→código
// (injetado) e, como fallback, extrai um número de 4+ dígitos do nome.
function resolverSetor(nome, resolveSetor) {
  const code = resolveSetor ? resolveSetor(nome) : null;
  if (code) return code;
  const m = String(nome ?? '').match(/\d{4,}/);
  return m ? m[0] : null;
}

/**
 * @param {Array<object>} rawRows
 * @param {object} deps { resolveSetor: (nome)=>codigo|null, cadastroCodigos: Set<string> }
 */
function analyze(rawRows, deps = {}) {
  const resolveSetor = deps.resolveSetor || (() => null);
  const cadastroCodigos = deps.cadastroCodigos || new Set();

  const report = {
    totalLinhas: rawRows.length,
    vendas: 0,
    naoVenda: 0,
    errors: [],
    warnings: [],
    ciclos: [],
    setoresNaoResolvidos: [],
    excluidas: { semCodigo: 0, semCiclo: 0, cicloInvalido: 0 },
    revendedoresSemCadastro: { count: 0, exemplos: [] }
  };

  if (!rawRows.length) {
    report.errors.push({ code: 'EMPTY', message: 'A planilha de vendas está vazia (nenhuma linha).' });
    return { report };
  }

  const sample = rawRows[0];
  const kTipo = findKey(sample, ['Tipo']);
  const kSetor = findKey(sample, ['Setor', 'SetorNome']);
  const kCod = findKey(sample, ['CodigoRevendedora', 'CodigoRevendedor', 'Codigo']);
  const kCiclo = findKey(sample, ['CicloFaturamento', 'Ciclo']);
  const kValor = findKey(sample, ['ValorVenda', 'Faturamento', 'Valor']);

  if (!kTipo) report.errors.push({ code: 'MISSING_COL_TIPO', message: 'Coluna "Tipo" ausente — nenhuma venda seria reconhecida (o app importa apenas Tipo = Venda).' });
  if (!kCod) report.errors.push({ code: 'MISSING_COL_CODIGO', message: 'Coluna obrigatória ausente: código do revendedor (CodigoRevendedora).' });
  if (!kCiclo) report.errors.push({ code: 'MISSING_COL_CICLO', message: 'Coluna obrigatória ausente: ciclo (CicloFaturamento).' });
  if (!kValor) report.errors.push({ code: 'MISSING_COL_VALOR', message: 'Coluna obrigatória ausente: valor da venda (ValorVenda/Faturamento).' });
  if (report.errors.length) return { report };

  // A coluna Setor não é obrigatória para o histórico (que usa código+ciclo),
  // mas sem ela o dashboard não agrupa as vendas por setor. Avisa claramente.
  if (!kSetor) {
    report.warnings.push({ code: 'SEM_COL_SETOR', message: 'Coluna "Setor" ausente — as vendas não serão agrupadas por setor no dashboard (o histórico/acúmulo continua funcionando).' });
  }

  const ciclos = new Map();          // ciclo -> { linhas, total }
  const setoresNaoResolv = new Map();// nome -> count
  const semCadastro = new Set();
  const cicloInvalidoEx = new Set();

  for (const r of rawRows) {
    const tipo = String(r[kTipo] ?? '').trim().toLowerCase();
    if (tipo !== 'venda') { report.naoVenda++; continue; }
    report.vendas++;

    const cod = normCode(r[kCod]);
    const cicloRaw = String(r[kCiclo] ?? '').trim();
    const nomeSetor = String(r[kSetor] ?? '').trim();

    if (!cod) { report.excluidas.semCodigo++; }
    if (!cicloRaw) { report.excluidas.semCiclo++; }

    const pc = parseCicloStr(cicloRaw);
    if (cicloRaw && !pc) {
      report.excluidas.cicloInvalido++;
      if (cicloInvalidoEx.size < 8) cicloInvalidoEx.add(cicloRaw);
    }

    // Setor não resolvido (nome não bate cadastro/alias e sem número 4+ díg.)
    if (nomeSetor && !resolverSetor(nomeSetor, resolveSetor)) {
      setoresNaoResolv.set(nomeSetor, (setoresNaoResolv.get(nomeSetor) || 0) + 1);
    }

    // Revendedor sem cadastro
    if (cod && cadastroCodigos.size && !cadastroCodigos.has(cod)) {
      if (semCadastro.size < 5000) semCadastro.add(cod);
    }

    // Acúmulo por ciclo (apenas ciclos válidos)
    if (pc && cod) {
      const key = cicloRaw;
      if (!ciclos.has(key)) ciclos.set(key, { linhas: 0, total: 0 });
      const c = ciclos.get(key);
      c.linhas++;
      c.total += parseValor(r[kValor]);
    }
  }

  report.ciclos = [...ciclos.entries()]
    .map(([ciclo, v]) => ({ ciclo, linhas: v.linhas, total: Math.round(v.total * 100) / 100 }))
    .sort((a, b) => a.ciclo.localeCompare(b.ciclo));
  report.setoresNaoResolvidos = [...setoresNaoResolv.entries()]
    .map(([nome, count]) => ({ nome, count }))
    .sort((a, b) => b.count - a.count);
  report.revendedoresSemCadastro = { count: semCadastro.size, exemplos: [...semCadastro].slice(0, 8) };

  // ── Avisos ────────────────────────────────────────────────────
  if (report.vendas === 0) report.errors.push({ code: 'SEM_VENDAS', message: 'Nenhuma linha com Tipo = Venda foi encontrada.' });
  if (report.naoVenda) report.warnings.push({ code: 'NAO_VENDA', count: report.naoVenda, message: `${report.naoVenda} linha(s) não são "Venda" (Doação/Brinde/etc.) — serão ignoradas.` });
  if (report.excluidas.semCodigo) report.warnings.push({ code: 'SEM_CODIGO', count: report.excluidas.semCodigo, message: `${report.excluidas.semCodigo} venda(s) sem código de revendedor — serão ignoradas.` });
  if (report.excluidas.semCiclo) report.warnings.push({ code: 'SEM_CICLO', count: report.excluidas.semCiclo, message: `${report.excluidas.semCiclo} venda(s) sem ciclo — serão ignoradas.` });
  if (report.excluidas.cicloInvalido) report.warnings.push({ code: 'CICLO_INVALIDO', count: report.excluidas.cicloInvalido, message: `${report.excluidas.cicloInvalido} venda(s) com ciclo em formato inesperado (ex.: ${[...cicloInvalidoEx].slice(0, 4).join(', ')}) — provável desalinhamento de colunas. Serão ignoradas.` });
  if (report.setoresNaoResolvidos.length) report.warnings.push({ code: 'SETOR_NAO_RESOLVIDO', count: report.setoresNaoResolvidos.length, message: `${report.setoresNaoResolvidos.length} nome(s) de setor não reconhecido(s) — mapeie para o setor correto abaixo.` });
  if (report.revendedoresSemCadastro.count) report.warnings.push({ code: 'SEM_CADASTRO', count: report.revendedoresSemCadastro.count, message: `${report.revendedoresSemCadastro.count} revendedor(es) das vendas não estão no cadastro de Segmentos.` });

  return { report };
}

// Aplica o mapa de correção (nome de setor -> código) e devolve o workbook final.
// codeToName: Map(codigo -> nome canônico do cadastro) para gravar um nome legível.
function buildWorkbook(rawRows, setorMap = {}, codeToName = new Map()) {
  const rows = rawRows.map(r => ({ ...r }));
  if (Object.keys(setorMap).length && rows.length) {
    const kSetor = findKey(rows[0], ['Setor', 'SetorNome']);
    if (kSetor) {
      for (const row of rows) {
        const nome = String(row[kSetor] ?? '').trim();
        const code = setorMap[nome];
        if (code) {
          const nomeCanon = codeToName.get(String(code));
          // Formato "<codigo> - <nome>": o resolvedor (loadVendas) extrai o código
          // pelo fallback \d{4,}. Premissa: códigos de setor têm 4+ dígitos
          // (mínimo atual: 1260). Se algum dia houver código < 4 dígitos, este
          // formato não resolveria e as vendas cairiam — revisar aqui.
          row[kSetor] = nomeCanon ? `${code} - ${nomeCanon}` : String(code);
        }
      }
    }
  }
  const header = rows.length ? Object.keys(rows[0]) : [];
  const ws = XLSX.utils.json_to_sheet(rows, { header });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vendas');
  return wb;
}

function writeToFile(rawRows, filePath, setorMap = {}, codeToName = new Map()) {
  XLSX.writeFile(buildWorkbook(rawRows, setorMap, codeToName), filePath);
}

module.exports = { normCode, parseCicloStr, parseValor, parse, analyze, buildWorkbook, writeToFile };
