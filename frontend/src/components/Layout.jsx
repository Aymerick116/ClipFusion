import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout = () => {
  return (
    <div className="flex h-screen">
      <Sidebar />
      {/* Main Content */}
      <main className="flex-1 bg-gray-900 text-white p-6 ml-64 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
