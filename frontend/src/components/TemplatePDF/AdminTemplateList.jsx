import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash, FaEye, FaCheck, FaTimes } from 'react-icons/fa';
import templatePDFService from '../../services/templatePDFService';
import { useAuth } from '../../contexts/AuthContext';

const AdminTemplateList = () => {
  const { usuario, temRole, temAlgumaRole, isAdminMaster } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [filtros, setFiltros] = useState({
    ativo: 'true'
  });

  useEffect(() => {
    const isAdmin = isAdminMaster || temAlgumaRole(['admin', 'adminMaster']);
    if (usuario && isAdmin) {
      carregarTemplates();
    }
  }, [usuario, pagination.page, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

  const carregarTemplates = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filtros
      };
      
      const response = await templatePDFService.listarTemplates(params);
      
      setTemplates(response.templates || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0,
        pages: response.pagination?.pages || 0
      }));
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast.error('Erro ao carregar lista de templates');
    } finally {
      setLoading(false);
    }
  };

  const validarTemplate = async (tenantId) => {
    try {
      const response = await templatePDFService.validarTemplate(tenantId);
      
      if (response.valido) {
        toast.success(`Template do tenant ${tenantId} é válido`);
      } else {
        toast.error(`Template do tenant ${tenantId} tem problemas`);
      }
    } catch (error) {
      console.error('Erro ao validar template:', error);
      toast.error('Erro ao validar template');
    }
  };

  const deletarTemplate = async (tenantId) => {
    if (!window.confirm('Tem certeza que deseja desativar este template?')) {
      return;
    }

    try {
      await templatePDFService.deletarTemplate(tenantId);
      toast.success('Template desativado com sucesso');
      carregarTemplates();
    } catch (error) {
      console.error('Erro ao deletar template:', error);
      toast.error('Erro ao desativar template');
    }
  };

  const mudarPagina = (novaPagina) => {
    setPagination(prev => ({
      ...prev,
      page: novaPagina
    }));
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isAdmin = isAdminMaster || temAlgumaRole(['admin', 'adminMaster']);
  
  if (!usuario || !isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Acesso negado. Apenas administradores podem visualizar esta página.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Gerenciar Templates PDF
        </h2>
        
        <div className="flex gap-4">
          <select
            value={filtros.ativo}
            onChange={(e) => setFiltros(prev => ({ ...prev, ativo: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Nenhum template encontrado.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome do Modelo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cores
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Logo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Atualizado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {template.tenant_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {template.nomeModelo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex gap-1">
                        <div
                          className="w-4 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: template.cores?.primaria }}
                          title={`Primária: ${template.cores?.primaria}`}
                        ></div>
                        <div
                          className="w-4 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: template.cores?.secundaria }}
                          title={`Secundária: ${template.cores?.secundaria}`}
                        ></div>
                        <div
                          className="w-4 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: template.cores?.texto }}
                          title={`Texto: ${template.cores?.texto}`}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {template.temLogo ? (
                        <FaCheck className="text-green-600" title="Tem logo" />
                      ) : (
                        <FaTimes className="text-red-600" title="Sem logo" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        template.ativo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {template.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatarData(template.updatedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => validarTemplate(template.tenant_id)}
                          className="text-green-600 hover:text-green-900"
                          title="Validar template"
                        >
                          <FaEye />
                        </button>
                        
                        <button
                          onClick={() => deletarTemplate(template.tenant_id)}
                          className="text-red-600 hover:text-red-900"
                          title="Desativar template"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {pagination.pages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                Mostrando {templates.length} de {pagination.total} templates
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => mudarPagina(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => mudarPagina(page)}
                    className={`px-3 py-1 text-sm border rounded ${
                      page === pagination.page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => mudarPagina(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminTemplateList;
