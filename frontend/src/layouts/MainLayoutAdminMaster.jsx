import React from "react";
import SidebarAdminMaster from "../components/SidebarAdminMaster";
import HeaderAdminMaster from "../components/HeaderAdminMaster";
import { SidebarAdminMasterProvider } from "../contexts/SidebarAdminMasterContext";

const MainLayoutAdminMaster = ({ children }) => {
  return (
    <SidebarAdminMasterProvider>
      <div className="min-h-screen text-white">
        <HeaderAdminMaster />
        <SidebarAdminMaster />
        <main className="pt-16 lg:pl-72">
          <div>{children}</div>
        </main>
      </div>
    </SidebarAdminMasterProvider>
  );
};

export default MainLayoutAdminMaster;
