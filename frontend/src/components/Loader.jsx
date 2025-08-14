import React from "react";

const Loader = () => {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-30 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-white font-medium">Carregando dados...</p>
      </div>
    </div>
  );
};

export default Loader;
