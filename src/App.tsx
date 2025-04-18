import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Pencil, Trash2, Plus, Search, PieChart, FileText, LogOut, User, Filter, AlertCircle } from 'lucide-react';
import { ServiceForm } from './components/ServiceForm';
import { FinanceDashboard } from './components/FinanceDashboard';
import { Service } from './types';
import { supabase } from './lib/supabase';
import toast from 'react-hot-toast';
import { generateAndDownloadPDF } from './lib/generateInvoicePDF';
import { AuthPage } from './pages/AuthPage';
import { AdvancedSearchPage } from './pages/AdvancedSearchPage';
import { useAuth } from './contexts/AuthContext';

const formatLocalDate = (dateString: string) => {
  // Garantir que a data seja tratada como meio-dia UTC para evitar problemas de fuso horárioooo
  const date = new Date(`${dateString.split('T')[0]}T12:00:00Z`);
  return format(date, 'dd/MM/yyyy', { locale: pt });
};

function App() {
  const { user, loading, signOut } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);

  // Buscar o perfil do usuário
  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        return;
      }
      
      setUserProfile(data);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    }
  };

  const fetchServices = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', user.id)
        .order('service_date', { ascending: false });

      if (error) {
        console.error('Erro detalhado ao buscar serviços:', error);
        toast.error('Erro ao carregar os serviços');
        return;
      }
      
      // Garantir que todos os serviços tenham o campo repaired_parts como array
      // e que as datas estejam padronizadas para evitar problemas de fuso horário
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

        // Padronizar o formato da data para evitar problemas de fuso horário
        let standardizedDate = service.service_date;
        
        // Se a data não tiver o horário fixado em 12:00, ajuste para o formato padronizado
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
      
      setServices(processedData || []);
      
      // Mostrar apenas os 10 serviços mais recentes quando não há busca
      const recentServices = processedData ? [...processedData].slice(0, 10) : [];
      setFilteredServices(recentServices);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      toast.error('Erro ao carregar os serviços');
    }
  };

  // Função para filtrar serviços baseado no termo de busca
  const filterServices = (term: string) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      // Se o termo de busca estiver vazio, mostrar apenas os 10 serviços mais recentes
      const recentServices = services.slice(0, 10);
      setFilteredServices(recentServices);
      return;
    }
    
    // Converter para minúsculas para comparação case-insensitive
    const termLower = term.toLowerCase();
    
    // Filtrar todos os serviços que contêm o termo no nome do cliente ou na placa
    const filtered = services.filter(service => 
      service.client_name.toLowerCase().includes(termLower) || 
      service.car_plate.toLowerCase().includes(termLower)
    );
    
    setFilteredServices(filtered);
  };

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchServices();
    }
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)
        .eq('tenant_id', user?.id);

      if (error) {
        console.error('Erro detalhado ao excluir serviço:', error);
        toast.error('Erro ao excluir o serviço');
        return;
      }

      toast.success('Serviço excluído com sucesso!');
      fetchServices();
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      toast.error('Erro ao excluir o serviço');
    }
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

  const handleAdvancedSearchSuccess = () => {
    console.log('Fechando busca avançada');
    setIsAdvancedSearchOpen(false);
    
    // Verificar se há um serviço para edição no localStorage
    const editingServiceJson = localStorage.getItem('editingService');
    if (editingServiceJson) {
      try {
        const service = JSON.parse(editingServiceJson);
        setEditingService(service);
        setIsFormOpen(true);
        localStorage.removeItem('editingService');
      } catch (error) {
        console.error('Erro ao processar serviço para edição:', error);
      }
    }
    
    // Recarregar os serviços para atualizar a lista
    setTimeout(() => {
      fetchServices();
    }, 100);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Não exibir toast de erro para não confundir o usuário
      // O AuthContext já trata a limpeza do estado mesmo em caso de erro
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Quando a busca avançada está ativa, renderizar apenas esse componente
  if (isAdvancedSearchOpen) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AdvancedSearchPage onBack={handleAdvancedSearchSuccess} />
        
        {/* Modals que podem ser mostrados mesmo durante a busca avançada */}
        {isFormOpen && (
          <ServiceForm
            isOpen={isFormOpen}
            onClose={() => { setIsFormOpen(false); setEditingService(undefined); }}
            onSuccess={handleFormSuccess}
            service={editingService}
            tenant_id={user.id}
          />
        )}
      </div>
    );
  }

  // Interface principal padrão
  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          <h1 className="text-2xl font-bold text-white">AutoFy</h1>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            {userProfile && (
              <div className="flex items-center mb-2 sm:mb-0">
                <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{userProfile.full_name}</p>
                  <p className="text-xs text-blue-100">{userProfile.company_name}</p>
                </div>
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors w-full sm:w-auto"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toolbar */}
        <div className="bg-white shadow-md rounded-lg mb-6 p-4 border border-gray-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="w-full sm:flex-1">
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 text-sm border-gray-300 rounded-md py-2"
                  placeholder="Buscar cliente ou placa..."
                  value={searchTerm}
                  onChange={(e) => filterServices(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
              <button
                onClick={() => {
                  console.log('Abrindo busca avançada');
                  setIsAdvancedSearchOpen(true);
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm"
              >
                <Filter className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Busca Avançada</span>
                <span className="xs:hidden">Filtrar</span>
              </button>
              
              <button
                onClick={() => setIsDashboardOpen(true)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
              >
                <PieChart className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Dashboard</span>
                <span className="xs:hidden">Stats</span>
              </button>
              
              <button
                onClick={() => { setIsFormOpen(true); setEditingService(undefined); }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Novo Serviço</span>
                <span className="xs:hidden">Novo</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Status message */}
        {filteredServices.length === 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-md p-4 mb-6 shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  {searchTerm ? 'Nenhum serviço encontrado para esta busca.' : 'Nenhum serviço cadastrado.'}
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    {searchTerm 
                      ? 'Tente usar termos diferentes ou limpe a busca para ver todos os serviços.' 
                      : 'Clique no botão "Novo Serviço" para começar a cadastrar.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Services table */}
        {filteredServices.length > 0 && (
          <div className="bg-white shadow-md overflow-hidden rounded-lg border border-gray-100">
            {/* Versão para desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Veículo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Peças Reparadas
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Valor
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredServices.map((service) => (
                    <tr key={service.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{service.client_name}</div>
                        <div className="text-xs text-gray-500">Código: {service.auth_code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{formatLocalDate(service.service_date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{service.car_model}</div>
                        <div className="text-xs text-gray-500">{service.car_plate?.toUpperCase()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">{formatRepairedParts(service.repaired_parts)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.service_value)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2 justify-end">
                          <button
                            onClick={() => handleGenerateInvoice(service)}
                            className="text-blue-600 hover:text-blue-900 bg-blue-100 p-2 rounded-md hover:bg-blue-200 transition-colors"
                            title="Gerar Nota Fiscal"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleEdit(service)}
                            className="text-emerald-600 hover:text-emerald-900 bg-emerald-100 p-2 rounded-md hover:bg-emerald-200 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="text-rose-600 hover:text-rose-900 bg-rose-100 p-2 rounded-md hover:bg-rose-200 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Versão para dispositivos móveis - cards em vez de tabela */}
            <div className="md:hidden">
              <ul className="divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <li key={service.id} className="p-4 hover:bg-blue-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{service.client_name}</h3>
                        <p className="text-xs text-gray-500 mt-1">Código: {service.auth_code}</p>
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.service_value)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Data: </span>
                        {formatLocalDate(service.service_date)}
                      </div>
                      <div>
                        <span className="font-medium">Veículo: </span>
                        {service.car_model}
                      </div>
                      <div>
                        <span className="font-medium">Placa: </span>
                        {service.car_plate?.toUpperCase()}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Peças: </span>
                        {formatRepairedParts(service.repaired_parts)}
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => handleGenerateInvoice(service)}
                        className="text-blue-600 hover:text-blue-800 bg-blue-100 p-2 rounded-md hover:bg-blue-200 transition-colors"
                        title="Gerar Nota Fiscal"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleEdit(service)}
                        className="text-emerald-600 hover:text-emerald-800 bg-emerald-100 p-2 rounded-md hover:bg-emerald-200 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="text-rose-600 hover:text-rose-800 bg-rose-100 p-2 rounded-md hover:bg-rose-200 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
      
      {/* Modals */}
      {isFormOpen && (
        <ServiceForm
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingService(undefined); }}
          onSuccess={handleFormSuccess}
          service={editingService}
          tenant_id={user.id}
        />
      )}
      
      {isDashboardOpen && (
        <FinanceDashboard
          isOpen={isDashboardOpen}
          onClose={() => setIsDashboardOpen(false)}
        />
      )}
    </div>
  );
}

export default App;