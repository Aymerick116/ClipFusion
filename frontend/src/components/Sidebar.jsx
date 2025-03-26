
// import { Link } from "react-router-dom";
// import { FiHome } from "react-icons/fi";

// const Sidebar = () => {
//   return (
//     <aside className="h-screen w-64 bg-black text-white flex flex-col p-6 fixed left-0 top-0">
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
//       </nav>
//     </aside>
//   );
// };

// export default Sidebar;

import { Link } from "react-router-dom";
import { FiHome } from "react-icons/fi";

const Sidebar = () => {
  return (
    <aside className="h-screen w-64 bg-gray-950 text-white flex flex-col p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-10">
        <img src="/avatar.png" alt="User" className="w-12 h-12 rounded-full" />
        <span className="text-xl font-bold">aymerickn...</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        <ul className="space-y-6">
          <li>
            <Link 
              to="/dashboard" 
              className="flex items-center gap-3 text-lg font-semibold hover:text-gray-400 transition duration-200"
            >
              <FiHome size={22} /> Dashboard
            </Link>
          </li>
          {/* Additional Routes will be added here */}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
