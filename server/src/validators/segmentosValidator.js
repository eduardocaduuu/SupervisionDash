/**
 * Validador da planilha de Segmentos (cadastro de revendedores).
 *
 * Analisa o arquivo SEM persistir e devolve:
 *  - report: erros (bloqueiam) e avisos (revisar) categorizados
 *  - rows:   base "limpa" (6 colunas canônicas) já com linhas inválidas
 *            removidas e duplicados deduplicados — pronta para o cliente
 *            aplicar correções e reenviar para o commit.
 */
const XLSX = require('xlsx');

// Escada oficial de segmentos (mesma do app)
const SEGMENTOS_VALIDOS = ['Cobre', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Rubi', 'Esmeralda', 'Diamante'];
const GERENCIAS = ['13706', '13707'];

// Colunas do arquivo final. "Unidade" (gerência 13706/13707) foi adicionada
// para saber a que unidade cada setor pertence.
const COLUNAS = ['CodigoRevendedor', 'Nome', 'Situacao', 'Papel', 'CodigoEstruturaComercial', 'EstruturaComercial', 'Unidade'];

const normCode = (c) => String(c ?? '').replace(/\./g, '').replace(/\s+/g, '').trim();

// Extrai a unidade (13706/13707): usa a coluna "Unidade" se existir, senão
// deriva de EstruturaComercialPai ("Loja 13707 - ...").
function deriveUnidade(r, kUnidade, kPai) {
  if (kUnidade && String(r[kUnidade] ?? '').trim()) return String(r[kUnidade]).trim();
  if (kPai) { const m = String(r[kPai] ?? '').match(/1370[67]/); if (m) return m[0]; }
  return '';
}

function normPapel(papel) {
  if (papel === null || papel === undefined) return null;
  let s = String(papel).replace(/\s*GB$/i, '').trim();
  if (!s) return null;
  s = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return SEGMENTOS_VALIDOS.includes(s) ? s : null;
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

// Lê todas as abas do workbook (buffer OU caminho) e concatena as linhas cruas.
function parse(input) {
  const wb = Buffer.isBuffer(input)
    ? XLSX.read(input, { type: 'buffer' })
    : XLSX.readFile(input);
  const raw = [];
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' });
    for (const r of rows) raw.push(r);
  }
  return raw;
}

/**
 * Analisa as linhas cruas contra os setores atuais.
 * @param {Array<object>} rawRows
 * @param {Array<{id:string,nome:string}>} currentSetores
 * @returns {{report:object, rows:Array<object>}}
 */
function analyze(rawRows, currentSetores = []) {
  const report = {
    totalLinhas: rawRows.length,
    linhasValidas: 0,
    errors: [],
    warnings: [],
    setores: [],          // p/ correção de nome: {setorId, nomeAtual, nomeNovo, novo, inconsistente, nomesNoArquivo:[{nome,count}]}
    papelInvalido: [],    // {valor, label, count}
    gerenciaComoSetor: [],// {setorId, count}
    excluidas: { semCodigo: 0, semSetor: 0, duplicadas: 0 }
  };

  if (!rawRows.length) {
    report.errors.push({ code: 'EMPTY', message: 'A planilha está vazia (nenhuma linha encontrada).' });
    return { report, rows: [] };
  }

  const sample = rawRows[0];
  const kCod = findKey(sample, ['CodigoRevendedor', 'Codigo']);
  const kSetor = findKey(sample, ['CodigoEstruturaComercial', 'SetorId', 'Setor']);
  const kPapel = findKey(sample, ['Papel', 'SegmentoAtual', 'Segmento']);
  const kNome = findKey(sample, ['Nome', 'NomeRevendedora', 'Revendedor']);
  const kSetorNome = findKey(sample, ['EstruturaComercial', 'SetorNome']);
  const kSit = findKey(sample, ['Situacao']);
  const kUnidade = findKey(sample, ['Unidade']);
  const kPai = findKey(sample, ['EstruturaComercialPai']);

  if (!kCod) report.errors.push({ code: 'MISSING_COL_CODIGO', message: 'Coluna obrigatória ausente: código do revendedor (CodigoRevendedor).' });
  if (!kSetor) report.errors.push({ code: 'MISSING_COL_SETOR', message: 'Coluna obrigatória ausente: código do setor (CodigoEstruturaComercial).' });
  if (!kPapel) report.errors.push({ code: 'MISSING_COL_PAPEL', message: 'Coluna obrigatória ausente: segmento (Papel).' });
  if (report.errors.length) return { report, rows: [] };

  const atualById = new Map((currentSetores || []).map(s => [String(s.id), s.nome]));

  const rows = [];
  const vistos = new Set();
  const nomesPorSetor = new Map();   // setorId -> Map(nome -> count)
  const papelInvalido = new Map();   // valorRaw -> { count, lista:[{codigo,nome,setor}] }
  const gerencia = new Map();        // setorId -> count

  for (const r of rawRows) {
    const cod = normCode(r[kCod]);
    const setorId = normCode(r[kSetor]);
    if (!cod) { report.excluidas.semCodigo++; continue; }
    if (!setorId) { report.excluidas.semSetor++; continue; }
    if (vistos.has(cod)) { report.excluidas.duplicadas++; continue; }
    vistos.add(cod);

    if (GERENCIAS.includes(setorId)) gerencia.set(setorId, (gerencia.get(setorId) || 0) + 1);

    const papelRaw = kPapel ? r[kPapel] : '';
    if (!normPapel(papelRaw)) {
      const v = String(papelRaw ?? '').trim();
      if (!papelInvalido.has(v)) papelInvalido.set(v, { count: 0, lista: [] });
      const pi = papelInvalido.get(v);
      pi.count++;
      if (pi.lista.length < 200) {
        pi.lista.push({
          codigo: r[kCod] !== undefined ? r[kCod] : '',
          nome: kNome ? String(r[kNome] ?? '').trim() : '',
          setor: kSetorNome ? String(r[kSetorNome] ?? '').trim() : ''
        });
      }
    }

    const setorNome = kSetorNome ? String(r[kSetorNome] ?? '').trim() : '';
    if (!nomesPorSetor.has(setorId)) nomesPorSetor.set(setorId, new Map());
    const nm = nomesPorSetor.get(setorId);
    nm.set(setorNome, (nm.get(setorNome) || 0) + 1);

    rows.push({
      CodigoRevendedor: r[kCod] !== undefined ? r[kCod] : '',
      Nome: kNome ? (r[kNome] ?? '') : '',
      Situacao: kSit ? (r[kSit] ?? '') : '',
      Papel: papelRaw ?? '',
      CodigoEstruturaComercial: r[kSetor] !== undefined ? r[kSetor] : '',
      EstruturaComercial: setorNome,
      Unidade: deriveUnidade(r, kUnidade, kPai)
    });
  }
  report.linhasValidas = rows.length;

  // Nome canônico por setor (mais frequente). Ignora nomes em branco na votação —
  // células vazias não devem "ganhar" e zerar o nome do setor.
  const canonico = new Map();
  for (const [setorId, nomes] of nomesPorSetor) {
    const entries = [...nomes.entries()]
      .filter(([nome]) => nome && String(nome).trim() !== '')
      .sort((a, b) => b[1] - a[1]);
    const nomeNovo = entries.length ? entries[0][0] : '';
    canonico.set(setorId, nomeNovo);
    const inconsistente = entries.length > 1; // 2+ nomes NÃO vazios
    const nomeAtual = atualById.has(setorId) ? atualById.get(setorId) : null;
    const novo = nomeAtual === null;
    const mudou = !novo && nomeAtual !== nomeNovo;
    if (inconsistente || mudou || novo) {
      report.setores.push({
        setorId, nomeAtual, nomeNovo, novo, inconsistente,
        nomesNoArquivo: entries.map(([nome, count]) => ({ nome, count }))
      });
    }
  }
  // Garante consistência: toda linha do setor usa o nome canônico — mas só
  // sobrescreve quando há um nome (nunca zera um nome existente com vazio).
  for (const row of rows) {
    const sid = normCode(row.CodigoEstruturaComercial);
    const canon = canonico.get(sid);
    if (canon) row.EstruturaComercial = canon;
  }

  report.papelInvalido = [...papelInvalido.entries()]
    .map(([valor, v]) => ({ valor, label: valor || '(vazio)', count: v.count, lista: v.lista }))
    .sort((a, b) => b.count - a.count);
  report.gerenciaComoSetor = [...gerencia.entries()].map(([setorId, count]) => ({ setorId, count }));

  // ── Avisos agregados ──────────────────────────────────────────
  const { semCodigo, semSetor, duplicadas } = report.excluidas;
  if (semCodigo) report.warnings.push({ code: 'SEM_CODIGO', count: semCodigo, message: `${semCodigo} linha(s) sem código de revendedor — serão ignoradas.` });
  if (semSetor) report.warnings.push({ code: 'SEM_SETOR', count: semSetor, message: `${semSetor} linha(s) sem código de setor — serão ignoradas.` });
  if (duplicadas) report.warnings.push({ code: 'DUPLICADAS', count: duplicadas, message: `${duplicadas} revendedor(es) duplicado(s) — manteremos a primeira ocorrência.` });
  const totalPapel = report.papelInvalido.reduce((s, x) => s + x.count, 0);
  if (totalPapel) report.warnings.push({ code: 'PAPEL_INVALIDO', count: totalPapel, message: `${totalPapel} revendedor(es) com segmento (Papel) não reconhecido.` });
  const renomeados = report.setores.filter(s => !s.novo && !s.inconsistente).length;
  const inconsist = report.setores.filter(s => s.inconsistente).length;
  const novos = report.setores.filter(s => s.novo).length;
  if (renomeados) report.warnings.push({ code: 'SETOR_RENOMEADO', count: renomeados, message: `${renomeados} setor(es) com nome diferente do cadastro atual — revise.` });
  if (inconsist) report.warnings.push({ code: 'SETOR_INCONSISTENTE', count: inconsist, message: `${inconsist} setor(es) com mais de um nome na planilha — escolha o correto.` });
  if (novos) report.warnings.push({ code: 'SETOR_NOVO', count: novos, message: `${novos} setor(es) novo(s) (não existiam no cadastro atual).` });
  if (report.gerenciaComoSetor.length) report.warnings.push({ code: 'GERENCIA', count: report.gerenciaComoSetor.length, message: `${report.gerenciaComoSetor.length} código(s) de gerência (13706/13707) aparecem como setor.` });

  return { report, rows };
}

// Gera o workbook (aba única "Folha1", colunas canônicas) a partir das linhas finais.
function buildWorkbook(rows) {
  const limpas = (rows || []).map(r => {
    const o = {};
    for (const c of COLUNAS) o[c] = r[c] !== undefined && r[c] !== null ? r[c] : '';
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(limpas, { header: COLUNAS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Folha1');
  return wb;
}

// Escreve as linhas finais como Segmentos_bd.xlsx no caminho indicado.
function writeToFile(rows, filePath) {
  XLSX.writeFile(buildWorkbook(rows), filePath);
}

// Mapeia linhas cruas (qualquer origem) para o formato canônico de 6 colunas,
// preservando os valores. Usado ao anexar revendedores ao cadastro existente.
function toCanonicalRows(rawRows) {
  if (!rawRows || !rawRows.length) return [];
  const sample = rawRows[0];
  const kCod = findKey(sample, ['CodigoRevendedor', 'Codigo']);
  const kNome = findKey(sample, ['Nome', 'NomeRevendedora', 'Revendedor']);
  const kSit = findKey(sample, ['Situacao']);
  const kPapel = findKey(sample, ['Papel', 'SegmentoAtual', 'Segmento']);
  const kSetor = findKey(sample, ['CodigoEstruturaComercial', 'SetorId', 'Setor']);
  const kSetorNome = findKey(sample, ['EstruturaComercial', 'SetorNome']);
  const kUnidade = findKey(sample, ['Unidade']);
  const kPai = findKey(sample, ['EstruturaComercialPai']);
  return rawRows.map(r => ({
    CodigoRevendedor: kCod ? (r[kCod] ?? '') : '',
    Nome: kNome ? (r[kNome] ?? '') : '',
    Situacao: kSit ? (r[kSit] ?? '') : '',
    Papel: kPapel ? (r[kPapel] ?? '') : '',
    CodigoEstruturaComercial: kSetor ? (r[kSetor] ?? '') : '',
    EstruturaComercial: kSetorNome ? (r[kSetorNome] ?? '') : '',
    Unidade: deriveUnidade(r, kUnidade, kPai)
  }));
}

module.exports = {
  SEGMENTOS_VALIDOS, GERENCIAS, COLUNAS,
  normCode, normPapel, parse, analyze, buildWorkbook, writeToFile, toCanonicalRows
};
