import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuran } from "./QuranContext";
import { getAyahCount, getNextAyah, isRangeEnd } from "@/constants/surahData";
import {
  createAyahPlaybackPlan,
  createRangePlaybackPlan,
  createSectionPlaybackPlan,
  createUstadhPlaybackPlan,
  createWordByWordRangePlaybackPlan,
  type PlaybackPlan,
} from "@/services/playbackPlanner";

export const RECENT_RECITERS_KEY = "@squran/recent-reciters";
const USTADH_PROGRESS_KEY = "@squran/ustadh-progress";

export interface Reciter {
  id: string;
  name: string;
  style: string;
}

export const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export interface AyahRange {
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
}

interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  currentAyah: number | null;
  currentSurah: number | null;
  duration: number;
  position: number;
  repeatCount: number;
  currentRepeat: number;
  playbackRate: number;
  range: AyahRange | null;
  planMode: "ayah" | "section" | "word" | "range" | "ustadh" | null;
}

export interface AyahSegment {
  startWordIdx: number;
  endWordIdx: number;
  totalWords: number;
}

interface AudioContextType {
  audioState: AudioState;
  playPlan: (plan: PlaybackPlan, startIndex?: number) => Promise<void>;
  playAyah: (
    surahNum: number,
    ayahNum: number,
    totalAyahs: number,
    repeatCount?: number,
    segment?: AyahSegment | null,
  ) => Promise<void>;
  playRange: (range: AyahRange, ayahRepeat: number, setRepeat?: number) => Promise<void>;
  playSection: (
    surahNum: number,
    ayahNum: number,
    startWord: number,
    endWord: number,
    repeatCount: number,
  ) => Promise<void>;
  playUstadhMode: (surahNum: number, ayahs: number[]) => Promise<void>;
  playWordByWord: (surahNum: number, startAyah: number, endAyah: number, wordRepeat: number) => Promise<void>;
  pauseAudio: () => Promise<void>;
  resumeAudio: () => Promise<void>;
  stopAudio: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  playNextAyah: () => void;
  playPrevAyah: () => void;
  onNextAyah: ((surahNum: number, ayahNum: number) => void) | null;
  setOnNextAyah: (fn: ((surahNum: number, ayahNum: number) => void) | null) => void;
  setOnPlanFinish: (fn: ((surahNum: number, ayahNum: number) => void) | null) => void;
  setLiveRepeatCount: (count: number | null) => void;
  setLiveRangeRepeat: (count: number) => void;
  abortCurrentPlan: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useQuran();
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    isLoading: false,
    currentAyah: null,
    currentSurah: null,
    duration: 0,
    position: 0,
    repeatCount: 1,
    currentRepeat: 0,
    playbackRate: 1.0,
    range: null,
    planMode: null,
  });
  const soundRef = useRef<Audio.Sound | null>(null);
  const totalAyahsRef = useRef<number>(0);
  const rangeRef = useRef<AyahRange | null>(null);
  const rangeRepeatRef = useRef<number>(1);
  const rangeCurrentRepeatRef = useRef<number>(0);
  const playbackRateRef = useRef<number>(1.0);
  const onNextAyahRef = useRef<((surahNum: number, ayahNum: number) => void) | null>(null);
  const [onNextAyah, setOnNextAyahState] = useState<((surahNum: number, ayahNum: number) => void) | null>(null);
  const onPlanFinishRef = useRef<((surahNum: number, ayahNum: number) => void) | null>(null);
  const planRef = useRef<PlaybackPlan | null>(null);
  const planStepIndexRef = useRef(0);
  const planStepRepeatRef = useRef(0);
  const planStepFinishedRef = useRef(false);
  const planAdvancingRef = useRef(false);
  const planRunIdRef = useRef(0);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveRepeatCountRef = useRef<number | null>(null);

  const setOnNextAyah = useCallback((fn: ((surahNum: number, ayahNum: number) => void) | null) => {
    onNextAyahRef.current = fn;
    setOnNextAyahState(() => fn);
  }, []);

  const setOnPlanFinish = useCallback((fn: ((surahNum: number, ayahNum: number) => void) | null) => {
    onPlanFinishRef.current = fn;
  }, []);

  const setLiveRepeatCount = useCallback((count: number | null) => {
    liveRepeatCountRef.current = count;
  }, []);

  const setLiveRangeRepeat = useCallback((count: number) => {
    rangeRepeatRef.current = count;
  }, []);

  const clearPauseTimeout = useCallback(() => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
  }, []);

  // Immediately kills the current sound and clears plan state so a new plan
  // can start without waiting for the current audio to finish naturally.
  const abortCurrentPlan = useCallback(() => {
    clearPauseTimeout();
    const s = soundRef.current;
    planRunIdRef.current += 1;
    soundRef.current = null;
    planRef.current = null;
    planStepIndexRef.current = 0;
    planStepRepeatRef.current = 0;
    planAdvancingRef.current = true;
    planStepFinishedRef.current = false;
    liveRepeatCountRef.current = null;
    rangeRef.current = null;
    s?.stopAsync().catch(() => {}).finally(() => s?.unloadAsync().catch(() => {}));
    setAudioState(prev => ({ ...prev, isPlaying: false, isLoading: false, range: null, planMode: null }));
  }, [clearPauseTimeout]);

  const finishPlaybackPlan = useCallback(async () => {
    const finishedPlan = planRef.current;
    const lastStep = finishedPlan?.steps[planStepIndexRef.current];
    planRef.current = null;
    planStepIndexRef.current = 0;
    planStepRepeatRef.current = 0;
    planStepFinishedRef.current = false;
    planAdvancingRef.current = false;
    liveRepeatCountRef.current = null;
    clearPauseTimeout();
    setAudioState((prev) => ({ ...prev, isPlaying: false, isLoading: false, currentRepeat: 0, range: null, planMode: null }));
    rangeRef.current = null;
    if (finishedPlan?.mode === "ustadh") {
      AsyncStorage.removeItem(USTADH_PROGRESS_KEY).catch(() => {});
    }

    if (finishedPlan?.mode === "ayah" && lastStep && onNextAyahRef.current) {
      const totalAyahs = getAyahCount(lastStep.surahNumber) || totalAyahsRef.current;
      if (lastStep.ayahNumber < totalAyahs) onNextAyahRef.current(lastStep.surahNumber, lastStep.ayahNumber + 1);
    }
    if (lastStep && onPlanFinishRef.current) {
      onPlanFinishRef.current(lastStep.surahNumber, lastStep.ayahNumber);
    }
  }, [clearPauseTimeout]);

  const playPlanStep = useCallback(async (index: number): Promise<void> => {
    const plan = planRef.current;
    const step = plan?.steps[index];
    if (!plan || !step) {
      await finishPlaybackPlan();
      return;
    }
    const runId = planRunIdRef.current;

    clearPauseTimeout();
    const effectiveRate = playbackRateRef.current || step.playbackRate || 1;
    planStepIndexRef.current = index;
    planStepRepeatRef.current = 0;
    planStepFinishedRef.current = false;
    planAdvancingRef.current = false;

    setAudioState((prev) => ({
      ...prev,
      isLoading: true,
      isPlaying: false,
      currentSurah: step.surahNumber,
      currentAyah: step.ayahNumber,
      repeatCount: step.repeatCount,
      currentRepeat: 0,
      playbackRate: effectiveRate,
      range: plan.mode === "range" ? prev.range : null,
      planMode: plan.mode,
    }));
    if (plan.mode === "ustadh") {
      AsyncStorage.setItem(USTADH_PROGRESS_KEY, JSON.stringify({
        planId: plan.id,
        stepIndex: index,
        totalSteps: plan.steps.length,
        surahNumber: step.surahNumber,
        ayahNumber: step.ayahNumber,
        verseKey: step.verseKey,
        stepId: step.id,
        updatedAt: Date.now(),
      })).catch(() => {});
    }

    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: step.sourceUri },
      {
        shouldPlay: false,
        rate: effectiveRate,
        pitchCorrectionQuality: Audio.PitchCorrectionQuality.High,
        progressUpdateIntervalMillis: step.endMs !== undefined ? 40 : 250,
        positionMillis: step.startMs ?? 0,
      },
      (status) => {
        if (!status.isLoaded) return;
        if (runId !== planRunIdRef.current) return;
        setAudioState((prev) => ({
          ...prev,
          isPlaying: status.isPlaying,
          duration: status.durationMillis ?? 0,
          position: status.positionMillis ?? 0,
        }));

        const activePlan = planRef.current;
        const activeStep = activePlan?.steps[planStepIndexRef.current];
        if (!activeStep || planAdvancingRef.current) return;

        const hitSegmentEnd =
          activeStep.endMs !== undefined &&
          status.isPlaying &&
          (status.positionMillis ?? 0) >= activeStep.endMs;
        const hitFileEnd = !!status.didJustFinish;
        if (!hitSegmentEnd && !hitFileEnd) return;

        planAdvancingRef.current = true;
        planStepFinishedRef.current = true;
        const nextRepeat = planStepRepeatRef.current + 1;
        const startMs = activeStep.startMs ?? 0;

        const continueAfterPause = () => {
          if (runId !== planRunIdRef.current) return;
          const nextIndex = planStepIndexRef.current + 1;
          if (nextIndex < (planRef.current?.steps.length ?? 0)) {
            playPlanStep(nextIndex).catch(() => finishPlaybackPlan());
          } else {
            const nextRangeRepeat = rangeCurrentRepeatRef.current + 1;
            if (planRef.current?.mode === "range" && nextRangeRepeat < rangeRepeatRef.current) {
              rangeCurrentRepeatRef.current = nextRangeRepeat;
              playPlanStep(0).catch(() => finishPlaybackPlan());
            } else {
              finishPlaybackPlan().catch(() => {});
            }
          }
        };

        const effectiveRepeatCount = liveRepeatCountRef.current ?? activeStep.repeatCount;
        if (nextRepeat < effectiveRepeatCount) {
          planStepRepeatRef.current = nextRepeat;
          setAudioState((prev) => ({ ...prev, currentRepeat: nextRepeat }));
          soundRef.current?.setPositionAsync(startMs)
            .then(() => {
              planAdvancingRef.current = false;
              planStepFinishedRef.current = false;
              return soundRef.current?.playAsync();
            })
            .catch(() => continueAfterPause());
          return;
        }

        if (activeStep.pauseAfterMs && activeStep.pauseAfterMs > 0) {
          soundRef.current?.pauseAsync().catch(() => {});
          pauseTimeoutRef.current = setTimeout(continueAfterPause, activeStep.pauseAfterMs);
        } else {
          continueAfterPause();
        }
      },
    );

    if (runId !== planRunIdRef.current) {
      await sound.unloadAsync().catch(() => {});
      return;
    }
    soundRef.current = sound;
    await sound.setRateAsync(effectiveRate, true, Audio.PitchCorrectionQuality.High).catch(() => {});
    if (step.startMs !== undefined) await sound.setPositionAsync(step.startMs).catch(() => {});
    await sound.playAsync();
    setAudioState((prev) => ({ ...prev, isLoading: false, isPlaying: true }));
  }, [clearPauseTimeout, finishPlaybackPlan]);

  const playPlan = useCallback(async (plan: PlaybackPlan, startIndex = 0) => {
    if (plan.steps.length === 0) return;
    abortCurrentPlan();
    liveRepeatCountRef.current = null;
    planRunIdRef.current += 1;
    planRef.current = plan;
    planStepIndexRef.current = 0;
    planStepRepeatRef.current = 0;
    planStepFinishedRef.current = false;
    planAdvancingRef.current = false;
    await playPlanStep(Math.max(0, Math.min(startIndex, plan.steps.length - 1)));
  }, [abortCurrentPlan, playPlanStep]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  const playAyah = useCallback(async (
    surahNum: number,
    ayahNum: number,
    totalAyahs: number,
    repeatCount = 1,
    segment: AyahSegment | null = null,
  ) => {
    totalAyahsRef.current = totalAyahs;
    rangeRef.current = null;
    rangeRepeatRef.current = 1;
    rangeCurrentRepeatRef.current = 0;
    setAudioState((prev) => ({ ...prev, range: null }));
    const reciterId = Number(settings.selectedReciter) || 7;
    const plan = segment
      ? await createSectionPlaybackPlan({
          surahNumber: surahNum,
          ayahNumber: ayahNum,
          reciterId,
          startWord: segment.startWordIdx + 1,
          endWord: segment.endWordIdx + 1,
          repeatCount,
          playbackRate: playbackRateRef.current,
        })
      : await createAyahPlaybackPlan({
          surahNumber: surahNum,
          ayahNumber: ayahNum,
          reciterId,
          repeatCount,
          playbackRate: playbackRateRef.current,
        });
    await playPlan(plan);
  }, [playPlan, settings.selectedReciter]);

  const playRange = useCallback(async (range: AyahRange, ayahRepeat: number, setRepeat = 1) => {
    rangeRef.current = range;
    rangeRepeatRef.current = setRepeat;
    rangeCurrentRepeatRef.current = 0;
    setAudioState((prev) => ({ ...prev, range }));
    const reciterId = Number(settings.selectedReciter) || 7;
    const plan = await createRangePlaybackPlan({
      surahNumber: range.startSurah,
      reciterId,
      startAyah: range.startAyah,
      endAyah: range.endAyah,
      repeatCount: ayahRepeat,
      playbackRate: playbackRateRef.current,
    });
    await playPlan(plan);
  }, [playPlan, settings.selectedReciter]);

  const playSection = useCallback(async (
    surahNum: number,
    ayahNum: number,
    startWord: number,
    endWord: number,
    repeatCount: number,
  ) => {
    rangeRef.current = null;
    const plan = await createSectionPlaybackPlan({
      surahNumber: surahNum,
      ayahNumber: ayahNum,
      reciterId: Number(settings.selectedReciter) || 7,
      startWord,
      endWord,
      repeatCount,
      playbackRate: playbackRateRef.current,
    });
    await playPlan(plan);
  }, [playPlan, settings.selectedReciter]);

  const playUstadhMode = useCallback(async (surahNum: number, ayahs: number[]) => {
    rangeRef.current = null;
    await AsyncStorage.removeItem(USTADH_PROGRESS_KEY).catch(() => {});
    const plan = await createUstadhPlaybackPlan({
      surahNumber: surahNum,
      reciterId: Number(settings.selectedReciter) || 7,
      ayahs,
      mode: "new",
      playbackRate: playbackRateRef.current,
    });
    await playPlan(plan, 0);
  }, [playPlan, settings.selectedReciter]);

  const playWordByWord = useCallback(async (surahNum: number, startAyah: number, endAyah: number, wordRepeat: number) => {
    rangeRef.current = null;
    const plan = await createWordByWordRangePlaybackPlan({
      surahNumber: surahNum,
      reciterId: Number(settings.selectedReciter) || 7,
      startAyah,
      endAyah,
      wordRepeat,
      playbackRate: playbackRateRef.current,
    });
    await playPlan(plan);
  }, [playPlan, settings.selectedReciter]);

  const pauseAudio = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
      setAudioState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  // ───────── Auto-pause sleep timer ─────────
  // Uses an absolute deadline (Date.now() + mins) so the countdown is NOT reset
  // by ayah-to-ayah auto-advance (which momentarily flips isPlaying false→true).
  const sleepDeadlineRef = useRef<number | null>(null);
  const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (sleepIntervalRef.current) {
      clearInterval(sleepIntervalRef.current);
      sleepIntervalRef.current = null;
    }
    const mins = settings.autoPauseMinutes;
    if (!mins || mins <= 0) {
      sleepDeadlineRef.current = null;
      return;
    }
    // (Re)start countdown whenever the user picks a new duration.
    sleepDeadlineRef.current = Date.now() + mins * 60 * 1000;
    sleepIntervalRef.current = setInterval(() => {
      if (sleepDeadlineRef.current && Date.now() >= sleepDeadlineRef.current) {
        pauseAudio().catch(() => {});
        sleepDeadlineRef.current = null;
        if (sleepIntervalRef.current) {
          clearInterval(sleepIntervalRef.current);
          sleepIntervalRef.current = null;
        }
      }
    }, 5000);
    return () => {
      if (sleepIntervalRef.current) {
        clearInterval(sleepIntervalRef.current);
        sleepIntervalRef.current = null;
      }
    };
  }, [settings.autoPauseMinutes, pauseAudio]);

  const resumeAudio = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      await sound.setRateAsync(
        playbackRateRef.current,
        true,
        Audio.PitchCorrectionQuality.High,
      ).catch(() => {});
      await sound.playAsync();
      setAudioState((prev) => ({ ...prev, isPlaying: true }));
    } catch {
      if (soundRef.current === sound) soundRef.current = null;
      await sound.unloadAsync().catch(() => {});
      setAudioState((prev) => ({ ...prev, isPlaying: false, isLoading: false }));
    }
  }, []);

  const stopAudio = useCallback(async () => {
    clearPauseTimeout();
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    planRef.current = null;
    planStepIndexRef.current = 0;
    planStepRepeatRef.current = 0;
    planStepFinishedRef.current = false;
    planAdvancingRef.current = false;
    liveRepeatCountRef.current = null;
    rangeRef.current = null;
    rangeRepeatRef.current = 1;
    rangeCurrentRepeatRef.current = 0;
    setAudioState((prev) => ({
      ...prev,
      isPlaying: false,
      currentAyah: null,
      currentSurah: null,
      position: 0,
      range: null,
      planMode: null,
    }));
  }, [clearPauseTimeout]);

  const seekTo = useCallback(async (position: number) => {
    if (soundRef.current) await soundRef.current.setPositionAsync(position);
  }, []);

  const setPlaybackRate = useCallback(async (rate: number) => {
    playbackRateRef.current = rate;
    setAudioState((prev) => ({ ...prev, playbackRate: rate }));
    if (soundRef.current) {
      try {
        await soundRef.current.setRateAsync(rate, true, Audio.PitchCorrectionQuality.High);
      } catch {}
    }
  }, []);

  const playNextAyah = useCallback(() => {
    const { currentAyah, currentSurah } = audioState;
    if (currentAyah && currentSurah && onNextAyahRef.current) {
      const range = rangeRef.current;
      if (range && isRangeEnd(currentSurah, currentAyah, range.endSurah, range.endAyah)) return;
      const next = range
        ? getNextAyah(currentSurah, currentAyah)
        : currentAyah < (getAyahCount(currentSurah) || totalAyahsRef.current)
          ? { surah: currentSurah, ayah: currentAyah + 1 }
          : null;
      if (next) onNextAyahRef.current(next.surah, next.ayah);
    }
  }, [audioState]);

  const playPrevAyah = useCallback(() => {
    const { currentAyah, currentSurah } = audioState;
    if (currentAyah && currentSurah && onNextAyahRef.current) {
      const range = rangeRef.current;
      if (range && currentSurah === range.startSurah && currentAyah === range.startAyah) return;
      if (currentAyah > 1) {
        onNextAyahRef.current(currentSurah, currentAyah - 1);
      } else if (currentSurah > 1) {
        const prevCount = getAyahCount(currentSurah - 1);
        if (prevCount > 0) onNextAyahRef.current(currentSurah - 1, prevCount);
      }
    }
  }, [audioState]);

  return (
    <AudioContext.Provider value={{
      audioState, playPlan, playAyah, playRange,
      playSection, playUstadhMode, playWordByWord,
      pauseAudio, resumeAudio, stopAudio,
      seekTo, setPlaybackRate,
      playNextAyah, playPrevAyah,
      onNextAyah, setOnNextAyah, setOnPlanFinish,
      setLiveRepeatCount, setLiveRangeRepeat, abortCurrentPlan,
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
}
