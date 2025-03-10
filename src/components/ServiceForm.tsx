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

export function ServiceForm({ service, onSuccess, onCancel }: ServiceFormProps) {
  const [formData, setFormData] = useState({
    client_name: service?.client_name || '',
    service_date: service?.service_date ? format(new Date(service.service_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    car_plate: service?.car_plate || '',
    car_model: service?.car_model || '',
    service_value: service?.service_value || '',
    repaired_parts: service?.repaired_parts || [REPAIRED_PARTS[0]]
  });

  // Função para lidar com a seleção de múltiplas peças
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar se pelo menos uma peça foi selecionada
    if (formData.repaired_parts.length === 0) {
      toast.error('Selecione pelo menos uma peça reparada');
      return;
    }

    try {
      console.log('Enviando dados para o Supabase:', formData);
      
      if (service?.id) {
        const { error } = await supabase
          .from('services')
          .update({
            ...formData,
            // Adicionar também o primeiro item para a coluna antiga (para compatibilidade)
            repaired_part: formData.repaired_parts[0] || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', service.id);
        
        if (error) {
          console.error('Erro detalhado ao atualizar:', error);
          throw error;
        }
        toast.success('Serviço atualizado com sucesso!');
      } else {
        // Dados para enviar
        const dataToSend = {
          ...formData,
          // Garantir que o valor do serviço seja um número
          service_value: typeof formData.service_value === 'string' 
            ? parseFloat(formData.service_value) 
            : formData.service_value,
          // Adicionar também o primeiro item para a coluna antiga (para compatibilidade)
          repaired_part: formData.repaired_parts[0] || null,
          // Adicionar created_at e updated_at
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('Dados formatados para envio:', dataToSend);
        
        const { data, error } = await supabase
          .from('services')
          .insert([dataToSend])
          .select();
        
        if (error) {
          console.error('Erro detalhado ao inserir:', error);
          throw error;
        }
        
        console.log('Resposta da inserção:', data);
        toast.success('Serviço cadastrado com sucesso!');
      }
      onSuccess();
    } catch (error) {
      console.error('Erro completo:', error);
      toast.error('Erro ao salvar o serviço');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Peças Reparadas (selecione uma ou mais)</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {REPAIRED_PARTS.map((part) => (
            <div key={part} className="flex items-center bg-gray-50 p-3 rounded-md border border-gray-200">
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

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border-2 border-blue-600 rounded-md hover:bg-blue-700"
        >
          {service ? 'Atualizar' : 'Cadastrar'}
        </button>
      </div>
    </form>
  );
}