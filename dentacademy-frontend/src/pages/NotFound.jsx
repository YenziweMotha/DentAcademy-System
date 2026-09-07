import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center animate-fade-up">
        <div className="flex justify-center mb-6">
          <Logo size={48} />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand mb-3">
          404
        </p>
        <h1 className="text-3xl font-bold text-ink tracking-tight mb-2">
          Page not found
        </h1>
        <p className="text-ink-muted text-sm mb-8">
          The page you are looking for does not exist or you may not have
          permission to view it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button icon={ArrowLeft} variant="secondary" onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button icon={Home} onClick={() => navigate('/')}>
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
