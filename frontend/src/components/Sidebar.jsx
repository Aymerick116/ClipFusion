import { Link, useNavigate } from "react-router-dom";
import { FiHome, FiLogOut } from "react-icons/fi";
import { jwtDecode } from "jwt-decode";

const Sidebar = () => {
  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");
  const decoded = token ? jwtDecode(token) : {};
  const userEmail = decoded?.sub || "anonymous";

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
    window.location.reload();
  };

  return (
    <aside className="h-screen w-64 bg-gray-950 text-white flex flex-col justify-between p-6 shadow-lg">
      {/* User Info */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <img src="/avatar.png" alt="User" className="w-12 h-12 rounded-full" />
          <div className="flex flex-col overflow-hidden">
            <span className="text-xl font-bold truncate max-w-[11rem]">Welcome</span>
            <span className="text-sm text-gray-400 truncate max-w-[11rem]">{userEmail}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav>
          <ul className="space-y-4">
            <li>
              <Link
                to="/dashboard"
                className="flex items-center gap-3 text-lg font-medium px-3 py-2 rounded hover:bg-gray-800 transition"
              >
                <FiHome size={20} /> Dashboard
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Logout Button */}
      <div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-red-400 hover:text-red-300 px-3 py-2 text-lg font-medium rounded hover:bg-gray-800 transition w-full"
        >
          <FiLogOut size={20} /> Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
