import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { SkeletonCard } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import AlertBanner from '../../components/ui/AlertBanner';

const PROVINCES = [
  'Limpopo', 'Gauteng', 'Mpumalanga', 'North West',
  'Free State', 'Northern Cape', 'Western Cape', 'Eastern Cape', 'KwaZulu-Natal',
];

/**
 * Second step of apprentice registration: captures the personal and academic
 * details for an apprentice whose login account already exists.
 */
export default function ApprenticeRegister() {
  const navigate = useNavigate();
  const toast = useToast();
  const { apprenticeId } = useParams();
  const { state } = useLocation();

  // Set when arriving straight from the account step, so the admin can still
  // read the generated credentials if email delivery is not configured.
  const credentials = state?.credentials || null;

  const [formData, setFormData] = useState({
    first_name: '',
    surname: '',
    date_of_birth: '',
    gender: '',
    contact_number: '',
    email: '',
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
  const [loading, setLoading] = useState(true);
  const [maskedId, setMaskedId] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  useEffect(() => {
    api
      .get(`/api/apprentices/${apprenticeId}`)
      .then(({ data }) => {
        setFormData((prev) => ({
          ...prev,
          first_name: data.first_name || '',
          surname: data.surname || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          contact_number: data.contact_number || '',
          email: data.email || '',
          address_line1: data.address_line1 || '',
          city: data.city || '',
          province: data.province || '',
          qualification_type: data.qualification_type || '',
          institution_name: data.institution || '',
        }));
        setMaskedId(data.id_number || '');
        if (data.qualification_type) {
          // Keep any subjects already captured, so saving does not drop them.
          api
            .get(`/api/apprentices/${apprenticeId}/education`)
            .then(({ data: edu }) => {
              if (edu.subjects?.length) {
                setFormData((prev) => ({
                  ...prev,
                  subjects: edu.subjects.map((s) => ({
                    subject: s.subject ?? s.subject_name ?? '',
                    mark: String(s.mark ?? ''),
                  })),
                }));
              }
            })
            .catch(() => {});
        }
        if (data.is_registered) {
          setAlreadyRegistered(true);
          setFormError(
            'This apprentice is already registered. Use Edit to change their details.'
          );
        }
      })
      .catch((err) => {
        setFormError(
          err.response?.data?.detail || 'Failed to load the apprentice record.'
        );
      })
      .finally(() => setLoading(false));
  }, [apprenticeId]);

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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      next.email = 'A valid email is required — login credentials are emailed to it.';
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
        date_of_birth: formData.date_of_birth || undefined,
        gender: formData.gender || undefined,
        contact_number: formData.contact_number || undefined,
        email: formData.email.trim(),
        address_line1: formData.address_line1 || undefined,
        city: formData.city || undefined,
        province: formData.province || undefined,
      };

      if (formData.qualification_type) {
        payload.education = {
          qualification_type: formData.qualification_type,
          institution_name: formData.institution_name.trim(),
          subjects: formData.subjects
            .filter((s) => s.subject.trim() !== '' && s.mark !== '')
            .map((s) => ({ subject: s.subject.trim(), mark: Number(s.mark) })),
        };
        if (!payload.education.subjects.length) delete payload.education.subjects;
      }

      const res = await api.post(
        `/api/apprentices/${apprenticeId}/registration`,
        payload
      );
      const newId = res.data.apprentice_id;

      navigate(`/apprentices/${newId}`);
      toast.success('Apprentice registered successfully.');
    } catch (err) {
      console.error('Failed to register apprentice:', err);
      setFormError(err.response?.data?.detail || 'Failed to register apprentice.');
    } finally {
      setSubmitting(false);
    }
  };

  const input = 'w-full border border-line rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand';
  const label = 'block text-sm font-medium text-ink mb-1';

  if (loading) {
    return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;
  }

  return (
    <div className="page-shell">
      <PageHeader title="Register Apprentice" subtitle="Step 2 of 2 — capture personal details and optional academic information." />

      {credentials && (
        <AlertBanner type="success" className="mb-6" message={<span>
          <span className="font-medium">
            Login account created — username{' '}
            <span className="font-mono">{credentials.username}</span>
          </span>
          {credentials.password ? (
            <span className="block mt-1">
              Password <span className="font-mono">{credentials.password}</span> — email
              is not configured, so pass these on to the apprentice.
            </span>
          ) : (
            <span className="block mt-1">The credentials have been emailed to them.</span>
          )}
        </span>} />
      )}

      {formError && (
        <AlertBanner type={alreadyRegistered ? 'warning' : 'error'} message={formError} className="mb-6" />
      )}

      <Card as="form" onSubmit={handleSubmit} className="space-y-6 animate-fade-up">
        <div>
          <h2 className="section-title mb-4">Personal Details</h2>

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
              <label className={label}>ID Number</label>
              <input className={`${input} bg-surface-muted`} value={maskedId} disabled />
              <p className="text-xs text-ink-muted mt-1">
                Captured with the login account and cannot be changed here.
              </p>
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

            <div>
              <label className={label}>Email *</label>
              <input
                type="email"
                className={`${input} bg-surface-muted`}
                value={formData.email}
                disabled
              />
              <p className="text-xs text-ink-muted mt-1">
                This is the address attached to their login account.
              </p>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
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
          <h2 className="section-title mb-4">Academic Details (optional)</h2>

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
            <p className="text-sm font-medium text-ink mb-2">Subjects and marks</p>

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
                <Button type="button" onClick={() => removeSubject(index)} variant="ghost" className="text-rose-600">
                  Remove
                </Button>
              </div>
            ))}

            <Button type="button" onClick={addSubject} variant="ghost" size="sm">
              + Add subject
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" onClick={() => navigate('/apprentices')} variant="secondary">
            Cancel
          </Button>
          <Button type="submit" loading={submitting} disabled={alreadyRegistered}>
            {submitting ? 'Registering...' : 'Complete Registration'}
          </Button>
        </div>
      </Card>
    </div>
  );
}