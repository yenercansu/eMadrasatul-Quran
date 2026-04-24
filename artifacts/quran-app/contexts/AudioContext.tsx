import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { Audio } from "expo-av";
import { useQuran } from "./QuranContext";
import { getAyahCount, getNextAyah, isRangeEnd } from "@/constants/surahData";

export interface Reciter {
  id: string;
  name: string;
  style: string;
}

export const RECITERS: Reciter[] = [
  { id: "ar.alafasy", name: "Mishary Alafasy", style: "Murattal" },
  { id: "ar.abdurrahmaansudais", name: "Abdurrahman Al-Sudais", style: "Murattal" },
  { id: "ar.husary", name: "Mahmoud Khalil Al-Husary", style: "Murattal" },
  { id: "ar.minshawi", name: "Mohamed Siddiq Al-Minshawi", style: "Murattal" },
  { id: "ar.saoodashuraimee", name: "Saud Al-Shuraim", style: "Murattal" },
  { id: "ar.muhammadayyoob", name: "Muhammad Ayyoob", style: "Murattal" },
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
}

interface AudioContextType {
  audioState: AudioState;
  playAyah: (surahNum: number, ayahNum: number, totalAyahs: number, repeatCount?: number) => Promise<void>;
  playRange: (range: AyahRange, repeatCount: number) => Promise<void>;
  pauseAudio: () => Promise<void>;
  resumeAudio: () => Promise<void>;
  stopAudio: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  playNextAyah: () => void;
  playPrevAyah: () => void;
  onNextAyah: ((surahNum: number, ayahNum: number) => void) | null;
  setOnNextAyah: (fn: ((surahNum: number, ayahNum: number) => void) | null) => void;
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
  });
  const soundRef = useRef<Audio.Sound | null>(null);
  const totalAyahsRef = useRef<number>(0);
  const repeatCountRef = useRef<number>(1);
  const currentRepeatRef = useRef<number>(0);
  const rangeRef = useRef<AyahRange | null>(null);
  const rangeRepeatRef = useRef<number>(1);
  const rangeCurrentRepeatRef = useRef<number>(0);
  const playbackRateRef = useRef<number>(1.0);
  const onNextAyahRef = useRef<((surahNum: number, ayahNum: number) => void) | null>(null);
  const [onNextAyah, setOnNextAyahState] = useState<((surahNum: number, ayahNum: number) => void) | null>(null);

  const setOnNextAyah = useCallback((fn: ((surahNum: number, ayahNum: number) => void) | null) => {
    onNextAyahRef.current = fn;
    setOnNextAyahState(() => fn);
  }, []);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  const getAudioUrl = (surahNum: number, ayahNum: number, reciterId: string): string => {
    const s = String(surahNum).padStart(3, "0");
    const a = String(ayahNum).padStart(3, "0");
    return `https://cdn.islamic.network/quran/audio/128/${reciterId}/${s}${a}.mp3`;
  };

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

      const url = getAudioUrl(surahNum, ayahNum, settings.selectedReciter);
      const rate = playbackRateRef.current;

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, rate, pitchCorrectionQuality: Audio.PitchCorrectionQuality.High },
        (status) => {
          if (!status.isLoaded) return;
          setAudioState((prev) => ({
            ...prev,
            isPlaying: status.isPlaying,
            duration: status.durationMillis ?? 0,
            position: status.positionMillis ?? 0,
          }));
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

  const playAyah = useCallback(async (surahNum: number, ayahNum: number, totalAyahs: number, repeatCount = 1) => {
    totalAyahsRef.current = totalAyahs;
    rangeRef.current = null;
    rangeRepeatRef.current = 1;
    rangeCurrentRepeatRef.current = 0;
    setAudioState((prev) => ({ ...prev, range: null }));
    await loadAndPlay(surahNum, ayahNum, repeatCount, null);
  }, [loadAndPlay]);

  const playRange = useCallback(async (range: AyahRange, repeatCount: number) => {
    rangeRef.current = range;
    rangeRepeatRef.current = repeatCount;
    rangeCurrentRepeatRef.current = 0;
    setAudioState((prev) => ({ ...prev, range }));
    await loadAndPlay(range.startSurah, range.startAyah, 1, range);
  }, [loadAndPlay]);

  const pauseAudio = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
      setAudioState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const resumeAudio = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.playAsync();
      setAudioState((prev) => ({ ...prev, isPlaying: true }));
    }
  }, []);

  const stopAudio = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
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
    }));
  }, []);

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
      audioState, playAyah, playRange,
      pauseAudio, resumeAudio, stopAudio,
      seekTo, setPlaybackRate,
      playNextAyah, playPrevAyah,
      onNextAyah, setOnNextAyah,
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
