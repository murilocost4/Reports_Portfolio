import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const DebugAuth = () => {
  const auth = useAuth();
  
  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <h3 className="font-bold text-sm mb-2">🔍 Debug Auth</h3>
      <div className="text-xs space-y-1">
        <div><strong>usuario:</strong> {auth.usuario ? 'Existe' : 'null'}</div>
        <div><strong>roles:</strong> {JSON.stringify(auth.roles || 'null')}</div>
        <div><strong>todasRoles:</strong> {JSON.stringify(auth.todasRoles || 'null')}</div>
        <div><strong>isAdminMaster:</strong> {String(auth.isAdminMaster)}</div>
        {auth.usuario && (
          <div><strong>usuario.role:</strong> {auth.usuario.role || 'null'}</div>
        )}
      </div>
    </div>
  );
};

export default DebugAuth;
