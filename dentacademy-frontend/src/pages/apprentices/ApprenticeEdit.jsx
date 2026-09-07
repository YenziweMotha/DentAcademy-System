import { SkeletonCard } from '../../components/ui/Skeleton';
import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import AlertBanner from '../../components/ui/AlertBanner';

const PROVINCES = [
  'Limpopo', 'Gauteng', 'Mpumalanga', 'North West',
  'Free State', 'Northern Cape', 'Western Cape', 'Eastern Cape', 'KwaZulu-Natal',
];

export default function ApprenticeEdit() {
  const { apprenticeId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    first_name: '',
    surname: '',
    date_of_birth: '',
    gender: '',
    contact_number: '',
    address_line1: '',
    city: '',
    province: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/api/apprentices/${apprenticeId}`)
      .then((res) => {
        const a = res.data;
        setFormData({
          first_name: a.first_name || '',
          surname: a.surname || '',
          date_of_birth: a.date_of_birth || '',
          gender: a.gender || '',
          contact_number: a.contact_number || '',
          address_line1: a.address_line1 || '',
          city: a.city || '',
          province: a.province || '',
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Failed to load apprentice.');
        setLoading(false);
      });
  }, [apprenticeId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        first_name: formData.first_name.trim() || undefined,
        surname: formData.surname.trim() || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        gender: formData.gender || undefined,
        contact_number: formData.contact_number || undefined,
        address_line1: formData.address_line1 || undefined,
        city: formData.city || undefined,
        province: formData.province || undefined,
      };

      await api.put(`/api/apprentices/${apprenticeId}`, payload);
      toast.success('Apprentice details updated.');
      navigate(`/apprentices/${apprenticeId}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update apprentice.');
      setSaving(false);
    }
  };

  const input = 'w-full border border-line rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand';
  const label = 'block text-sm font-medium text-ink mb-1';

  return (
    <div className="page-shell">
      <PageHeader title="Edit Apprentice" subtitle="Update personal details. The ID number cannot be changed." />

      {error && <AlertBanner type="error" message={error} className="mb-6" />}

      {loading ? (
        <SkeletonCard />
      ) : (
        <Card as="form" onSubmit={handleSubmit} className="animate-fade-up">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label}>First Name *</label>
              <input className={input} value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} />
            </div>
            <div>
              <label className={label}>Surname *</label>
              <input className={input} value={formData.surname} onChange={(e) => handleChange('surname', e.target.value)} />
            </div>
            <div>
              <label className={label}>Date of Birth</label>
              <input type="date" className={input} value={formData.date_of_birth || ''} onChange={(e) => handleChange('date_of_birth', e.target.value)} />
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
              <input className={input} value={formData.contact_number || ''} onChange={(e) => handleChange('contact_number', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={label}>Address</label>
              <input className={input} value={formData.address_line1 || ''} onChange={(e) => handleChange('address_line1', e.target.value)} />
            </div>
            <div>
              <label className={label}>City</label>
              <input className={input} value={formData.city || ''} onChange={(e) => handleChange('city', e.target.value)} />
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

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" onClick={() => navigate(`/apprentices/${apprenticeId}`)} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}