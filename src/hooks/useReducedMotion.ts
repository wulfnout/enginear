import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True when the person has turned on "Reduce Motion" on their phone. Looping animations stop. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}
