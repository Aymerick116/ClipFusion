

// import { Link } from "react-router-dom";
// import { FiHome } from "react-icons/fi";
// import { useNavigate } from "react-router-dom";


// const Sidebar = () => {
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     localStorage.removeItem("access_token"); // 🧹 clear token
//     navigate("/"); // 🔄 redirect to login
//     window.location.reload(); // optional: resets state
//   };




//   return (
//     <aside className="h-screen w-64 bg-gray-950 text-white flex flex-col p-6 shadow-lg">
//       <div className="flex items-center gap-3 mb-10">
//         <img src="/avatar.png" alt="User" className="w-12 h-12 rounded-full" />
//         <span className="text-xl font-bold">aymerickn...</span>
//       </div>

//       {/* Navigation */}
//       <nav className="flex-1">
//         <ul className="space-y-6">
//           <li>
//             <Link 
//               to="/dashboard" 
//               className="flex items-center gap-3 text-lg font-semibold hover:text-gray-400 transition duration-200"
//             >
//               <FiHome size={22} /> Dashboard
//             </Link>
//           </li>
//           {/* Additional Routes will be added here */}
//         </ul>
//         <button
//           onClick={handleLogout}
//           className="w-full text-left text-red-400 font-semibold hover:text-red-300 transition"
//         >
//           Logout
//         </button>
//       </nav>
//     </aside>
//   );
// };

// export default Sidebar;

import { Link, useNavigate } from "react-router-dom";
import { FiHome, FiLogOut } from "react-icons/fi";

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
    window.location.reload();
  };

  return (
    <aside className="h-screen w-64 bg-gray-950 text-white flex flex-col justify-between p-6 shadow-lg">
      {/* User Info */}
      <div>
        <div className="flex items-center gap-3 mb-10">
          <img src="/avatar.png" alt="User" className="w-12 h-12 rounded-full" />
          <span className="text-xl font-bold">aymerickn...</span>
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
            {/* Add more links here if needed */}
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
