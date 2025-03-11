import React, { useEffect, useState } from 'react';
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
      // Para compatibilidade com registros antigos que têm repaired_part (string)
      if (!service.repaired_parts && service.repaired_part) {
        return {
          ...service,
          repaired_parts: [service.repaired_part]
        };
      }
      // Garantir que repaired_parts seja sempre um array
      if (!Array.isArray(service.repaired_parts)) {
        return {
          ...service,
          repaired_parts: []
        };
      }
      return service;
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
  const formatRepairedParts = (parts: string[]) => {
    if (!parts || parts.length === 0) return '-';
    
    // Capitalize primeira letra de cada peça
    const formattedParts = parts.map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    );
    
    return formattedParts.join(', ');
  };

  // Função para gerar a nota fiscal em PDF
  const handleGenerateInvoice = async (service: Service) => {
    try {
      toast.loading('Gerando nota fiscal...');
      
      // Chamar a função aprimorada que tenta múltiplos métodos
      const success = await generateAndDownloadPDF(service);
      
      if (success) {
        toast.dismiss();
        toast.success('Nota fiscal gerada com sucesso!');
      } else {
        toast.dismiss();
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
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Serviços</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsDashboardOpen(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 shadow-sm"
                title="Ver dashboard financeiro"
              >
                <PieChart className="w-4 h-4 mr-2" />
                Dashboard Financeiro
              </button>
              <button
                onClick={() => setIsFormOpen(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Serviço
              </button>
            </div>
          </div>

          {isFormOpen ? (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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

              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
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
                          {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum serviço cadastrado'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dashboard Financeiro */}
      {isDashboardOpen && (
        <FinanceDashboard onClose={() => setIsDashboardOpen(false)} />
      )}
    </div>
  );
}

export default App;