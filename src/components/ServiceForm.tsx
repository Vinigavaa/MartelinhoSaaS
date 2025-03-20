import React, { useState } from 'react';
import { format } from 'date-fns';
import { Service, REPAIRED_PARTS } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

interface ServiceFormProps {
  service?: Service;
  onSuccess: () => void;
  onClose: () => void;
  isOpen: boolean;
  tenant_id: string;
}

/**
 * Formulário para cadastro e edição de serviços
 */
export function ServiceForm({ service, onSuccess, onClose, isOpen, tenant_id }: ServiceFormProps) {
  // Estado inicial do formulário
  const [formData, setFormData] = useState({
    client_name: service?.client_name || '',
    client_phone: service?.client_phone || '',
    service_date: service?.service_date 
      ? format(new Date(service.service_date), 'yyyy-MM-dd') 
      : format(new Date(), 'yyyy-MM-dd'),
    car_plate: service?.car_plate || '',
    car_model: service?.car_model || '',
    service_value: service?.service_value || '',
    repaired_parts: service?.repaired_parts || [REPAIRED_PARTS[0]]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Função para formatar o telefone no padrão (XX) XXXXX-XXXX
   */
  const formatPhoneNumber = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara conforme a quantidade de números
    if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  /**
   * Handler para o campo de telefone
   */
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, client_phone: formattedPhone });
  };

  /**
   * Função para gerenciar a seleção de múltiplas peças reparadas
   * Adiciona a peça se não estiver selecionada, ou remove se já estiver
   */
  const handleRepairedPartsChange = (part: string) => {
    setFormData((prevData) => {
      const currentParts = [...prevData.repaired_parts];
      
      // Se a peça já está selecionada, remova-a
      if (currentParts.includes(part)) {
        return {
          ...prevData,
          repaired_parts: currentParts.filter(p => p !== part)
        };
      }
      
      // Caso contrário, adicione-a
      return {
        ...prevData,
        repaired_parts: [...currentParts, part]
      };
    });
  };

  /**
   * Salva o serviço no banco de dados (cria novo ou atualiza existente)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Verificar se pelo menos uma peça foi selecionada
    if (formData.repaired_parts.length === 0) {
      toast.error('Selecione pelo menos uma peça reparada');
      setIsSubmitting(false);
      return;
    }

    try {
      // Garantir que a data esteja no formato correto (yyyy-MM-dd)
      const formattedDate = formData.service_date || format(new Date(), 'yyyy-MM-dd');
      
      if (service?.id) {
        // Atualizar serviço existente
        await updateExistingService(service.id, formattedDate);
      } else {
        // Criar novo serviço
        await createNewService(formattedDate);
      }
      
      onSuccess();
    } catch (error) {
      console.error('Erro detalhado ao salvar serviço:', error);
      toast.error('Erro ao salvar o serviço');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Atualiza um serviço existente
   */
  const updateExistingService = async (serviceId: string, formattedDate: string) => {
    const { error } = await supabase
      .from('services')
      .update({
        ...formData,
        service_date: formattedDate,
        tenant_id: tenant_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceId);
    
    if (error) {
      console.error('Erro detalhado ao atualizar:', error);
      throw error;
    }
    
    toast.success('Serviço atualizado com sucesso!');
  };

  /**
   * Cria um novo serviço
   */
  const createNewService = async (formattedDate: string) => {
    const dataToSend = {
      ...formData,
      tenant_id: tenant_id,
      service_date: formattedDate,
      service_value: typeof formData.service_value === 'string' 
        ? parseFloat(formData.service_value) 
        : formData.service_value,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Enviando dados para o servidor:', dataToSend);
    
    const { data, error } = await supabase
      .from('services')
      .insert([dataToSend])
      .select();
    
    if (error) {
      console.error('Erro detalhado ao criar serviço:', error);
      throw error;
    }
    
    console.log('Serviço criado com sucesso:', data);
    toast.success('Serviço cadastrado com sucesso!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-800 bg-opacity-75 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {service ? 'Editar Serviço' : 'Novo Serviço'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors p-2"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[80vh]">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Nome do Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              />
            </div>

            {/* Telefone do Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone do Cliente (opcional)</label>
              <input
                type="text"
                placeholder="(48) 99999-9999"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.client_phone}
                onChange={handlePhoneChange}
                maxLength={15}
              />
            </div>

            {/* Data e Valor do Serviço */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Serviço</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.service_date}
                  onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Serviço</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.service_value}
                  onChange={(e) => setFormData({ ...formData, service_value: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            {/* Dados do Veículo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placa do Carro</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.car_plate}
                  onChange={(e) => setFormData({ ...formData, car_plate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo do Carro</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.car_model}
                  onChange={(e) => setFormData({ ...formData, car_model: e.target.value })}
                />
              </div>
            </div>

            {/* Peças Reparadas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Peças Reparadas (selecione uma ou mais)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 max-h-[40vh] overflow-y-auto p-2 border border-gray-200 rounded-md">
                {REPAIRED_PARTS.map((part) => (
                  <div key={part} className="flex items-center bg-gray-50 p-2 sm:p-3 rounded-md border border-gray-200">
                    <input
                      type="checkbox"
                      id={`part-${part}`}
                      checked={formData.repaired_parts.includes(part)}
                      onChange={() => handleRepairedPartsChange(part)}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`part-${part}`} className="ml-3 text-sm text-gray-700 cursor-pointer flex-1">
                      {part.charAt(0).toUpperCase() + part.slice(1)}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2 sm:mb-0"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {service ? 'Atualizando...' : 'Cadastrando...'}
                  </span>
                ) : (
                  service ? 'Atualizar' : 'Cadastrar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}