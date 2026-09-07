import { useLocation } from 'react-router-dom';

/** Subtle fade/slide when the route changes. */
export default function PageTransition({ children }) {
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-shell min-h-full">
      {children}
    </div>
  );
}
