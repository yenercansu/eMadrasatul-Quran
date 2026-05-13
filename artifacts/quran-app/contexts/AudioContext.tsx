import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuran } from "./QuranContext";
import { getAyahCount, getNextAyah, isRangeEnd } from "@/constants/surahData";
import { getAudioUrl as getAudioUrlFromService } from "@/services/quranApi";
import {
  createAyahPlaybackPlan,
  createRangePlaybackPlan,
  createSectionPlaybackPlan,
  createUstadhPlaybackPlan,
  type PlaybackPlan,
} from "@/services/playbackPlanner";

export const RECENT_RECITERS_KEY = "@squran/recent-reciters";

export interface Reciter {
  id: string;
  name: string;
  style: string;
}

export const RECITERS: Reciter[] = [
  { id: "7", name: "Mishary Rashid Alafasy", style: "Murattal" },
  { id: "1", name: "Abdurrahman Al-Sudais", style: "Murattal" },
  { id: "2", name: "Abdul Basit Abdul Samad", style: "Murattal" },
  { id: "3", name: "Mahmoud Khalil Al-Husary", style: "Murattal" },
  { id: "4", name: "Mohamed Siddiq Al-Minshawi", style: "Murattal" },
  { id: "5", name: "Saud Al-Shuraim", style: "Murattal" },
  { id: "6", name: "Abu Bakr Al-Shatri", style: "Murattal" },
];

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
  playPlan: (plan: PlaybackPlan) => Promise<void>;
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
  const repeatCountRef = useRef<number>(1);
  const currentRepeatRef = useRef<number>(0);
  const rangeRef = useRef<AyahRange | null>(null);
  const rangeRepeatRef = useRef<number>(1);
  const rangeCurrentRepeatRef = useRef<number>(0);
  const playbackRateRef = useRef<number>(1.0);
  // Word-segment playback (single ayah, sub-range of words)
  const segmentRef = useRef<AyahSegment | null>(null);
  const segmentStartMsRef = useRef<number>(0);
  const segmentEndMsRef = useRef<number | null>(null);
  const segmentSeekedRef = useRef<boolean>(false);
  const segmentFinishedRef = useRef<boolean>(false);
  const onNextAyahRef = useRef<((surahNum: number, ayahNum: number) => void) | null>(null);
  const [onNextAyah, setOnNextAyahState] = useState<((surahNum: number, ayahNum: number) => void) | null>(null);
  const onPlanFinishRef = useRef<((surahNum: number, ayahNum: number) => void) | null>(null);
  const planRef = useRef<PlaybackPlan | null>(null);
  const planStepIndexRef = useRef(0);
  const planStepRepeatRef = useRef(0);
  const planStepFinishedRef = useRef(false);
  const planAdvancingRef = useRef(false);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setOnNextAyah = useCallback((fn: ((surahNum: number, ayahNum: number) => void) | null) => {
    onNextAyahRef.current = fn;
    setOnNextAyahState(() => fn);
  }, []);

  const setOnPlanFinish = useCallback((fn: ((surahNum: number, ayahNum: number) => void) | null) => {
    onPlanFinishRef.current = fn;
  }, []);

  const clearPauseTimeout = useCallback(() => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
  }, []);

  const finishPlaybackPlan = useCallback(async () => {
    const finishedPlan = planRef.current;
    const lastStep = finishedPlan?.steps[planStepIndexRef.current];
    planRef.current = null;
    planStepIndexRef.current = 0;
    planStepRepeatRef.current = 0;
    planStepFinishedRef.current = false;
    planAdvancingRef.current = false;
    clearPauseTimeout();
    setAudioState((prev) => ({ ...prev, isPlaying: false, isLoading: false, currentRepeat: 0, range: null, planMode: null }));
    rangeRef.current = null;

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

    clearPauseTimeout();
    planStepIndexRef.current = index;
    planStepRepeatRef.current = 0;
    planStepFinishedRef.current = false;
    planAdvancingRef.current = false;
    segmentRef.current = null;

    setAudioState((prev) => ({
      ...prev,
      isLoading: true,
      isPlaying: false,
      currentSurah: step.surahNumber,
      currentAyah: step.ayahNumber,
      repeatCount: step.repeatCount,
      currentRepeat: 0,
      playbackRate: step.playbackRate,
      range: plan.mode === "range" ? prev.range : null,
      planMode: plan.mode,
    }));

    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: step.sourceUri },
      {
        shouldPlay: false,
        rate: step.playbackRate,
        pitchCorrectionQuality: Audio.PitchCorrectionQuality.High,
        progressUpdateIntervalMillis: step.endMs !== undefined ? 40 : 250,
        positionMillis: step.startMs ?? 0,
      },
      (status) => {
        if (!status.isLoaded) return;
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

        if (nextRepeat < activeStep.repeatCount) {
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

    soundRef.current = sound;
    repeatCountRef.current = step.repeatCount;
    currentRepeatRef.current = 0;
    playbackRateRef.current = step.playbackRate;
    if (step.startMs !== undefined) await sound.setPositionAsync(step.startMs).catch(() => {});
    await sound.playAsync();
    setAudioState((prev) => ({ ...prev, isLoading: false, isPlaying: true }));
  }, [clearPauseTimeout, finishPlaybackPlan]);

  const playPlan = useCallback(async (plan: PlaybackPlan) => {
    if (plan.steps.length === 0) return;
    planRef.current = plan;
    await playPlanStep(0);
  }, [playPlanStep]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  const loadAndPlay = useCallback(async (
    surahNum: number,
    ayahNum: number,
    repeatCount: number,
    range: AyahRange | null,
  ) => {
    try {
      setAudioState((prev) => ({ ...prev, isLoading: true }));

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const url = await getAudioUrlFromService(surahNum, ayahNum, settings.selectedReciter);
      const rate = playbackRateRef.current;

      // Track recently used reciters (fire-and-forget, max 3 entries)
      AsyncStorage.getItem(RECENT_RECITERS_KEY).then((v) => {
        const prev: string[] = v ? JSON.parse(v) : [];
        const next = [settings.selectedReciter, ...prev.filter(id => id !== settings.selectedReciter)].slice(0, 3);
        AsyncStorage.setItem(RECENT_RECITERS_KEY, JSON.stringify(next));
      }).catch(() => {});

      // Reset segment state for this load
      segmentSeekedRef.current = false;
      segmentFinishedRef.current = false;
      segmentEndMsRef.current = null;
      segmentStartMsRef.current = 0;

      const hasSeg = !!segmentRef.current;

      // For segments: resolve duration as soon as the first status callback
      // reports it. Audio starts playing immediately (shouldPlay: true) so
      // expo-av buffers the file on all platforms, including web.
      let resolveDuration: ((ms: number) => void) | null = null;
      const durationPromise: Promise<number> | null = hasSeg
        ? new Promise(res => { resolveDuration = res; })
        : null;

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        {
          shouldPlay: true,
          rate,
          pitchCorrectionQuality: Audio.PitchCorrectionQuality.High,
          progressUpdateIntervalMillis: hasSeg ? 40 : 250,
        },
        (status) => {
          if (!status.isLoaded) return;
          setAudioState((prev) => ({
            ...prev,
            isPlaying: status.isPlaying,
            duration: status.durationMillis ?? 0,
            position: status.positionMillis ?? 0,
          }));

          // Signal duration availability so the segment setup below can proceed.
          if (resolveDuration && (status.durationMillis ?? 0) > 0) {
            resolveDuration(status.durationMillis!);
            resolveDuration = null;
          }

          if (segmentRef.current) {
            // Start boundary is resolved eagerly below; only detect end here.
            if (!segmentSeekedRef.current || !status.isPlaying) return;
            const endMs = segmentEndMsRef.current;
            const cur = status.positionMillis ?? 0;
            if (endMs !== null && cur >= endMs && !segmentFinishedRef.current) {
              segmentFinishedRef.current = true;
              const nextRepeat = currentRepeatRef.current + 1;
              if (nextRepeat < repeatCountRef.current) {
                currentRepeatRef.current = nextRepeat;
                setAudioState((prev) => ({ ...prev, currentRepeat: nextRepeat }));
                soundRef.current?.setPositionAsync(segmentStartMsRef.current).then(() => {
                  segmentFinishedRef.current = false;
                  soundRef.current?.playAsync();
                }).catch(() => {});
              } else {
                currentRepeatRef.current = 0;
                segmentRef.current = null;
                segmentEndMsRef.current = null;
                soundRef.current?.pauseAsync().catch(() => {});
                setAudioState((prev) => ({ ...prev, isPlaying: false, currentRepeat: 0 }));
              }
            }
            return;
          }

          if (status.didJustFinish) {
            const nextRepeat = currentRepeatRef.current + 1;
            if (nextRepeat < repeatCountRef.current) {
              currentRepeatRef.current = nextRepeat;
              setAudioState((prev) => ({ ...prev, currentRepeat: nextRepeat }));
              sound.replayAsync();
            } else {
              currentRepeatRef.current = 0;
              setAudioState((prev) => ({ ...prev, isPlaying: false, currentRepeat: 0 }));
              // Determine next ayah
              const currentRange = rangeRef.current;
              if (currentRange) {
                if (isRangeEnd(surahNum, ayahNum, currentRange.endSurah, currentRange.endAyah)) {
                  const nextRangeRepeat = rangeCurrentRepeatRef.current + 1;
                  if (nextRangeRepeat < rangeRepeatRef.current) {
                    rangeCurrentRepeatRef.current = nextRangeRepeat;
                    // Restart range from beginning
                    if (onNextAyahRef.current) {
                      onNextAyahRef.current(currentRange.startSurah, currentRange.startAyah);
                    }
                  } else {
                    rangeCurrentRepeatRef.current = 0;
                    setAudioState((prev) => ({ ...prev, range: null }));
                    rangeRef.current = null;
                  }
                } else {
                  const next = getNextAyah(surahNum, ayahNum);
                  if (next && onNextAyahRef.current) {
                    onNextAyahRef.current(next.surah, next.ayah);
                  }
                }
              } else {
                const totalAyahs = getAyahCount(surahNum) || totalAyahsRef.current;
                if (ayahNum < totalAyahs && onNextAyahRef.current) {
                  onNextAyahRef.current(surahNum, ayahNum + 1);
                }
              }
            }
          }
        }
      );

      soundRef.current = sound;
      repeatCountRef.current = repeatCount;
      currentRepeatRef.current = 0;

      // For segment playback: wait for the duration (signalled by the status
      // callback above), then seek to the start word. Audio is already playing
      // so expo-av is definitely buffering on all platforms.
      if (hasSeg && durationPromise && segmentRef.current) {
        const seg = segmentRef.current;
        const dur = await Promise.race([
          durationPromise,
          new Promise<number>(r => setTimeout(() => r(0), 5000)),
        ]);
        if (dur > 0) {
          const total = Math.max(1, seg.totalWords);
          segmentStartMsRef.current = Math.floor(dur * seg.startWordIdx / total);
          segmentEndMsRef.current = Math.floor(dur * (seg.endWordIdx + 1) / total);
          if (segmentStartMsRef.current > 0) {
            await sound.setPositionAsync(segmentStartMsRef.current);
          }
        }
        segmentSeekedRef.current = true;
        // Audio is already playing — no playAsync() needed here.
      }

      setAudioState((prev) => ({
        ...prev,
        isLoading: false,
        isPlaying: true,
        currentAyah: ayahNum,
        currentSurah: surahNum,
        repeatCount,
        currentRepeat: 0,
        range: range ?? prev.range,
      }));
    } catch {
      setAudioState((prev) => ({ ...prev, isLoading: false, isPlaying: false }));
    }
  }, [settings.selectedReciter]);

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
    segmentRef.current = null;
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
    segmentRef.current = null;
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
    segmentRef.current = null;
    const plan = await createUstadhPlaybackPlan({
      surahNumber: surahNum,
      reciterId: Number(settings.selectedReciter) || 7,
      ayahs,
      mode: "new",
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
    if (soundRef.current) {
      await soundRef.current.playAsync();
      setAudioState((prev) => ({ ...prev, isPlaying: true }));
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
    rangeRef.current = null;
    rangeRepeatRef.current = 1;
    rangeCurrentRepeatRef.current = 0;
    segmentRef.current = null;
    segmentEndMsRef.current = null;
    segmentSeekedRef.current = false;
    segmentFinishedRef.current = false;
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
        await soundRef.current.setRateAsync(rate, true);
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
      playSection, playUstadhMode,
      pauseAudio, resumeAudio, stopAudio,
      seekTo, setPlaybackRate,
      playNextAyah, playPrevAyah,
      onNextAyah, setOnNextAyah, setOnPlanFinish,
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
