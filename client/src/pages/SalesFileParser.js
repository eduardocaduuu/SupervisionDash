import * as XLSX from 'xlsx'
import Papa from 'papaparse'

// Função de normalização para garantir que o Backend receba o que espera
function normalizeData(rawData) {
  if (!rawData || rawData.length === 0) {
    throw new Error('Arquivo vazio ou sem dados reconhecíveis.')
  }

  return rawData.map(row => {
    // Helper para buscar valor ignorando Case Sensitivity (ex: "Codigo" ou "codigo")
    const getVal = (keys) => {
      for (const k of keys) {
        const foundKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase())
        if (foundKey) return row[foundKey]
      }
      return ''
    }

    // Tratamento Crítico do Código (String e sem espaços)
    let codigo = getVal(['CodigoRevendedor', 'Codigo', 'Código', 'CODIGO'])
    codigo = String(codigo).replace(/\s+/g, '').trim()

    // Tratamento de Valor (R$ -> Number)
    let valor = getVal(['ValorPraticado', 'Valor', 'Venda', 'Total'])
    if (typeof valor === 'string') {
      valor = parseFloat(valor.replace('R$', '').replace(/\./g, '').replace(',', '.'))
    }

    return {
      // Campos obrigatórios para o Backend (index.js)
      Tipo: 'Venda',
      Setor: getVal(['Setor', 'SetorId', 'Estrutura', 'CodigoEstruturaComercial']),
      CodigoRevendedor: codigo,
      NomeRevendedora: getVal(['NomeRevendedora', 'Nome', 'Revendedor']),
      CicloFaturamento: getVal(['CicloFaturamento', 'Ciclo']),
      ValorPraticado: isNaN(valor) ? 0 : valor,
      
      // Campos extras solicitados
      Papel: getVal(['Papel', 'Segmento', 'SegmentoAtual'])
    }
  }).filter(item => item.CodigoRevendedor && item.Setor) // Remove linhas inválidas
}

// Função principal de parsing
const parseSalesFile = (file) => {
  return new Promise((resolve, reject) => {
    const isCsv = file.name.toLowerCase().endsWith('.csv')

    if (isCsv) {
      // Processamento via PapaParse (CSV)
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "UTF-8", // Tenta forçar UTF-8
        complete: (results) => {
          try {
            if (results.errors.length > 0) {
              console.warn('Avisos no CSV:', results.errors)
            }
            const normalized = normalizeData(results.data)
            resolve(normalized)
          } catch (e) {
            reject(e)
          }
        },
        error: (err) => reject(err)
      })
    } else {
      // Processamento via SheetJS (Excel)
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          const normalized = normalizeData(jsonData)
          resolve(normalized)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = (err) => reject(err)
      reader.readAsArrayBuffer(file)
    }
  })
}

// Exportação compatível com Admin.jsx
export const SalesFileParser = {
  parse: parseSalesFile
}