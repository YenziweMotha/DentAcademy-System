import { useState } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import Spinner from '../../components/ui/Spinner';

const PROVINCES = [
  'Limpopo', 'Gauteng', 'Mpumalanga', 'North West',
  'Free State', 'Northern Cape', 'Western Cape', 'Eastern Cape', 'KwaZulu-Natal',
];

export default function ApprenticeCreate() {
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    first_name: '',
    surname: '',
    id_number: '',
    date_of_birth: '',
    gender: '',
    contact_number: '',
    address_line1: '',
    city: '',
    province: '',
    qualification_type: '',
    institution_name: '',
    subjects: [{ subject: '', mark: '' }],
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubjectChange = (index, field, value) => {
    const subjects = [...formData.subjects];
    subjects[index][field] = value;
    setFormData((prev) => ({ ...prev, subjects }));
  };

  const addSubject = () => {
    setFormData((prev) => ({
      ...prev,
      subjects: [...prev.subjects, { subject: '', mark: '' }],
    }));
  };

  const removeSubject = (index) => {
    if (formData.subjects.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const next = {};
    if (!formData.first_name.trim()) next.first_name = 'First name is required.';
    if (!formData.surname.trim()) next.surname = 'Surname is required.';
    if (!/^\d{13}$/.test(formData.id_number.trim())) {
      next.id_number = 'ID number must be exactly 13 digits.';
    } else {
      const dob = formData.id_number.slice(0, 6);
      const month = Number(dob.slice(2, 4));
      const day = Number(dob.slice(4, 6));
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        next.id_number = 'ID number contains an invalid date of birth.';
      }
    }
    if (formData.qualification_type && !formData.institution_name.trim()) {
      next.institution_name = 'Institution is required when qualification is given.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        first_name: formData.first_name.trim(),
        surname: formData.surname.trim(),
        id_number: formData.id_number.trim(),
        date_of_birth: formData.date_of_birth || undefined,
        gender: formData.gender || undefined,
        contact_number: formData.contact_number || undefined,
        address_line1: formData.address_line1 || undefined,
        city: formData.city || undefined,
        province: formData.province || undefined,
      };

      const res = await api.post('/api/apprentices', payload);
      const apprenticeId = res.data.apprentice_id;

      if (formData.qualification_type) {
        const subjects = formData.subjects
          .filter((s) => s.subject.trim() !== '' && s.mark !== '')
          .map((s) => ({ subject: s.subject.trim(), mark: Number(s.mark) }));

        await api.post(`/api/apprentices/${apprenticeId}/education`, {
          qualification_type: formData.qualification_type,
          institution_name: formData.institution_name.trim(),
          subjects: subjects.length ? subjects : undefined,
        });
      }

      navigate(`/apprentices/${apprenticeId}`);
      toast.success('Apprentice registered successfully.');
    } catch (err) {
      console.error('Failed to create apprentice:', err);
      setFormError(err.response?.data?.detail || 'Failed to create apprentice.');
    } finally {
      setSubmitting(false);
    }
  };

  const input = 'w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand';
  const label = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Register Apprentice</h1>
        <p className="text-sm text-gray-500 mt-1">
          Capture personal details and optional academic information.
        </p>
      </div>

      {formError && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-6">{formError}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Personal Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label}>First Name *</label>
              <input className={input} value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} />
              {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>}
            </div>

            <div>
              <label className={label}>Surname *</label>
              <input className={input} value={formData.surname} onChange={(e) => handleChange('surname', e.target.value)} />
              {errors.surname && <p className="text-red-500 text-sm mt-1">{errors.surname}</p>}
            </div>

            <div>
              <label className={label}>ID Number (13 digits) *</label>
              <input
                className={input}
                value={formData.id_number}
                onChange={(e) => handleChange('id_number', e.target.value.replace(/\D/g, '').slice(0, 13))}
              />
              {errors.id_number && <p className="text-red-500 text-sm mt-1">{errors.id_number}</p>}
            </div>

            <div>
              <label className={label}>Date of Birth</label>
              <input type="date" className={input} value={formData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} />
            </div>

            <div>
              <label className={label}>Gender</label>
              <select className={input} value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)}>
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className={label}>Contact Number</label>
              <input className={input} value={formData.contact_number} onChange={(e) => handleChange('contact_number', e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <label className={label}>Address</label>
              <input className={input} value={formData.address_line1} onChange={(e) => handleChange('address_line1', e.target.value)} />
            </div>

            <div>
              <label className={label}>City</label>
              <input className={input} value={formData.city} onChange={(e) => handleChange('city', e.target.value)} />
            </div>

            <div>
              <label className={label}>Province</label>
              <select className={input} value={formData.province} onChange={(e) => handleChange('province', e.target.value)}>
                <option value="">Select...</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Academic Details (optional)</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Qualification Type</label>
              <input className={input} value={formData.qualification_type} onChange={(e) => handleChange('qualification_type', e.target.value)} />
            </div>

            <div>
              <label className={label}>Institution</label>
              <input className={input} value={formData.institution_name} onChange={(e) => handleChange('institution_name', e.target.value)} />
              {errors.institution_name && <p className="text-red-500 text-sm mt-1">{errors.institution_name}</p>}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Subjects and marks</p>

            {formData.subjects.map((subject, index) => (
              <div key={index} className="flex gap-3 mb-2">
                <input
                  className={input}
                  placeholder="Subject"
                  value={subject.subject}
                  onChange={(e) => handleSubjectChange(index, 'subject', e.target.value)}
                />
                <input
                  className={`${input} w-32`}
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Mark"
                  value={subject.mark}
                  onChange={(e) => handleSubjectChange(index, 'mark', e.target.value)}
                />
                <button type="button" onClick={() => removeSubject(index)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded">
                  Remove
                </button>
              </div>
            ))}

            <button type="button" onClick={addSubject} className="text-brand text-sm hover:underline">
              + Add subject
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/apprentices')} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" /> Registering...
              </span>
            ) : (
              'Register Apprentice'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}