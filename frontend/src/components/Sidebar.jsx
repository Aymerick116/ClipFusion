
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FiHome,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiHelpCircle,
  FiUser,
  FiUsers,
  FiLink,
  FiClock,
  FiChevronDown,
} from "react-icons/fi";
import { jwtDecode } from "jwt-decode";
import { useState, useEffect } from "react";


const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest(".profile-dropdown")) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const token = localStorage.getItem("access_token");
  const decoded = token ? jwtDecode(token) : {};
  const userEmail = decoded?.sub || "anonymous";

  const navItems = [
    { label: "Home", icon: <FiHome size={24} />, path: "/dashboard" },
    { label: "Calendar", icon: <FiCalendar size={24} />, path: "/calendar" },
  ];

  const footerItems = [
    { label: "Subscription", icon: <FiUser size={24} />, path: "/subscription" },
    { label: "Help center", icon: <FiHelpCircle size={24} />, path: "/help" },
  ];

  const renderNavSection = (title, items) => (
    <div className="mb-8">
      {!collapsed && <p className="text-sm font-semibold text-gray-500 uppercase mb-4">{title}</p>}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              to={item.path}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg text-base font-bold transition-all group ${location.pathname === item.path
                  ? "bg-gray-800 text-white"
                  : "hover:bg-gray-800 text-gray-300"
                }`}
              title={collapsed ? item.label : ""}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <aside
      className={`h-screen ${collapsed ? "w-20" : "w-64"
        } bg-black text-white flex flex-col justify-between p-4 transition-all duration-300 shadow-lg`}
    >
      {/* Top Section */}
      <div>
        {/* Collapse Toggle */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-white transition"
          >
            {collapsed ? <FiChevronRight size={22} /> : <FiChevronLeft size={22} />}
          </button>
        </div>

        {/* Profile Dropdown */}
        <div className="relative mb-8 profile-dropdown">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 w-full hover:bg-gray-800 rounded-lg px-3 py-2 transition"
          >
            {/* <img src="/avatar.png" alt="User" className="w-10 h-10 rounded-full" /> */}
            <img
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userEmail)}`}
              alt="Avatar"
              className="w-10 h-10 rounded-full"
            />
            {!collapsed && (
              <>
                <span className="text-base font-bold truncate max-w-[8rem]">{userEmail}</span>
                <FiChevronDown size={20} />
              </>
            )}
          </button>

          {/* Dropdown */}
          {dropdownOpen && !collapsed && (
            <div className="absolute top-[4.5rem] left-0 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50">
              <div className="p-4">
                <p className="text-sm text-gray-400 mb-2">Accounts</p>

                <button
                  onClick={() => setShowAccountModal(true)}
                  className="flex items-center gap-2 text-white w-full px-2 py-2 rounded hover:bg-gray-800 transition"
                >
                  <FiUser size={18} />
                  <span className="text-sm text-left">Aymerick Osse</span>
                </button>

                <button
                  onClick={() => setShowCreditsModal(true)}
                  className="flex items-center gap-2 text-white w-full px-2 py-2 rounded hover:bg-gray-800 transition"
                >
                  <FiClock size={18} />
                  <span className="text-sm text-left">Credit usage history</span>
                </button>
              </div>

              {/* Logout */}
              <button
                onClick={() => {
                  localStorage.removeItem("access_token");
                  navigate("/");
                  window.location.reload();
                }}
                className="flex items-center w-full gap-3 px-4 py-3 text-base font-bold text-red-400 hover:text-red-300 hover:bg-gray-800 border-t border-gray-700 transition"
              >
                <FiLogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        {renderNavSection("Create", navItems)}
      </div>

      {/* Bottom Section */}
      <div>{renderNavSection("", footerItems)}</div>

      {/* Account Info Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg w-[90%] max-w-md">
            <h2 className="text-xl font-bold mb-4">Account Info</h2>
            <p className="text-gray-300 mb-2">
              Email: <span className="font-semibold">{userEmail}</span>
            </p>
            <p className="text-gray-400 mb-2">Plan: <span className="font-semibold">Free</span></p>
            <p className="text-gray-400 mb-2">Member Since: Jan 2025</p>
            <button
              onClick={() => setShowAccountModal(false)}
              className="mt-4 bg-gray-800 px-4 py-2 rounded hover:bg-gray-700 text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Credit Usage Modal */}
      {showCreditsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg w-[90%] max-w-md">
            <h2 className="text-xl font-bold mb-4">Credit Usage</h2>
            <p className="text-gray-300 mb-2">
              You’ve used <strong>3</strong> out of <strong>5</strong> free uploads today.
            </p>
            <p className="text-gray-400 mb-2">Upgrade to Pro for unlimited usage.</p>
            <button
              onClick={() => setShowCreditsModal(false)}
              className="mt-4 bg-gray-800 px-4 py-2 rounded hover:bg-gray-700 text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;







