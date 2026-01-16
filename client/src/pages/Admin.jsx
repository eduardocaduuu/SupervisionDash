import React, { useState, useEffect } from 'react';
import { FileText, Filter, User } from 'lucide-react';
import * as SalesFileParser from '../utils/SalesFileParser';

const Admin = () => {
  const [data, setData] = useState([]);
  const [basesUnicas, setBasesUnicas] = useState([]);
  const [segmentosUnicos, setSegmentosUnicos] = useState([]);
  
  // Estados dos Filtros
  const [filtroBase, setFiltroBase] = useState('Todos');
  const [filtroSegmento, setFiltroSegmento] = useState('Todos');

  useEffect(() => {
    const loadData = async () => {
      try {
        const parsedData = await SalesFileParser.parseSalesFile();
        setData(parsedData);

        // Extrair Bases Únicas (Código ou Nome do Supervisor)
        const bases = ['Todos', ...new Set(parsedData.map(item => item.supervisor || 'N/A'))].sort();
        setBasesUnicas(bases);

        // Extrair Segmentos Únicos
        // Ajuste 'nivel' para o nome exato da sua coluna de segmento (ex: classificacao, categoria)
        const segmentos = ['Todos', ...new Set(parsedData.map(item => item.nivel || 'N/A'))].sort();
        setSegmentosUnicos(segmentos);

      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };

    loadData();
  }, []);

  // Lógica de Filtragem Dupla
  const dadosFiltrados = data.filter(item => {
    const passaBase = filtroBase === 'Todos' || item.supervisor === filtroBase;
    const passaSegmento = filtroSegmento === 'Todos' || item.nivel === filtroSegmento; 
    return passaBase && passaSegmento;
  });

  return (
    <div className="p-6 text-slate-100 min-h-screen bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="text-emerald-400" />
          Gestão de Bases
        </h1>
        
        {/* ÁREA DE FILTROS */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Filtro de Base */}
          <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
            <Filter size={18} className="text-slate-400" />
            <select 
              value={filtroBase}
              onChange={(e) => setFiltroBase(e.target.value)}
              className="bg-transparent outline-none text-sm w-full md:w-48 cursor-pointer"
            >
              {basesUnicas.map((base, idx) => (
                <option key={idx} value={base} className="bg-slate-800 text-white">
                  {base === 'Todos' ? 'Todas as Bases' : base}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Segmento */}
          <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
            <FileText size={18} className="text-slate-400" />
            <select 
              value={filtroSegmento}
              onChange={(e) => setFiltroSegmento(e.target.value)}
              className="bg-transparent outline-none text-sm w-full md:w-48 cursor-pointer"
            >
              {segmentosUnicos.map((seg, idx) => (
                <option key={idx} value={seg} className="bg-slate-800 text-white">
                  {seg === 'Todos' ? 'Todos os Segmentos' : seg}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABELA DE RESULTADOS */}
      <div className="overflow-x-auto bg-slate-800 rounded-lg shadow-xl border border-slate-700">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-sm uppercase tracking-wider">
              <th className="p-4 border-b border-slate-700">Cód. Base / Supervisor</th>
              <th className="p-4 border-b border-slate-700">Revendedor</th>
              <th className="p-4 border-b border-slate-700">Segmento</th>
              <th className="p-4 border-b border-slate-700 text-right">Venda Atual</th>
              <th className="p-4 border-b border-slate-700 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {dadosFiltrados.length > 0 ? (
              dadosFiltrados.map((item, index) => (
                <tr key={index} className="hover:bg-slate-700/50 transition-colors">
                  <td className="p-4 font-mono text-emerald-400 font-medium">
                    {/* Exibe Supervisor ou Código da Base */}
                    {item.supervisor || item.cod_setor || '-'}
                  </td>
                  <td className="p-4 font-medium text-white">
                    {item.nome || item.revendedor}
                    <div className="text-xs text-slate-500">{item.codigo}</div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600">
                      {item.nivel || item.segmento || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-slate-200">
                    {item.venda_atual ? `R$ ${item.venda_atual}` : '-'}
                  </td>
                  <td className="p-4 text-center">
                     {/* Badge Simples de Status */}
                     <span className={`px-2 py-1 rounded text-xs font-bold ${
                        (item.status || '').includes('CRITIC') ? 'bg-red-500/20 text-red-400' :
                        (item.status || '').includes('PRONTO') ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-blue-500/20 text-blue-400'
                     }`}>
                       {item.status || 'OK'}
                     </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">
                  Nenhum revendedor encontrado com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-right text-slate-500 text-sm">
        Total visualizado: {dadosFiltrados.length} revendedores
      </div>
    </div>
  );
};

export default Admin;