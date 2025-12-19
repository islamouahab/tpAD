import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, FileText, Pill, Download, Plus, Activity } from 'lucide-react';
import api from '../api/axios';

export default function PatientDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [folders, setFolders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('records');

  useEffect(() => {
    fetchPatientData();
  }, [id]);

  const fetchPatientData = async () => {
    try {
      const [patientRes, foldersRes, prescriptionsRes] = await Promise.all([
        api.get(`/patients/${id}/`),
        api.get(`/medical-folders/?patient=${id}`),
        api.get(`/prescriptions/?patient=${id}`),
      ]);
      setPatient(patientRes.data);
      setFolders(foldersRes.data);
      setPrescriptions(prescriptionsRes.data);
    } catch (error) {
      console.error('Failed to fetch patient data');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await api.get(`/patients/${id}/pdf/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `medical_report_${patient.last_name}_${patient.first_name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!patient) {
    return <div className="text-center py-12 text-gray-500">Patient not found</div>;
  }

  return (
    <div>
      <Link to="/patients" className="inline-flex items-center text-blue-600 hover:underline mb-6">
        <ArrowLeft size={20} className="mr-2" />
        Back to Patients
      </Link>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {patient.first_name} {patient.last_name}
            </h1>
            <p className="text-gray-500 mt-1">DOB: {patient.date_of_birth}</p>
            <p className="text-gray-500">{patient.contact_phone} | {patient.contact_email}</p>
          </div>
          <button
            onClick={downloadPDF}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download size={20} className="mr-2" />
            Export Medical Report
          </button>
        </div>

        {patient.medical_history && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">Medical History</h3>
            <p className="text-gray-600">{patient.medical_history}</p>
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('records')}
          className={`flex items-center px-4 py-2 rounded-lg ${activeTab === 'records' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
        >
          <FileText size={20} className="mr-2" />
          Medical Records ({folders.length})
        </button>
        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`flex items-center px-4 py-2 rounded-lg ${activeTab === 'prescriptions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
        >
          <Pill size={20} className="mr-2" />
          Prescriptions ({prescriptions.length})
        </button>
      </div>

      {activeTab === 'records' && (
        <div className="space-y-4">
          {folders.map((folder) => (
            <div key={folder.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{folder.title}</h3>
                  <p className="text-sm text-gray-500">{new Date(folder.created_at).toLocaleDateString()}</p>
                </div>
                {folder.vitals_blood_pressure && (
                  <div className="flex items-center text-gray-600">
                    <Activity size={16} className="mr-1" />
                    BP: {folder.vitals_blood_pressure}
                  </div>
                )}
              </div>
              {folder.diagnosis && (
                <div className="mt-3">
                  <span className="font-medium text-gray-700">Diagnosis: </span>
                  <span className="text-gray-600">{folder.diagnosis}</span>
                </div>
              )}
              <p className="mt-2 text-gray-600">{folder.notes}</p>
              {(folder.vitals_heart_rate || folder.vitals_temperature || folder.vitals_weight) && (
                <div className="mt-3 flex gap-4 text-sm text-gray-500">
                  {folder.vitals_heart_rate && <span>HR: {folder.vitals_heart_rate} bpm</span>}
                  {folder.vitals_temperature && <span>Temp: {folder.vitals_temperature}F</span>}
                  {folder.vitals_weight && <span>Weight: {folder.vitals_weight} kg</span>}
                </div>
              )}
            </div>
          ))}
          {folders.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl">
              No medical records found
            </div>
          )}
        </div>
      )}

      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Prescription #{rx.id}</h3>
                  <p className="text-sm text-gray-500">
                    By {rx.doctor_name} on {new Date(rx.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  rx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  rx.status === 'dispensed' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {rx.status}
                </span>
              </div>
              <div className="mt-3">
                <span className="font-medium text-gray-700">Medications: </span>
                <span className="text-gray-600">
                  {rx.medications?.map(m => m.name).join(', ') || 'None'}
                </span>
              </div>
              {rx.notes && <p className="mt-2 text-gray-600">{rx.notes}</p>}
            </div>
          ))}
          {prescriptions.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl">
              No prescriptions found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
