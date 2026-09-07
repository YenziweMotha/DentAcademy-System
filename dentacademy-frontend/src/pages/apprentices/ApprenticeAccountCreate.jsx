import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AlertBanner from '../../components/ui/AlertBanner';

/**
 * First step of apprentice registration: creates the login account, which the
 * backend pairs with a placeholder apprentice record. The second step then
 * captures the rest of their details.
 */
export default function ApprenticeAccountCreate() {
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    first_name: '',
    surname: '',
    id_number: '',
    email: '',
    contact_number: '',
  });

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const next = {};
    if (!formData.first_name.trim()) next.first_name = 'First name is required.';
    if (!formData.surname.trim()) next.surname = 'Surname is required.';

    if (!/^\d{13}$/.test(formData.id_number.trim())) {
      next.id_number = 'ID number must be exactly 13 digits.';
    } else {
      const month = Number(formData.id_number.slice(2, 4));
      const day = Number(formData.id_number.slice(4, 6));
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        next.id_number = 'ID number contains an invalid date of birth.';
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      next.email = 'A valid email is required — login credentials are emailed to it.';
    }

    const contact = formData.contact_number.trim();
    if (contact && (contact.length < 10 || contact.length > 12)) {
      next.contact_number = 'Contact number must be 10 to 12 digits.';
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
      const res = await api.post('/api/users', {
        full_name: `${formData.first_name.trim()} ${formData.surname.trim()}`,
        email: formData.email.trim(),
        role: 'Apprentice',
        id_number: formData.id_number.trim(),
        contact_number: formData.contact_number.trim() || undefined,
      });

      if (res.data.apprentice_registered) {
        toast.success('Login account linked to the existing registered apprentice.');
        navigate(`/apprentices/${res.data.apprentice_id}`);
        return;
      }

      toast.success('Login account created. Now capture their details.');
      navigate(`/apprentices/${res.data.apprentice_id}/register`, {
        state: {
          credentials: {
            username: res.data.username,
            password: res.data.dev_password || null,
          },
        },
      });
    } catch (err) {
      console.error('Failed to create apprentice account:', err);
      setFormError(
        err.response?.data?.detail || 'Failed to create the login account.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader title="Register Apprentice" subtitle="Step 1 of 2 — create the login account before capturing personal and academic details." />

      {formError && (
        <AlertBanner type="error" message={formError} className="mb-6" />
      )}

      <Card as="form" onSubmit={handleSubmit} className="space-y-6 animate-fade-up">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="First Name *" error={errors.first_name}
              value={formData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
            />

          <Input label="Surname *" error={errors.surname}
              value={formData.surname}
              onChange={(e) => handleChange('surname', e.target.value)}
            />

          <Input label="ID Number (13 digits) *" error={errors.id_number}
              value={formData.id_number}
              onChange={(e) =>
                handleChange('id_number', e.target.value.replace(/\D/g, '').slice(0, 13))
              }
            />

          <Input label="Contact Number" error={errors.contact_number}
              value={formData.contact_number}
              onChange={(e) =>
                handleChange('contact_number', e.target.value.replace(/\D/g, '').slice(0, 12))
              }
            />

          <div className="md:col-span-2">
            <Input label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              hint="A username and password are generated and emailed to this address."
              error={errors.email}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            onClick={() => navigate('/apprentices')}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
          >
            {submitting ? 'Creating account...' : 'Create Account and Continue'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
