const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// COORDENADAS DAS CIDADES DE ALAGOAS
// ═══════════════════════════════════════════════════════════════
const CIDADES_ALAGOAS = {
  'Maceió': { lat: -9.6658, lng: -35.7353 },
  'Maceio': { lat: -9.6658, lng: -35.7353 },
  'Arapiraca': { lat: -9.7525, lng: -36.6614 },
  'Rio Largo': { lat: -9.4786, lng: -35.8533 },
  'Palmeira dos Índios': { lat: -9.4081, lng: -36.6328 },
  'Palmeira dos Indios': { lat: -9.4081, lng: -36.6328 },
  'Palmeira': { lat: -9.4081, lng: -36.6328 },
  'União dos Palmares': { lat: -9.1631, lng: -36.0322 },
  'Uniao dos Palmares': { lat: -9.1631, lng: -36.0322 },
  'Penedo': { lat: -10.2906, lng: -36.5858 },
  'São Miguel dos Campos': { lat: -9.7811, lng: -36.0939 },
  'Sao Miguel dos Campos': { lat: -9.7811, lng: -36.0939 },
  'Coruripe': { lat: -10.1258, lng: -36.1756 },
  'Delmiro Gouveia': { lat: -9.3858, lng: -37.9989 },
  'Santana do Ipanema': { lat: -9.3781, lng: -37.2456 },
  'Marechal Deodoro': { lat: -9.7092, lng: -35.8969 },
  'Campo Alegre': { lat: -9.7833, lng: -36.3500 },
  'Girau do Ponciano': { lat: -9.8833, lng: -36.8333 },
  'São Sebastião': { lat: -10.0167, lng: -36.5667 },
  'Sao Sebastiao': { lat: -10.0167, lng: -36.5667 },
  'Matriz de Camaragibe': { lat: -9.1519, lng: -35.5331 },
  'Porto Calvo': { lat: -9.0456, lng: -35.3978 },
  'Joaquim Gomes': { lat: -9.1333, lng: -35.7500 },
  'Atalaia': { lat: -9.5031, lng: -36.0228 },
  'Viçosa': { lat: -9.3706, lng: -36.2456 },
  'Vicosa': { lat: -9.3706, lng: -36.2456 },
  'Murici': { lat: -9.3056, lng: -35.9428 },
  'Igreja Nova': { lat: -10.1258, lng: -36.6608 },
  'Porto Real do Colégio': { lat: -10.1856, lng: -36.8392 },
  'Porto Real do Colegio': { lat: -10.1856, lng: -36.8392 },
  'Porto Real': { lat: -10.1856, lng: -36.8392 },
  'São José da Laje': { lat: -9.0000, lng: -36.0500 },
  'Sao Jose da Laje': { lat: -9.0000, lng: -36.0500 },
  'Pilar': { lat: -9.5972, lng: -35.9569 },
  'Boca da Mata': { lat: -9.6500, lng: -36.2167 },
  'Cajueiro': { lat: -9.4000, lng: -36.1500 },
  'Teotônio Vilela': { lat: -9.9000, lng: -36.3500 },
  'Teotonio Vilela': { lat: -9.9000, lng: -36.3500 },
  'Teotonio': { lat: -9.9000, lng: -36.3500 },
  'Igaci': { lat: -9.5333, lng: -36.6333 },
  'Major Isidoro': { lat: -9.5333, lng: -36.9833 },
  'Major': { lat: -9.5333, lng: -36.9833 },
  'Cacimbinhas': { lat: -9.4000, lng: -36.9833 },
  'Estrela de Alagoas': { lat: -9.3833, lng: -36.7667 },
  'Estrela': { lat: -9.3833, lng: -36.7667 },
  'Minador do Negrão': { lat: -9.3167, lng: -36.8667 },
  'Minador do Negrao': { lat: -9.3167, lng: -36.8667 },
  'Minador': { lat: -9.3167, lng: -36.8667 },
  'Quebrangulo': { lat: -9.3208, lng: -36.4711 },
  'Piaçabuçu': { lat: -10.4056, lng: -36.4344 },
  'Piacabucu': { lat: -10.4056, lng: -36.4344 },
  'Feliz Deserto': { lat: -10.2833, lng: -36.3000 },
  'F. Deserto': { lat: -10.2833, lng: -36.3000 },
  'Junqueiro': { lat: -9.9000, lng: -36.4833 },
  "Olho d'Água das Flores": { lat: -9.5333, lng: -37.3000 },
  "Olho D'Agua das Flores": { lat: -9.5333, lng: -37.3000 },
  "Olho D' Agua": { lat: -9.5333, lng: -37.3000 },
  "Olho D'Agua": { lat: -9.5333, lng: -37.3000 },
  'São Brás': { lat: -10.1167, lng: -36.8500 },
  'Sao Bras': { lat: -10.1167, lng: -36.8500 },
  'Traipu': { lat: -9.9719, lng: -37.0011 },
  'Craíbas': { lat: -9.6167, lng: -36.7667 },
  'Craibas': { lat: -9.6167, lng: -36.7667 },
  'Feira Grande': { lat: -9.9000, lng: -36.6833 },
  'Limoeiro de Anadia': { lat: -9.7500, lng: -36.5167 },
  'Taquarana': { lat: -9.6500, lng: -36.4833 },
  'Coité do Nóia': { lat: -9.6333, lng: -36.5833 },
  'Coite do Noia': { lat: -9.6333, lng: -36.5833 },
  'Lagoa da Canoa': { lat: -9.8333, lng: -36.7333 },
  'Maribondo': { lat: -9.5833, lng: -36.3000 },
  'Tanque d\'Arca': { lat: -9.5333, lng: -36.4333 },
  'Belém': { lat: -9.5667, lng: -36.4833 },
  'Belem': { lat: -9.5667, lng: -36.4833 },
  'Mar Vermelho': { lat: -9.4500, lng: -36.3833 },
  'Paulo Jacinto': { lat: -9.3667, lng: -36.3667 },
  'Chã Preta': { lat: -9.2500, lng: -36.3000 },
  'Cha Preta': { lat: -9.2500, lng: -36.3000 },
  'Ibateguara': { lat: -8.9667, lng: -35.9333 },
  'Colônia Leopoldina': { lat: -8.9167, lng: -35.7167 },
  'Colonia Leopoldina': { lat: -8.9167, lng: -35.7167 },
  'Novo Lino': { lat: -9.0500, lng: -35.6667 },
  'Flexeiras': { lat: -9.1833, lng: -35.7167 },
  'Messias': { lat: -9.3833, lng: -35.8333 },
  'Satuba': { lat: -9.5667, lng: -35.8167 },
  'Santa Luzia do Norte': { lat: -9.6000, lng: -35.8333 },
  'Coqueiro Seco': { lat: -9.6333, lng: -35.8000 },
  'Barra de São Miguel': { lat: -9.8333, lng: -35.9000 },
  'Barra de Sao Miguel': { lat: -9.8333, lng: -35.9000 },
  'Roteiro': { lat: -9.8500, lng: -35.9833 },
  'Jequiá da Praia': { lat: -10.0167, lng: -36.0167 },
  'Jequia da Praia': { lat: -10.0167, lng: -36.0167 },
  'São Miguel dos Milagres': { lat: -9.2667, lng: -35.3833 },
  'Sao Miguel dos Milagres': { lat: -9.2667, lng: -35.3833 },
  'Porto de Pedras': { lat: -9.1667, lng: -35.3000 },
  'Japaratinga': { lat: -9.0833, lng: -35.2667 },
  'Maragogi': { lat: -9.0122, lng: -35.2225 },
  'Passo de Camaragibe': { lat: -9.2333, lng: -35.4833 },
  'Barra de Santo Antônio': { lat: -9.4000, lng: -35.5000 },
  'Barra de Santo Antonio': { lat: -9.4000, lng: -35.5000 },
  'Paripueira': { lat: -9.4667, lng: -35.5500 },
  'Branquinha': { lat: -9.2333, lng: -36.0167 },
  'Campestre': { lat: -8.8500, lng: -35.5667 },
  'Jacuípe': { lat: -8.8333, lng: -35.4500 },
  'Jacuipe': { lat: -8.8333, lng: -35.4500 },
  'Jundiá': { lat: -8.9333, lng: -35.5667 },
  'Jundia': { lat: -8.9333, lng: -35.5667 },
  'São Luís do Quitunde': { lat: -9.3167, lng: -35.5667 },
  'Sao Luis do Quitunde': { lat: -9.3167, lng: -35.5667 },
  'Capela': { lat: -9.4167, lng: -36.0833 },
  'Pindoba': { lat: -9.4667, lng: -36.3000 },
  'Anadia': { lat: -9.6833, lng: -36.3000 },
  'Pão de Açúcar': { lat: -9.7500, lng: -37.4333 },
  'Pao de Acucar': { lat: -9.7500, lng: -37.4333 },
  'Piranhas': { lat: -9.6250, lng: -37.7564 },
  'Olho d\'Água do Casado': { lat: -9.5000, lng: -37.8333 },
  'Água Branca': { lat: -9.2667, lng: -37.9333 },
  'Agua Branca': { lat: -9.2667, lng: -37.9333 },
  'Mata Grande': { lat: -9.1167, lng: -37.7333 },
  'Canapi': { lat: -9.1167, lng: -37.6000 },
  'Inhapi': { lat: -9.2167, lng: -37.7500 },
  'Pariconha': { lat: -9.2500, lng: -37.9833 },
  'Maravilha': { lat: -9.2333, lng: -37.3500 },
  'Poço das Trincheiras': { lat: -9.3000, lng: -37.2833 },
  'Poco das Trincheiras': { lat: -9.3000, lng: -37.2833 },
  'Senador Rui Palmeira': { lat: -9.4667, lng: -37.4667 },
  'Olivença': { lat: -9.5167, lng: -37.2000 },
  'Olivenca': { lat: -9.5167, lng: -37.2000 },
  'Jacaré dos Homens': { lat: -9.6333, lng: -37.2000 },
  'Jacare dos Homens': { lat: -9.6333, lng: -37.2000 },
  'Batalha': { lat: -9.6833, lng: -37.1333 },
  'Belo Monte': { lat: -9.8333, lng: -37.2667 },
  'Palestina': { lat: -9.6833, lng: -37.3500 },
  'Monteirópolis': { lat: -9.6000, lng: -37.2500 },
  'Monteiropolis': { lat: -9.6000, lng: -37.2500 },
  'Ouro Branco': { lat: -9.1667, lng: -37.3500 },
  'Carneiros': { lat: -9.4833, lng: -37.3833 },
  'I.Nova': { lat: -10.1258, lng: -36.6608 },
  'Igreja Nova': { lat: -10.1258, lng: -36.6608 }
};

// Normalizar nome da cidade para busca
function normalizeCityName(name) {
  if (!name) return '';
  return name.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase();
}

// Buscar coordenadas da cidade
function getCityCoordinates(cityName) {
  if (!cityName) return null;

  // Busca direta
  if (CIDADES_ALAGOAS[cityName]) {
    return CIDADES_ALAGOAS[cityName];
  }

  // Busca normalizada
  const normalizedSearch = normalizeCityName(cityName);

  for (const [city, coords] of Object.entries(CIDADES_ALAGOAS)) {
    const normalizedCity = normalizeCityName(city);
    if (normalizedCity === normalizedSearch) {
      return coords;
    }
  }

  // Busca parcial (início do nome)
  for (const [city, coords] of Object.entries(CIDADES_ALAGOAS)) {
    const normalizedCity = normalizeCityName(city);
    if (normalizedCity.startsWith(normalizedSearch) || normalizedSearch.startsWith(normalizedCity)) {
      return coords;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// CARREGAR DADOS DO MAP.XLSX
// ═══════════════════════════════════════════════════════════════
function loadMapData() {
  try {
    const mapPath = path.join(__dirname, '../../data/map.xlsx');

    if (!fs.existsSync(mapPath)) {
      console.log('[MapService] Arquivo map.xlsx não encontrado');
      return { success: false, error: 'Arquivo map.xlsx não encontrado', data: [] };
    }

    const workbook = XLSX.readFile(mapPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    // Agregar dados por cidade
    const cidadeMap = new Map();

    rawData.forEach(row => {
      // Normalizar nome das colunas (pode variar)
      const qtdeItens = row.QtdeItens || row.qtdeitens || row['Qtde Itens'] || row.Quantidade || 0;
      const valorPraticado = row['Valor Praticado'] || row.ValorPraticado || row.valorpraticado || row.Valor || 0;
      const cidade = row.Cidade || row.cidade || row.CIDADE || '';
      const responsavel = row['Responsável Estrutura'] || row.ResponsavelEstrutura || row.Responsavel || row.Supervisor || row.Supervisora || '';

      if (!cidade) return;

      const cidadeKey = cidade.trim();

      if (!cidadeMap.has(cidadeKey)) {
        cidadeMap.set(cidadeKey, {
          cidade: cidadeKey,
          totalItens: 0,
          totalValor: 0,
          qtdPedidos: 0,
          responsaveis: new Set(),
          coordinates: getCityCoordinates(cidadeKey)
        });
      }

      const entry = cidadeMap.get(cidadeKey);
      entry.totalItens += Number(qtdeItens) || 0;
      entry.totalValor += Number(valorPraticado) || 0;
      entry.qtdPedidos += 1;
      if (responsavel) {
        entry.responsaveis.add(responsavel.trim());
      }
    });

    // Converter para array e calcular intensidade
    const cities = Array.from(cidadeMap.values()).map(entry => ({
      ...entry,
      responsaveis: Array.from(entry.responsaveis),
      ticketMedio: entry.qtdPedidos > 0 ? entry.totalValor / entry.qtdPedidos : 0
    }));

    // Calcular max para normalização
    const maxValor = Math.max(...cities.map(c => c.totalValor), 1);
    const maxItens = Math.max(...cities.map(c => c.totalItens), 1);

    // Adicionar intensidade normalizada (0-1) para o heatmap
    cities.forEach(city => {
      city.intensidade = city.totalValor / maxValor;
      city.intensidadeItens = city.totalItens / maxItens;
    });

    // Filtrar apenas cidades com coordenadas
    const citiesWithCoords = cities.filter(c => c.coordinates);
    const citiesWithoutCoords = cities.filter(c => !c.coordinates).map(c => c.cidade);

    if (citiesWithoutCoords.length > 0) {
      console.log('[MapService] Cidades sem coordenadas:', citiesWithoutCoords);
    }

    console.log(`[MapService] ${citiesWithCoords.length} cidades carregadas com coordenadas`);

    // Estatísticas gerais
    const stats = {
      totalCidades: citiesWithCoords.length,
      totalValor: cities.reduce((sum, c) => sum + c.totalValor, 0),
      totalItens: cities.reduce((sum, c) => sum + c.totalItens, 0),
      totalPedidos: cities.reduce((sum, c) => sum + c.qtdPedidos, 0),
      responsaveis: [...new Set(cities.flatMap(c => c.responsaveis))]
    };

    return {
      success: true,
      data: citiesWithCoords,
      stats,
      missingCoords: citiesWithoutCoords
    };

  } catch (error) {
    console.error('[MapService] Erro ao carregar map.xlsx:', error);
    return { success: false, error: error.message, data: [] };
  }
}

// Obter dados agregados por responsável
function getDataByResponsavel() {
  const result = loadMapData();
  if (!result.success) return result;

  const responsavelMap = new Map();

  result.data.forEach(city => {
    city.responsaveis.forEach(resp => {
      if (!responsavelMap.has(resp)) {
        responsavelMap.set(resp, {
          nome: resp,
          cidades: [],
          totalValor: 0,
          totalItens: 0,
          totalPedidos: 0
        });
      }

      const entry = responsavelMap.get(resp);
      entry.cidades.push(city.cidade);
      entry.totalValor += city.totalValor;
      entry.totalItens += city.totalItens;
      entry.totalPedidos += city.qtdPedidos;
    });
  });

  return {
    success: true,
    data: Array.from(responsavelMap.values()).sort((a, b) => b.totalValor - a.totalValor)
  };
}

module.exports = {
  loadMapData,
  getDataByResponsavel,
  getCityCoordinates,
  CIDADES_ALAGOAS
};
