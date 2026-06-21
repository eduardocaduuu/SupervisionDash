const XLSX = require('xlsx');

/**
 * Concatena as linhas (sheet_to_json) de TODAS as abas de um workbook.
 *
 * A app recebe planilhas tanto no formato consolidado (1 aba) quanto no
 * formato bruto exportado do sistema (1 aba por unidade, ex.: 13706 e 13707).
 * Ler apenas a primeira aba descartava silenciosamente as demais unidades.
 *
 * @param {import('xlsx').WorkBook} workbook
 * @param {object} [opts] - opções repassadas para XLSX.utils.sheet_to_json
 * @returns {Array<object>}
 */
function rowsFromWorkbook(workbook, opts = {}) {
  const rows = [];
  if (!workbook || !Array.isArray(workbook.SheetNames)) return rows;

  for (const name of workbook.SheetNames) {
    const worksheet = workbook.Sheets[name];
    if (!worksheet) continue;
    const sheetRows = XLSX.utils.sheet_to_json(worksheet, opts);
    for (const row of sheetRows) rows.push(row);
  }
  return rows;
}

/**
 * Lê um arquivo .xlsx e devolve as linhas de TODAS as abas concatenadas.
 *
 * @param {string} filePath
 * @param {object} [opts] - opções repassadas para XLSX.utils.sheet_to_json
 * @returns {Array<object>}
 */
function readAllRows(filePath, opts = {}) {
  const workbook = XLSX.readFile(filePath);
  return rowsFromWorkbook(workbook, opts);
}

module.exports = { rowsFromWorkbook, readAllRows };
