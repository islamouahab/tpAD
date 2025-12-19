import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, FileText } from 'lucide-react';
import api from '../api/axios';

export default function MedicalRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    patient: '',
    title: '',
    notes: '',
    diagnosis: '',
    vitals_blood_pressure: '',
    vitals_heart_rate: '',
    vitals_temperature: '',
    vitals_weight: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recordsRes, patientsRes] = await Promise.all([
        api.get('/medical-folders/'),
        api.get('/patients/'),
      ]);
      setRecords(recordsRes.data);
      setPatients(patientsRes.data);
    } catch (error) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData };
      if (!data.vitals_heart_rate) delete data.vitals_heart_rate;
      if (!data.vitals_temperature) delete data.vitals_temperature;
      if (!data.vitals_weight) delete data.vitals_weight;
      
      await api.post('/medical-folders/', data);
      fetchData();
      closeModal();
    } catch (error) {
      console.error('Failed to create record');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      patient: '',
      title: '',
      notes: '',
      diagnosis: '',
      vitals_blood_pressure: '',
      vitals_heart_rate: '',
      vitals_temperature: '',
      vitals_weight: '',
    });
  };

  const canCreate = ['doctor', 'nurse'].includes(user?.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Medical Records</h1>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} className="mr-2" />
            New Record
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {records.map((record) => (
          <div key={record.id} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="text-blue-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">{record.title}</h3>
                </div>
                <p className="text-gray-600">
                  <span className="font-medium">Patient:</span> {record.patient_name}
                </p>
                <p className="text-gray-500 text-sm">
                  Created by {record.created_by_name} on {new Date(record.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            {record.diagnosis && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-blue-800">Diagnosis: </span>
                <span className="text-blue-700">{record.diagnosis}</span>
              </div>
            )}
            
            <p className="mt-3 text-gray-600">{record.notes}</p>
            
            {(record.vitals_blood_pressure || record.vitals_heart_rate || record.vitals_temperature || record.vitals_weight) && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-700 mb-2">Vitals</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {record.vitals_blood_pressure && (
                    <div>
                      <span className="text-gray-500">Blood Pressure:</span>
                      <span className="ml-1 font-medium">{record.vitals_blood_pressure}</span>
                    </div>
                  )}
                  {record.vitals_heart_rate && (
                    <div>
                      <span className="text-gray-500">Heart Rate:</span>
                      <span className="ml-1 font-medium">{record.vitals_heart_rate} bpm</span>
                    </div>
                  )}
                  {record.vitals_temperature && (
                    <div>
                      <span className="text-gray-500">Temperature:</span>
                      <span className="ml-1 font-medium">{record.vitals_temperature}F</span>
                    </div>
                  )}
                  {record.vitals_weight && (
                    <div>
                      <span className="text-gray-500">Weight:</span>
                      <span className="ml-1 font-medium">{record.vitals_weight} kg</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {records.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl">
            No medical records found
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">New Medical Record</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                  <select
                    value={formData.patient}
                    onChange={(e) => setFormData({...formData, patient: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a patient</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Annual Checkup, Follow-up Visit"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                  <input
                    type="text"
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    required
                  />
                </div>

                <div className="border-t pt-4">
                  <p className="font-medium text-gray-700 mb-3">Vitals (Optional)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Blood Pressure</label>
                      <input
                        type="text"
                        placeholder="e.g., 120/80"
                        value={formData.vitals_blood_pressure}
                        onChange={(e) => setFormData({...formData, vitals_blood_pressure: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Heart Rate (bpm)</label>
                      <input
                        type="number"
                        value={formData.vitals_heart_rate}
                        onChange={(e) => setFormData({...formData, vitals_heart_rate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Temperature (F)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.vitals_temperature}
                        onChange={(e) => setFormData({...formData, vitals_temperature: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.vitals_weight}
                        onChange={(e) => setFormData({...formData, vitals_weight: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
