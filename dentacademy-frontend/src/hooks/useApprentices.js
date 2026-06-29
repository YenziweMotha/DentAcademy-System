import { useState, useEffect } from 'react';
import { getApprentices } from '../api/apprentices';

export const useApprentices = () => {
  const [apprentices, setApprentices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApprentices = async () => {
      try {
        const data = await getApprentices();
        setApprentices(data);
      } catch (err) {
        console.error("Failed to fetch apprentices", err);
      } finally {
        setLoading(false);
      }
    };
    fetchApprentices();
  }, []);

  return { apprentices, loading };
};
