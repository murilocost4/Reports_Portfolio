import React, { createContext, useContext, useState } from "react";

const SidebarAdminMasterContext = createContext();

export const SidebarAdminMasterProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);
  const open = () => setIsOpen(true);

  return (
    <SidebarAdminMasterContext.Provider value={{ isOpen, toggle, close, open }}>
      {children}
    </SidebarAdminMasterContext.Provider>
  );
};

export const useSidebarAdminMaster = () => {
  const context = useContext(SidebarAdminMasterContext);
  if (!context) {
    throw new Error(
      "useSidebarAdminMaster must be used within a SidebarAdminMasterProvider",
    );
  }
  return context;
};
