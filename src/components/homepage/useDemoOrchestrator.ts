import { useCallback, useEffect, useRef, useState } from "react";
import { STEP_DURATIONS, AUTOPLAY_RESUME_DELAY } from "./howItWorksData";

interface OrchestratorState {
  activeStep: number; // 0-3
  isPlaying: boolean;
  progress: number; // 0-1 within current step
}

export function useDemoOrchestrator(isVisible: boolean, reducedMotion: boolean) {
  const [state, setState] = useState<OrchestratorState>({
    activeStep: 0,
    isPlaying: false,
    progress: 0,
  });

  const startTimeRef = useRef(0);
  const rafRef = useRef<number>(0);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDuration = useCallback((step: number) => {
    return STEP_DURATIONS[step] || 3000;
  }, []);

  // Animation loop
  const tick = useCallback(() => {
    const now = performance.now();
    const elapsed = now - startTimeRef.current;
    const duration = getDuration(state.activeStep);
    const progress = Math.min(elapsed / duration, 1);

    if (progress >= 1) {
      // Advance to next step
      const nextStep = (state.activeStep + 1) % 4;
      startTimeRef.current = now;
      setState((s) => ({ ...s, activeStep: nextStep, progress: 0 }));
    } else {
      setState((s) => ({ ...s, progress }));
    }

    if (state.isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [state.activeStep, state.isPlaying, getDuration]);

  // Start/stop animation loop
  useEffect(() => {
    if (state.isPlaying && isVisible && !reducedMotion) {
      startTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [state.isPlaying, isVisible, reducedMotion, tick]);

  // Auto-start when visible
  useEffect(() => {
    if (isVisible && !reducedMotion && !state.isPlaying) {
      const timeout = setTimeout(() => {
        setState((s) => ({ ...s, isPlaying: true }));
      }, 400);
      return () => clearTimeout(timeout);
    }
    if (!isVisible && state.isPlaying) {
      setState((s) => ({ ...s, isPlaying: false }));
    }
  }, [isVisible, reducedMotion]);

  const goToStep = useCallback((step: number) => {
    cancelAnimationFrame(rafRef.current);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);

    setState({ activeStep: step, isPlaying: false, progress: 0 });

    // Resume auto-play after inactivity
    resumeTimerRef.current = setTimeout(() => {
      startTimeRef.current = performance.now();
      setState((s) => ({ ...s, isPlaying: true }));
    }, AUTOPLAY_RESUME_DELAY);
  }, []);

  const togglePlay = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setState((s) => {
      if (!s.isPlaying) startTimeRef.current = performance.now();
      return { ...s, isPlaying: !s.isPlaying };
    });
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  // Total progress across all 4 steps (0-1)
  const totalDuration = STEP_DURATIONS.reduce((a, b) => a + b, 0);
  const elapsedBefore = STEP_DURATIONS.slice(0, state.activeStep).reduce((a, b) => a + b, 0);
  const totalProgress = (elapsedBefore + state.progress * getDuration(state.activeStep)) / totalDuration;

  return {
    activeStep: state.activeStep,
    isPlaying: state.isPlaying,
    stepProgress: state.progress,
    totalProgress,
    goToStep,
    togglePlay,
  };
}
