import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, FileText, Pill, CheckCircle, Clock, Activity } from 'lucide-react';
import api from '../api/axios';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white rounded-xl shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
        </div>
        <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
          <Icon size={24} style={{ color }} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome, {user?.first_name || user?.username}!
        </h1>
        <p className="text-gray-500 mt-2">
          {user?.role === 'admin' && 'Manage users and monitor system activity'}
          {user?.role === 'doctor' && 'View your patients and create prescriptions'}
          {user?.role === 'nurse' && 'Track treatments and update patient vitals'}
          {user?.role === 'pharmacist' && 'View and dispense prescriptions'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Users}
          title="Total Patients"
          value={stats?.total_patients || 0}
          color="#3B82F6"
        />
        <StatCard
          icon={FileText}
          title="Total Prescriptions"
          value={stats?.total_prescriptions || 0}
          color="#10B981"
        />
        <StatCard
          icon={Clock}
          title="Pending Prescriptions"
          value={stats?.pending_prescriptions || 0}
          color="#F59E0B"
        />
        <StatCard
          icon={CheckCircle}
          title="Dispensed"
          value={stats?.dispensed_prescriptions || 0}
          color="#6366F1"
        />
      </div>

      {user?.role === 'admin' && stats?.users_by_role && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Users by Role</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.users_by_role).map(([role, count]) => (
              <div key={role} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-800">{count}</p>
                <p className="text-gray-500 capitalize">{role}s</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {user?.role === 'doctor' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Activity className="mr-2 text-blue-600" />
              My Activity
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">My Prescriptions</span>
                <span className="font-bold text-gray-800">{stats?.my_prescriptions || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Patients Created</span>
                <span className="font-bold text-gray-800">{stats?.my_patients || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'pharmacist' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">My Dispensing Activity</h2>
          <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">{stats?.my_dispensed || 0}</p>
              <p className="text-gray-500 mt-2">Prescriptions Dispensed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
