import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Pencil, Trash2, Plus, Search, PieChart, FileText } from 'lucide-react';
import { ServiceForm } from './components/ServiceForm';
import { FinanceDashboard } from './components/FinanceDashboard';
import { Service } from './types';
import { supabase } from './lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { generateAndDownloadPDF } from './lib/generateInvoicePDF';

function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

  const fetchServices = async () => {
    console.log('Tentando buscar serviços...');
    
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('service_date', { ascending: false });

    if (error) {
      console.error('Erro detalhado ao buscar serviços:', error);
      toast.error('Erro ao carregar os serviços');
      return;
    }

    console.log('Serviços carregados com sucesso:', data);
    
    // Garantir que todos os serviços tenham o campo repaired_parts como array
    const processedData = data?.map(service => {
      let repairedParts: string[] = [];

      // Para compatibilidade com registros antigos que têm repaired_part (string)
      if (service.repaired_part && typeof service.repaired_part === 'string') {
        repairedParts = [service.repaired_part];
      }
      
      // Se repaired_parts existir e for um array, use-o
      if (service.repaired_parts && Array.isArray(service.repaired_parts)) {
        repairedParts = service.repaired_parts.filter((part: any) => part && typeof part === 'string');
      }

      // Garantir que auth_code seja uma string válida
      const authCode = service.auth_code || `AC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      return {
        ...service,
        repaired_parts: repairedParts,
        auth_code: authCode
      };
    });
    
    setServices(processedData || []);
    setFilteredServices(processedData || []);
  };

  // Função para filtrar serviços baseado no termo de busca
  const filterServices = (term: string) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      // Se o termo de busca estiver vazio, mostrar todos os serviços
      setFilteredServices(services);
      return;
    }
    
    // Converter para minúsculas para comparação case-insensitive
    const termLower = term.toLowerCase();
    
    // Filtrar os serviços que contêm o termo no nome do cliente ou na placa
    const filtered = services.filter(service => 
      service.client_name.toLowerCase().includes(termLower) || 
      service.car_plate.toLowerCase().includes(termLower)
    );
    
    setFilteredServices(filtered);
  };

  useEffect(() => {
    // Verificar se o Supabase está configurado corretamente
    console.log('URL do Supabase:', import.meta.env.VITE_SUPABASE_URL);
    console.log('Chave anônima configurada:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
    
    fetchServices();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro detalhado ao excluir serviço:', error);
      toast.error('Erro ao excluir o serviço');
      return;
    }

    toast.success('Serviço excluído com sucesso!');
    fetchServices();
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingService(undefined);
    fetchServices();
  };

  // Formatar as peças reparadas para exibição
  const formatRepairedParts = (parts: any): string => {
    // Verificação mais rigorosa para diferentes tipos de entrada
    if (!parts) return '-';
    
    // Se não for um array, tenta converter para array se possível
    let partsArray: string[] = [];
    
    if (Array.isArray(parts)) {
      partsArray = parts;
    } else if (typeof parts === 'string') {
      partsArray = [parts];
    } else if (typeof parts === 'object') {
      try {
        // Tenta extrair valores se for um objeto
        const values = Object.values(parts).filter(Boolean);
        partsArray = values.map(val => String(val));
      } catch (e) {
        return '-';
      }
    } else {
      return '-';
    }
    
    // Filtra e formata cada parte
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
      
      // Garantir que repaired_parts seja um array válido
      const serviceToUse = {
        ...service,
        repaired_parts: Array.isArray(service.repaired_parts) 
          ? service.repaired_parts.filter(part => part && typeof part === 'string')
          : [],
        auth_code: service.auth_code || `AC${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      };
      
      // Chamar a função aprimorada que tenta múltiplos métodos
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

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        <div className="sm:px-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gerenciamento de Serviços</h1>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIsDashboardOpen(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 shadow-sm w-full sm:w-auto"
                title="Ver dashboard financeiro"
              >
                <PieChart className="w-4 h-4 mr-2" />
                Dashboard Financeiro
              </button>
              <button
                onClick={() => setIsFormOpen(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Serviço
              </button>
            </div>
          </div>

          {isFormOpen ? (
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <ServiceForm
                service={editingService}
                onSuccess={handleFormSuccess}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingService(undefined);
                }}
              />
            </div>
          ) : (
            <>
              {/* Campo de busca */}
              <div className="mb-6 relative">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por cliente ou placa..."
                    value={searchTerm}
                    onChange={(e) => filterServices(e.target.value)}
                    className="search-input w-full"
                  />
                </div>
                {searchTerm && (
                  <div className="mt-2 text-sm text-gray-600">
                    {filteredServices.length} resultado(s) encontrado(s)
                  </div>
                )}
              </div>

              {/* Tabela para desktop */}
              <div className="hidden sm:block bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Carro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Peças Reparadas
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredServices.length > 0 ? (
                      filteredServices.map((service) => (
                        <tr key={service.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{service.client_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {format(new Date(service.service_date), 'dd/MM/yyyy')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {service.car_model} - {service.car_plate}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(service.service_value)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{formatRepairedParts(service.repaired_parts)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleGenerateInvoice(service)}
                              className="text-green-600 hover:text-green-900 mr-3"
                              title="Gerar Nota Fiscal"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(service)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(service.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                          {searchTerm ? 'Nenhum serviço encontrado para essa busca.' : 'Nenhum serviço cadastrado.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Layout de cards para mobile */}
              <div className="sm:hidden space-y-4">
                {filteredServices.length > 0 ? (
                  filteredServices.map((service) => (
                    <div key={service.id} className="bg-white shadow rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-lg font-medium text-gray-900">{service.client_name}</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(service.service_value)}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        {format(new Date(service.service_date), 'dd/MM/yyyy')}
                      </div>
                      
                      <div className="text-sm text-gray-800 mb-2">
                        {service.car_model} - {service.car_plate}
                      </div>
                      
                      <div className="text-sm text-gray-800 mb-3">
                        <span className="font-medium">Peças:</span> {formatRepairedParts(service.repaired_parts)}
                      </div>
                      
                      <div className="flex justify-end space-x-4 border-t pt-3">
                        <button
                          onClick={() => handleGenerateInvoice(service)}
                          className="text-green-600 hover:text-green-900"
                          title="Gerar Nota Fiscal"
                        >
                          <FileText className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(service)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(service.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
                    {searchTerm ? 'Nenhum serviço encontrado para essa busca.' : 'Nenhum serviço cadastrado.'}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {isDashboardOpen && <FinanceDashboard onClose={() => setIsDashboardOpen(false)} />}
    </div>
  );
}

export default App;