import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Check, Clock, X } from 'lucide-react';
import api from '../api/axios';

export default function Prescriptions() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    patient: '',
    medications: [{ name: '', dosage: '', frequency: '' }],
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const [rxRes, patientsRes] = await Promise.all([
        api.get('/prescriptions/', { params }),
        api.get('/patients/'),
      ]);
      setPrescriptions(rxRes.data);
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
      const medications = formData.medications.filter(m => m.name.trim());
      await api.post('/prescriptions/', {
        patient: formData.patient,
        medications,
        notes: formData.notes,
      });
      fetchData();
      closeModal();
    } catch (error) {
      console.error('Failed to create prescription');
    }
  };

  const handleDispense = async (id) => {
    try {
      await api.post(`/prescriptions/${id}/dispense/`);
      fetchData();
    } catch (error) {
      console.error('Failed to dispense prescription');
    }
  };

  const addMedication = () => {
    setFormData({
      ...formData,
      medications: [...formData.medications, { name: '', dosage: '', frequency: '' }],
    });
  };

  const updateMedication = (index, field, value) => {
    const meds = [...formData.medications];
    meds[index][field] = value;
    setFormData({ ...formData, medications: meds });
  };

  const removeMedication = (index) => {
    const meds = formData.medications.filter((_, i) => i !== index);
    setFormData({ ...formData, medications: meds.length ? meds : [{ name: '', dosage: '', frequency: '' }] });
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      patient: '',
      medications: [{ name: '', dosage: '', frequency: '' }],
      notes: '',
    });
  };

  const isDoctor = user?.role === 'doctor';
  const isPharmacist = user?.role === 'pharmacist';

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
        <h1 className="text-3xl font-bold text-gray-800">Prescriptions</h1>
        <div className="flex gap-4 w-full sm:w-auto">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="dispensed">Dispensed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {isDoctor && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} className="mr-2" />
              New Prescription
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {prescriptions.map((rx) => (
          <div key={rx.id} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-800">Prescription #{rx.id}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
                    rx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    rx.status === 'dispensed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {rx.status === 'pending' && <Clock size={14} className="mr-1" />}
                    {rx.status === 'dispensed' && <Check size={14} className="mr-1" />}
                    {rx.status === 'cancelled' && <X size={14} className="mr-1" />}
                    {rx.status}
                  </span>
                </div>
                <p className="text-gray-600">
                  <span className="font-medium">Patient:</span> {rx.patient_name}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Doctor:</span> {rx.doctor_name}
                </p>
                <p className="text-gray-500 text-sm">
                  Created: {new Date(rx.created_at).toLocaleString()}
                </p>
                
                <div className="mt-3">
                  <span className="font-medium text-gray-700">Medications:</span>
                  <ul className="mt-1 space-y-1">
                    {rx.medications?.map((med, i) => (
                      <li key={i} className="text-gray-600 ml-4 list-disc">
                        {med.name} {med.dosage && `- ${med.dosage}`} {med.frequency && `(${med.frequency})`}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {rx.notes && (
                  <p className="mt-2 text-gray-600">
                    <span className="font-medium">Notes:</span> {rx.notes}
                  </p>
                )}
                
                {rx.dispensed_at && (
                  <p className="mt-2 text-green-600 text-sm">
                    Dispensed by {rx.dispensed_by_name} on {new Date(rx.dispensed_at).toLocaleString()}
                  </p>
                )}
              </div>
              
              {isPharmacist && rx.status === 'pending' && (
                <button
                  onClick={() => handleDispense(rx.id)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Check size={20} className="mr-2" />
                  Dispense
                </button>
              )}
            </div>
          </div>
        ))}
        
        {prescriptions.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl">
            No prescriptions found
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">New Prescription</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medications</label>
                  {formData.medications.map((med, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={med.name}
                        onChange={(e) => updateMedication(index, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Dosage"
                        value={med.dosage}
                        onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Frequency"
                        value={med.frequency}
                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                        className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      {formData.medications.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedication(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMedication}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    + Add another medication
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
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
                    Create Prescription
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
