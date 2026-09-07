import { useState } from 'react';
import RatingInput from '../ui/RatingInput';
import Button from '../ui/Button';
import AlertBanner from '../ui/AlertBanner';

export default function EvaluationForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    discipline: 0,
    commitment: 0,
    willingness: 0,
    teamwork: 0,
    time_management: 0,
    professional_conduct: 0,
    comments: ''
  });
  
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dimensions = ['discipline', 'commitment', 'willingness', 'teamwork', 'time_management', 'professional_conduct'];
    const missing = dimensions.find(dim => formData[dim] === 0);
    
    if (missing) {
      setError('Please provide a rating (1-5) for all dimensions.');
      return;
    }
    
    setError('');
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <AlertBanner type="error" message={error} />}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RatingInput label="Discipline" value={formData.discipline} onChange={(v) => handleChange('discipline', v)} />
        <RatingInput label="Commitment" value={formData.commitment} onChange={(v) => handleChange('commitment', v)} />
        <RatingInput label="Willingness to Learn" value={formData.willingness} onChange={(v) => handleChange('willingness', v)} />
        <RatingInput label="Teamwork" value={formData.teamwork} onChange={(v) => handleChange('teamwork', v)} />
        <RatingInput label="Time Management" value={formData.time_management} onChange={(v) => handleChange('time_management', v)} />
        <RatingInput label="Professional Conduct" value={formData.professional_conduct} onChange={(v) => handleChange('professional_conduct', v)} />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">Additional Comments</label>
        <textarea
          className="w-full px-3.5 py-2.5 border border-line bg-surface-raised text-ink rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          rows="4"
          value={formData.comments}
          onChange={(e) => handleChange('comments', e.target.value)}
        ></textarea>
      </div>
      
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          {loading ? 'Submitting...' : 'Submit Evaluation'}
        </Button>
      </div>
    </form>
  );
}
