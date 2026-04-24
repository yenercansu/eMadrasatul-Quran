import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { Audio } from "expo-av";
import { useQuran } from "./QuranContext";

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

interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  currentAyah: number | null;
  currentSurah: number | null;
  duration: number;
  position: number;
  repeatCount: number;
  currentRepeat: number;
}

interface AudioContextType {
  audioState: AudioState;
  playAyah: (surahNum: number, ayahNum: number, totalAyahs: number, repeatCount?: number) => Promise<void>;
  pauseAudio: () => Promise<void>;
  resumeAudio: () => Promise<void>;
  stopAudio: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  playNextAyah: () => void;
  playPrevAyah: () => void;
  onNextAyah: ((surahNum: number, ayahNum: number) => void) | null;
  setOnNextAyah: (fn: ((surahNum: number, ayahNum: number) => void) | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { settings, saveProgress } = useQuran();
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    isLoading: false,
    currentAyah: null,
    currentSurah: null,
    duration: 0,
    position: 0,
    repeatCount: 1,
    currentRepeat: 0,
  });
  const soundRef = useRef<Audio.Sound | null>(null);
  const totalAyahsRef = useRef<number>(0);
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
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const getAudioUrl = (surahNum: number, ayahNum: number, reciterId: string): string => {
    const surahPad = String(surahNum).padStart(3, "0");
    const ayahPad = String(ayahNum).padStart(3, "0");
    return `https://cdn.islamic.network/quran/audio/128/${reciterId}/${surahPad}${ayahPad}.mp3`;
  };

  const playAyah = useCallback(async (surahNum: number, ayahNum: number, totalAyahs: number, repeatCount = 1) => {
    try {
      setAudioState((prev) => ({ ...prev, isLoading: true }));
      totalAyahsRef.current = totalAyahs;

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const reciterId = settings.selectedReciter;
      const url = getAudioUrl(surahNum, ayahNum, reciterId);

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setAudioState((prev) => ({
            ...prev,
            isPlaying: status.isPlaying,
            duration: status.durationMillis ?? 0,
            position: status.positionMillis ?? 0,
          }));
          if (status.didJustFinish) {
            const currentRepeat = audioState.currentRepeat + 1;
            if (currentRepeat < repeatCount) {
              setAudioState((prev) => ({ ...prev, currentRepeat }));
              sound.replayAsync();
            } else {
              setAudioState((prev) => ({ ...prev, isPlaying: false, currentRepeat: 0 }));
              if (ayahNum < totalAyahs && onNextAyahRef.current) {
                onNextAyahRef.current(surahNum, ayahNum + 1);
              }
            }
          }
        }
      );

      soundRef.current = sound;
      setAudioState((prev) => ({
        ...prev,
        isLoading: false,
        isPlaying: true,
        currentAyah: ayahNum,
        currentSurah: surahNum,
        repeatCount,
        currentRepeat: 0,
      }));
    } catch {
      setAudioState((prev) => ({ ...prev, isLoading: false, isPlaying: false }));
    }
  }, [settings.selectedReciter, audioState.currentRepeat]);

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
    setAudioState((prev) => ({
      ...prev,
      isPlaying: false,
      currentAyah: null,
      currentSurah: null,
      position: 0,
    }));
  }, []);

  const seekTo = useCallback(async (position: number) => {
    if (soundRef.current) {
      await soundRef.current.setPositionAsync(position);
    }
  }, []);

  const playNextAyah = useCallback(() => {
    const { currentAyah, currentSurah, repeatCount } = audioState;
    if (currentAyah && currentSurah && onNextAyahRef.current) {
      if (currentAyah < totalAyahsRef.current) {
        onNextAyahRef.current(currentSurah, currentAyah + 1);
      }
    }
  }, [audioState]);

  const playPrevAyah = useCallback(() => {
    const { currentAyah, currentSurah } = audioState;
    if (currentAyah && currentSurah && onNextAyahRef.current) {
      if (currentAyah > 1) {
        onNextAyahRef.current(currentSurah, currentAyah - 1);
      }
    }
  }, [audioState]);

  return (
    <AudioContext.Provider
      value={{
        audioState,
        playAyah,
        pauseAudio,
        resumeAudio,
        stopAudio,
        seekTo,
        playNextAyah,
        playPrevAyah,
        onNextAyah,
        setOnNextAyah,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
}
