import { useCallback, useEffect, useRef, useState } from "react";
import { AUTO_TOUR_DELAY, AUTO_TOUR_INTERVAL, PLATFORM_FEATURES } from "./platformData";

export function usePlatformTour(isVisible: boolean, reducedMotion: boolean) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [autoTour, setAutoTour] = useState(false);
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tourRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userInteracted = useRef(false);

  const count = PLATFORM_FEATURES.length;

  // Start inactivity timer
  const startInactivityTimer = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    if (reducedMotion) return;

    inactivityRef.current = setTimeout(() => {
      setAutoTour(true);
    }, AUTO_TOUR_DELAY);
  }, [reducedMotion]);

  // Auto-tour cycling
  useEffect(() => {
    if (!autoTour || !isVisible || reducedMotion) {
      if (tourRef.current) clearInterval(tourRef.current);
      return;
    }

    tourRef.current = setInterval(() => {
      setActiveIdx((i) => (i + 1) % count);
    }, AUTO_TOUR_INTERVAL);

    return () => { if (tourRef.current) clearInterval(tourRef.current); };
  }, [autoTour, isVisible, reducedMotion, count]);

  // Pause auto-tour when not visible
  useEffect(() => {
    if (!isVisible && autoTour) {
      setAutoTour(false);
    }
  }, [isVisible, autoTour]);

  // Start inactivity timer on mount when visible
  useEffect(() => {
    if (isVisible && !userInteracted.current) {
      startInactivityTimer();
    }
    return () => { if (inactivityRef.current) clearTimeout(inactivityRef.current); };
  }, [isVisible, startInactivityTimer]);

  const goTo = useCallback((idx: number) => {
    userInteracted.current = true;
    setAutoTour(false);
    setActiveIdx(idx);
    if (tourRef.current) clearInterval(tourRef.current);
    startInactivityTimer();
  }, [startInactivityTimer]);

  const stopAutoTour = useCallback(() => {
    setAutoTour(false);
    if (tourRef.current) clearInterval(tourRef.current);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
      if (tourRef.current) clearInterval(tourRef.current);
    };
  }, []);

  return { activeIdx, autoTour, goTo, stopAutoTour };
}
