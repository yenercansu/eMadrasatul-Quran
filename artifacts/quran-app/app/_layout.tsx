import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { AmiriQuran_400Regular } from "@expo-google-fonts/amiri-quran";
import { Amiri_400Regular } from "@expo-google-fonts/amiri";
import { ScheherazadeNew_400Regular } from "@expo-google-fonts/scheherazade-new";
import { NotoNaskhArabic_400Regular } from "@expo-google-fonts/noto-naskh-arabic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useSegments, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { QuranProvider, useQuran } from "@/contexts/QuranContext";
import { AudioProvider } from "@/contexts/AudioContext";
import { NetworkProvider } from "@/contexts/NetworkContext";
import LogoMark from "@/components/LogoMark";
import { useColors } from "@/hooks/useColors";
import { PersistentCertToast } from "@/components/cert/PersistentCertToast";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function GlobalCertToastLayer() {
  const { pendingCertToast, dismissCertToast, pendingAlreadyCertToast, dismissAlreadyCertToast } = useQuran();
  const insets = useSafeAreaInsets();

  const activeCert = pendingCertToast ?? pendingAlreadyCertToast;
  if (!activeCert) return null;

  const isAlreadyEarned = !pendingCertToast && !!pendingAlreadyCertToast;
  const onDismiss = isAlreadyEarned ? dismissAlreadyCertToast : dismissCertToast;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", top: insets.top + 8, left: 0, right: 0, zIndex: 9999 }}
    >
      <PersistentCertToast cert={activeCert} onDismiss={onDismiss} alreadyEarned={isAlreadyEarned} />
    </View>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="surah/[id]" options={{ headerShown: false, animation: "slide_from_right", gestureEnabled: false }} />
      <Stack.Screen name="oauth/quran-foundation/success" options={{ headerShown: false }} />
      <Stack.Screen name="oauth/quran-foundation/error" options={{ headerShown: false }} />
      <Stack.Screen name="oauth/google/callback" options={{ headerShown: false }} />
      <Stack.Screen name="quiz" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="settings" options={{ headerShown: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="streak-calendar" options={{ headerShown: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="certificate/surah/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="certificate/juz/[juz]" options={{ headerShown: false, animation: "slide_from_right" }} />
    </Stack>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const { isAuthenticated, isBootstrapping } = useAuth();
  const segments = useSegments();
  const firstSegment = String(segments[0] ?? "");
  const isAuthRoute = firstSegment === "auth";
  const isOAuthRoute = firstSegment === "oauth";

  useEffect(() => {
    if (isBootstrapping) return;
    if (!isAuthenticated && !isAuthRoute && !isOAuthRoute) {
      router.replace("/auth" as any);
    } else if (isAuthenticated && isAuthRoute) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isAuthRoute, isBootstrapping, isOAuthRoute]);

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.backgroundPrimary, gap: 24 }}>
        <LogoMark size={80} />
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    AmiriQuran_400Regular,
    Amiri_400Regular,
    ScheherazadeNew_400Regular,
    NotoNaskhArabic_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthGate>
              <NetworkProvider>
                <QuranProvider>
                  <AudioProvider>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <KeyboardProvider>
                        <RootLayoutNav />
                      </KeyboardProvider>
                      <GlobalCertToastLayer />
                    </GestureHandlerRootView>
                  </AudioProvider>
                </QuranProvider>
              </NetworkProvider>
            </AuthGate>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
