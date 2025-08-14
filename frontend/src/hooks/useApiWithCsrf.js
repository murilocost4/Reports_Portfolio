// hooks/useApiWithCsrf.js
import { useAuth } from "../contexts/AuthContext";
import api from "../api";

export const useApiWithCsrf = () => {
  const { ensureCsrfToken } = useAuth();

  const apiPost = async (url, data, config = {}) => {
    await ensureCsrfToken();
    return api.post(url, data, config);
  };

  const apiPut = async (url, data, config = {}) => {
    await ensureCsrfToken();
    return api.put(url, data, config);
  };

  const apiPatch = async (url, data, config = {}) => {
    await ensureCsrfToken();
    return api.patch(url, data, config);
  };

  const apiDelete = async (url, config = {}) => {
    await ensureCsrfToken();
    return api.delete(url, config);
  };

  return {
    get: api.get,
    post: apiPost,
    put: apiPut,
    patch: apiPatch,
    delete: apiDelete,
  };
};
