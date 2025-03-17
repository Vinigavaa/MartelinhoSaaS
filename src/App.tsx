import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Pencil, Trash2, Plus, Search, PieChart, FileText, LogOut, User } from 'lucide-react';
import { ServiceForm } from './components/ServiceForm';
import { FinanceDashboard } from './components/FinanceDashboard';
import { Service } from './types';
import { supabase } from './lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { generateAndDownloadPDF } from './lib/generateInvoicePDF';
import { AuthPage } from './pages/AuthPage';
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
      setFilteredServices(processedData || []);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      toast.error('Erro ao carregar os serviços');
    }
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

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Erro ao fazer logout');
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

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-900">MartelinhoSaaS</h1>
          
          <div className="flex items-center space-x-6">
            {userProfile && (
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-full p-2 mr-3">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{userProfile.full_name}</p>
                  <p className="text-xs text-gray-500">{userProfile.company_name}</p>
                </div>
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toolbar */}
        <div className="bg-white shadow rounded-lg mb-6 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1">
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2"
                  placeholder="Buscar cliente ou placa..."
                  value={searchTerm}
                  onChange={(e) => filterServices(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsDashboardOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <PieChart className="h-4 w-4 mr-2" />
                Dashboard
              </button>
              
              <button
                onClick={() => { setIsFormOpen(true); setEditingService(undefined); }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Serviço
              </button>
            </div>
          </div>
        </div>
        
        {/* Status message */}
        {filteredServices.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
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
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Veículo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Peças Reparadas
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredServices.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{service.client_name}</div>
                        <div className="text-xs text-gray-500">Código: {service.auth_code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatLocalDate(service.service_date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{service.car_model}</div>
                        <div className="text-xs text-gray-500">{service.car_plate}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{formatRepairedParts(service.repaired_parts)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.service_value)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleGenerateInvoice(service)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-100 p-2 rounded-md hover:bg-blue-200 transition-colors"
                          title="Gerar Nota Fiscal"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleEdit(service)}
                          className="text-green-600 hover:text-green-900 bg-green-100 p-2 rounded-md hover:bg-green-200 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDelete(service.id)}
                          className="text-red-600 hover:text-red-900 bg-red-100 p-2 rounded-md hover:bg-red-200 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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