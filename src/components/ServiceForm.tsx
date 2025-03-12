import React, { useState } from 'react';
import { format } from 'date-fns';
import { Service, REPAIRED_PARTS } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ServiceFormProps {
  service?: Service;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Formulário para cadastro e edição de serviços
 */
export function ServiceForm({ service, onSuccess, onCancel }: ServiceFormProps) {
  // Estado inicial do formulário
  const [formData, setFormData] = useState({
    client_name: service?.client_name || '',
    service_date: service?.service_date 
      ? format(new Date(service.service_date), 'yyyy-MM-dd') 
      : format(new Date(), 'yyyy-MM-dd'),
    car_plate: service?.car_plate || '',
    car_model: service?.car_model || '',
    service_value: service?.service_value || '',
    repaired_parts: service?.repaired_parts || [REPAIRED_PARTS[0]]
  });

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

    // Verificar se pelo menos uma peça foi selecionada
    if (formData.repaired_parts.length === 0) {
      toast.error('Selecione pelo menos uma peça reparada');
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
      toast.error('Erro ao salvar o serviço');
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
        repaired_part: formData.repaired_parts[0] || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceId);
    
    if (error) {
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
      service_date: formattedDate,
      service_value: typeof formData.service_value === 'string' 
        ? parseFloat(formData.service_value) 
        : formData.service_value,
      repaired_part: formData.repaired_parts[0] || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('services')
      .insert([dataToSend])
      .select();
    
    if (error) {
      throw error;
    }
    
    toast.success('Serviço cadastrado com sucesso!');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* Nome do Cliente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
        <input
          type="text"
          required
          className="input-enhanced w-full"
          value={formData.client_name}
          onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
        />
      </div>

      {/* Data e Valor do Serviço */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data do Serviço</label>
          <input
            type="date"
            required
            className="input-enhanced w-full"
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
            className="input-enhanced w-full"
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
            className="input-enhanced w-full"
            value={formData.car_plate}
            onChange={(e) => setFormData({ ...formData, car_plate: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Modelo do Carro</label>
          <input
            type="text"
            required
            className="input-enhanced w-full"
            value={formData.car_model}
            onChange={(e) => setFormData({ ...formData, car_model: e.target.value })}
          />
        </div>
      </div>

      {/* Peças Reparadas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Peças Reparadas (selecione uma ou mais)</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
          {REPAIRED_PARTS.map((part) => (
            <div key={part} className="flex items-center bg-gray-50 p-2 sm:p-3 rounded-md border border-gray-200">
              <input
                type="checkbox"
                id={`part-${part}`}
                checked={formData.repaired_parts.includes(part)}
                onChange={() => handleRepairedPartsChange(part)}
                className="checkbox-enhanced"
              />
              <label htmlFor={`part-${part}`} className="ml-3 text-sm text-gray-700">
                {part.charAt(0).toUpperCase() + part.slice(1)}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-md hover:bg-gray-50 w-full sm:w-auto"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border-2 border-blue-600 rounded-md hover:bg-blue-700 w-full sm:w-auto"
        >
          {service ? 'Atualizar' : 'Cadastrar'}
        </button>
      </div>
    </form>
  );
}