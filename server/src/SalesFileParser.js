import * as XLSX from 'xlsx'

export const SalesFileParser = {
  /**
   * Analisa arquivos de vendas (Excel ou CSV) e normaliza para o padrão do sistema.
   * @param {File} file - O arquivo vindo do input HTML
   * @returns {Promise<Array>} - Array de objetos normalizados
   */
  parse: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          
          // 1. Leitura Universal (XLSX e CSV)
          // A lib xlsx detecta automaticamente se é binário (Excel) ou texto (CSV)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // Pega a primeira aba
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          
          // Converte para JSON bruto
          const rawData = XLSX.utils.sheet_to_json(worksheet)

          if (!rawData || rawData.length === 0) {
            throw new Error('O arquivo está vazio.')
          }

          // 2. Normalização e Mapeamento
          const normalizedData = rawData.map(row => {
            // Função auxiliar para buscar valor case-insensitive
            const getVal = (keys) => {
              for (const k of keys) {
                if (row[k] !== undefined) return row[k]
              }
              return ''
            }

            // Tratamento do Código (CRÍTICO: String e Trim)
            let codigo = getVal(['CodigoRevendedor', 'Codigo', 'Código', 'CODIGO'])
            codigo = String(codigo).replace(/\s+/g, '').trim()

            // Tratamento de Valor (Numérico)
            let valor = getVal(['ValorPraticado', 'Valor', 'Venda', 'Total'])
            if (typeof valor === 'string') {
              // Remove R$ e converte PT-BR (1.000,00 -> 1000.00)
              valor = parseFloat(valor.replace('R$', '').replace(/\./g, '').replace(',', '.'))
            }

            return {
              // Campos esperados pelo Backend (index.js -> loadCSVData)
              Tipo: 'Venda', // Força o tipo para garantir processamento
              Setor: getVal(['Setor', 'SetorId', 'Estrutura']),
              CodigoRevendedor: codigo,
              NomeRevendedora: getVal(['NomeRevendedora', 'Nome', 'Revendedor']),
              CicloFaturamento: getVal(['CicloFaturamento', 'Ciclo']),
              ValorPraticado: isNaN(valor) ? 0 : valor
            }
          }).filter(item => item.CodigoRevendedor && item.Setor) // Remove linhas inválidas

            if (normalizedData.length === 0) {
            throw new Error('Nenhuma venda válida encontrada. Verifique as colunas do arquivo.')
          }

          resolve(normalizedData)
        } catch (err) {
          console.error('Erro no parsing:', err)
          reject(err)
        }
      }

      reader.onerror = (err) => reject(err)
      reader.readAsArrayBuffer(file)
    })
  }
}