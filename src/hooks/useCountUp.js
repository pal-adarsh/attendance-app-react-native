import { useState, useEffect, useRef } from 'react';

export const useCountUp = (targetValue, duration = 1000) => {
  const [count, setCount] = useState(0);
  const targetRef = useRef(targetValue);
  const startRef = useRef(0);
  const startTimeRef = useRef(null);

  useEffect(() => {
    startRef.current = count;
    targetRef.current = targetValue;
    startTimeRef.current = null;

    let animationFrameId;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing: easeOutQuad
      const easeProgress = progress * (2 - progress);
      const currentCount = startRef.current + (targetRef.current - startRef.current) * easeProgress;

      setCount(currentCount);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [targetValue, duration]);

  return count;
};

export default useCountUp;
