import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { Service } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Pencil, Trash2, FileText, ArrowLeft, Search, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateAndDownloadPDF } from '../lib/generateInvoicePDF';

const MESES = [
  { value: '', label: 'Todos os meses' },
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const ITENS_POR_PAGINA = 10;

const formatLocalDate = (dateString: string) => {
  const date = new Date(`${dateString.split('T')[0]}T12:00:00Z`);
  return format(date, 'dd/MM/yyyy', { locale: pt });
};

export function AdvancedSearchPage({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para os filtros
  const [mesFilter, setMesFilter] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [modeloFilter, setModeloFilter] = useState('');
  const [placaFilter, setPlacaFilter] = useState('');
  
  // Estados para paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [servicosPaginados, setServicosPaginados] = useState<Service[]>([]);
  
  // Estado para ordenação
  const [ordenacao, setOrdenacao] = useState<{campo: string, direcao: 'asc' | 'desc'}>({
    campo: 'service_date',
    direcao: 'desc'
  });

  // Debounce para evitar múltiplas requisições durante digitação
  const [debouncedClienteFilter, setDebouncedClienteFilter] = useState('');
  const [debouncedModeloFilter, setDebouncedModeloFilter] = useState('');
  const [debouncedPlacaFilter, setDebouncedPlacaFilter] = useState('');

  // Configurar debounce para os filtros de texto
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedClienteFilter(clienteFilter);
    }, 500);
    return () => clearTimeout(timer);
  }, [clienteFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedModeloFilter(modeloFilter);
    }, 500);
    return () => clearTimeout(timer);
  }, [modeloFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPlacaFilter(placaFilter);
    }, 500);
    return () => clearTimeout(timer);
  }, [placaFilter]);

  // Função para buscar serviços com filtros aplicados diretamente no servidor
  const fetchFilteredServices = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Iniciar a query base
      let query = supabase
        .from('services')
        .select('*', { count: 'exact' as const })
        .eq('tenant_id', user.id);
      
      // Aplicar filtro de mês no servidor se selecionado
      if (mesFilter) {
        const anoAtual = new Date().getFullYear();
        const dataInicio = `${anoAtual}-${mesFilter}-01`;
        const dataFimMes = mesFilter === '12' ? `${anoAtual+1}-01-01` : `${anoAtual}-${String(Number(mesFilter) + 1).padStart(2, '0')}-01`;
        
        query = query
          .gte('service_date', dataInicio)
          .lt('service_date', dataFimMes);
      }
      
      // Aplicar filtros de texto
      if (debouncedClienteFilter) {
        query = query.ilike('client_name', `%${debouncedClienteFilter}%`);
      }
      
      if (debouncedModeloFilter) {
        query = query.ilike('car_model', `%${debouncedModeloFilter}%`);
      }
      
      if (debouncedPlacaFilter) {
        query = query.ilike('car_plate', `%${debouncedPlacaFilter}%`);
      }
      
      // Aplicar ordenação
      query = query.order(ordenacao.campo, { ascending: ordenacao.direcao === 'asc' });
      
      // Executar a query
      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar serviços:', error);
        toast.error('Erro ao carregar os serviços');
        return;
      }
      
      // Processar os dados
      const processedData = data?.map(service => {
        let repairedParts: string[] = [];

        if (service.repaired_part && typeof service.repaired_part === 'string') {
          repairedParts = [service.repaired_part];
        }
        
        if (service.repaired_parts && Array.isArray(service.repaired_parts)) {
          repairedParts = service.repaired_parts.filter((part: any) => part && typeof part === 'string');
        }

        const authCode = service.auth_code || `AC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        let standardizedDate = service.service_date;
        
        if (standardizedDate && !standardizedDate.includes('T12:00:00')) {
          standardizedDate = `${standardizedDate.split('T')[0]}T12:00:00`;
        }

        return {
          ...service,
          repaired_parts: repairedParts,
          auth_code: authCode,
          service_date: standardizedDate
        };
      });
      
      setFilteredServices(processedData || []);
      setPaginaAtual(1);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      toast.error('Erro ao carregar os serviços');
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros sempre que os valores debounced mudarem ou ordenação mudar
  useEffect(() => {
    if (user) {
      fetchFilteredServices();
    }
  }, [debouncedClienteFilter, debouncedModeloFilter, debouncedPlacaFilter, mesFilter, ordenacao]);

  // Adicionar useEffect para tratar dependência do user separadamente
  useEffect(() => {
    if (user) {
      fetchFilteredServices();
    }
  }, [user]);

  // Aplicar paginação aos serviços filtrados
  useEffect(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA;
    setServicosPaginados(filteredServices.slice(inicio, fim));
  }, [filteredServices, paginaAtual]);

  // Limpar todos os filtros
  const clearFilters = () => {
    setMesFilter('');
    setClienteFilter('');
    setModeloFilter('');
    setPlacaFilter('');
    setPaginaAtual(1);
  };

  // Mudar ordenação
  const handleOrdenacaoClick = (campo: string) => {
    if (ordenacao.campo === campo) {
      // Inverter direção se já está ordenando por este campo
      setOrdenacao({
        campo,
        direcao: ordenacao.direcao === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // Novo campo de ordenação, começar com desc
      setOrdenacao({
        campo,
        direcao: 'desc'
      });
    }
  };

  // Formatar as peças reparadas para exibição
  const formatRepairedParts = (parts: any): string => {
    if (!parts) return '-';
    
    let partsArray: string[] = [];
    
    if (Array.isArray(parts)) {
      partsArray = parts;
    } else if (typeof parts === 'string') {
      partsArray = [parts];
    } else if (typeof parts === 'object') {
      try {
        const values = Object.values(parts).filter(Boolean);
        partsArray = values.map(val => String(val));
      } catch (e) {
        return '-';
      }
    } else {
      return '-';
    }
    
    const formattedParts = partsArray
      .filter(part => part !== null && part !== undefined)
      .map(part => {
        const partStr = String(part).trim();
        if (!partStr) return '';
        return partStr.charAt(0).toUpperCase() + partStr.slice(1).toLowerCase();
      })
      .filter(part => part !== '');
    
    return formattedParts.length > 0 ? formattedParts.join(', ') : '-';
  };

  // Função para gerar a nota fiscal em PDF
  const handleGenerateInvoice = async (service: Service) => {
    try {
      toast.loading('Gerando nota fiscal...');
      
      const serviceToUse = {
        ...service,
        repaired_parts: Array.isArray(service.repaired_parts) 
          ? service.repaired_parts.filter(part => part && typeof part === 'string')
          : [],
        auth_code: service.auth_code || `AC${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      };
      
      const success = await generateAndDownloadPDF(serviceToUse);
      
      toast.dismiss();
      if (success) {
        toast.success('Nota fiscal gerada com sucesso!');
      } else {
        toast.error('Erro ao gerar a nota fiscal. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao gerar a nota fiscal:', error);
      toast.dismiss();
      toast.error('Erro ao gerar a nota fiscal. Tente novamente.');
    }
  };

  // Função para editar um serviço
  const handleEdit = (service: Service) => {
    // Redirecionar para a página principal com o serviço para edição
    onBack();
    // Precisamos passar o serviço para edição através de algum mecanismo
    // Por exemplo, usar localStorage ou um contexto global
    localStorage.setItem('editingService', JSON.stringify(service));
  };

  // Função para excluir um serviço
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)
        .eq('tenant_id', user?.id);

      if (error) {
        console.error('Erro ao excluir serviço:', error);
        toast.error('Erro ao excluir o serviço');
        return;
      }

      toast.success('Serviço excluído com sucesso!');
      fetchFilteredServices();
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      toast.error('Erro ao excluir o serviço');
    }
  };

  // Exportar resultados para CSV
  const exportarParaCSV = () => {
    try {
      // Criar cabeçalhos
      const headers = ['Cliente', 'Data', 'Modelo', 'Placa', 'Peças Reparadas', 'Valor', 'Código'];
      
      // Criar linhas de dados - corrigir escape de texto com vírgulas
      const rows = filteredServices.map(service => [
        `"${service.client_name.replace(/"/g, '""')}"`,
        `"${formatLocalDate(service.service_date)}"`, 
        `"${service.car_model.replace(/"/g, '""')}"`,
        `"${service.car_plate.replace(/"/g, '""')}"`,
        `"${formatRepairedParts(service.repaired_parts).replace(/"/g, '""')}"`,
        service.service_value.toString(),
        `"${service.auth_code}"`
      ]);
      
      // Combinar tudo em um CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Criar blob e link de download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `servicos_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Dados exportados com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast.error('Erro ao exportar dados');
    }
  };

  // Cálculo de páginas
  const totalPaginas = Math.ceil(filteredServices.length / ITENS_POR_PAGINA);

  // Renderizar cabeçalho de ordenação
  const renderCabecalhoOrdenacao = (campo: string, texto: string) => {
    const ehCampoAtivo = ordenacao.campo === campo;
    const direcaoSeta = ordenacao.direcao === 'asc' ? '↑' : '↓';
    
    return (
      <th
        key={campo}
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
        onClick={() => handleOrdenacaoClick(campo)}
      >
        <div className="flex items-center space-x-1">
          <span>{texto}</span>
          {ehCampoAtivo && <span className="text-blue-600">{direcaoSeta}</span>}
        </div>
      </th>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header Simplificado */}
      <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-700 border-b border-blue-700 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors text-white"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <h1 className="text-2xl font-semibold text-white">Busca Avançada</h1>
          </div>
          
          {filteredServices.length > 0 && (
            <button
              onClick={exportarParaCSV}
              className="flex items-center px-3 py-2 text-sm font-medium text-emerald-700 bg-white rounded-lg hover:bg-emerald-50 shadow-sm transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Card de Filtros */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Search className="h-5 w-5 mr-2 text-blue-600" />
              Filtros
            </h2>
            <button
              onClick={clearFilters}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar filtros
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro de Mês */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mês</label>
              <select
                value={mesFilter}
                onChange={(e) => setMesFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
              >
                {MESES.map((mes) => (
                  <option key={mes.value} value={mes.value}>
                    {mes.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
              <div className="relative">
                <input
                  type="text"
                  value={clienteFilter}
                  onChange={(e) => setClienteFilter(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full px-3 py-2 pl-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              </div>
            </div>

            {/* Filtro de Modelo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
              <div className="relative">
                <input
                  type="text"
                  value={modeloFilter}
                  onChange={(e) => setModeloFilter(e.target.value)}
                  placeholder="Buscar modelo..."
                  className="w-full px-3 py-2 pl-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              </div>
            </div>
            
            {/* Filtro de Placa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Placa</label>
              <div className="relative">
                <input
                  type="text"
                  value={placaFilter}
                  onChange={(e) => setPlacaFilter(e.target.value)}
                  placeholder="Buscar placa..."
                  className="w-full px-3 py-2 pl-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando serviços...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-md">
            <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
              <Search className="w-full h-full" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum serviço encontrado</h3>
            <p className="text-gray-600">Tente ajustar os filtros de busca</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-md">
            {/* Cabeçalho da Tabela */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Exibindo {servicosPaginados.length} de {filteredServices.length} 
                  {filteredServices.length === 1 ? ' resultado' : ' resultados'}
                  {(mesFilter || clienteFilter || modeloFilter || placaFilter) && " filtrados"}
                </p>
              </div>
            </div>

            {/* Tabela Modernizada */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    {renderCabecalhoOrdenacao('client_name', 'Cliente')}
                    {renderCabecalhoOrdenacao('service_date', 'Data')}
                    {renderCabecalhoOrdenacao('car_model', 'Veículo')}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Peças Reparadas
                    </th>
                    {renderCabecalhoOrdenacao('service_value', 'Valor')}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {servicosPaginados.map((service) => (
                    <tr key={service.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{service.client_name}</div>
                        <div className="text-xs text-gray-500 mt-1">{service.auth_code}</div>
                      </td>
                      <td className="px-6 py-4">
                        {formatLocalDate(service.service_date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{service.car_model}</div>
                        <div className="text-xs text-gray-500">{service.car_plate}</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-sm text-gray-700">
                          {formatRepairedParts(service.repaired_parts)}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(service.service_value)}
                      </td>
                      <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleGenerateInvoice(service)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center justify-center"
                          title="Gerar Nota Fiscal"
                        >
                          <FileText className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(service)}
                          className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 hover:text-emerald-800 transition-colors inline-flex items-center justify-center"
                          title="Editar"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(service.id)}
                          className="p-2 hover:bg-rose-50 rounded-lg text-rose-600 hover:text-rose-800 transition-colors inline-flex items-center justify-center"
                          title="Excluir"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Página {paginaAtual} de {totalPaginas}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
                    disabled={paginaAtual === 1}
                    className={`p-2 rounded-lg ${
                      paginaAtual === 1 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {/* Mostrar números de página */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                      // Lógica para mostrar as páginas corretas quando há muitas páginas
                      let pageToShow: number; // Tipagem explícita
                      if (totalPaginas <= 5) {
                        pageToShow = i + 1;
                      } else if (paginaAtual <= 3) {
                        pageToShow = i + 1;
                      } else if (paginaAtual >= totalPaginas - 2) {
                        pageToShow = totalPaginas - 4 + i;
                      } else {
                        pageToShow = paginaAtual - 2 + i;
                      }
                      
                      // Verificação explícita para evitar renderização indesejada
                      if (pageToShow <= 0 || pageToShow > totalPaginas) {
                        return null;
                      }
                      
                      return (
                        <button
                          key={pageToShow}
                          onClick={() => setPaginaAtual(pageToShow)}
                          className={`h-8 w-8 flex items-center justify-center rounded-lg ${
                            paginaAtual === pageToShow
                              ? 'bg-indigo-600 text-white'
                              : 'text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {pageToShow}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
                    disabled={paginaAtual === totalPaginas}
                    className={`p-2 rounded-lg ${
                      paginaAtual === totalPaginas 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}