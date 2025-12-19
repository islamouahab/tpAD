import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { Bell, Menu, X, Home, Users, FileText, Pill, Settings, LogOut, User } from 'lucide-react';
import api from '../api/axios';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread_count/');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Failed to fetch notifications');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'doctor', 'nurse', 'pharmacist'] },
    { path: '/patients', label: 'Patients', icon: Users, roles: ['admin', 'doctor', 'nurse', 'pharmacist'] },
    { path: '/prescriptions', label: 'Prescriptions', icon: Pill, roles: ['admin', 'doctor', 'nurse', 'pharmacist'] },
    { path: '/medical-records', label: 'Medical Records', icon: FileText, roles: ['admin', 'doctor', 'nurse'] },
    { path: '/admin/users', label: 'Manage Users', icon: Settings, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-600 shadow-lg fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-white hover:bg-blue-700"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <Link to="/dashboard" className="flex items-center ml-2 lg:ml-0">
                <span className="text-white font-bold text-xl">DME</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                to="/notifications" 
                className="relative p-2 text-white hover:bg-blue-700 rounded-full"
              >
                <Bell size={24} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              
              <div className="flex items-center text-white">
                <User size={20} className="mr-2" />
                <span className="hidden sm:inline">{user?.first_name || user?.username}</span>
                <span className="ml-2 px-2 py-1 bg-blue-700 rounded text-xs uppercase">
                  {user?.role}
                </span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center p-2 text-white hover:bg-blue-700 rounded"
              >
                <LogOut size={20} />
                <span className="ml-1 hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out
          pt-16 lg:pt-0
        `}>
          <nav className="mt-5 px-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center px-4 py-3 mb-1 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon size={20} className="mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-6 lg:ml-0">
          {children}
        </main>
      </div>
    </div>
  );
}
