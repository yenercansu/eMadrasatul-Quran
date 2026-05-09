import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useSegments, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { QuranProvider } from "@/contexts/QuranContext";
import { AudioProvider } from "@/contexts/AudioContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="surah/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="oauth/quran-foundation/success" options={{ headerShown: false }} />
      <Stack.Screen name="oauth/quran-foundation/error" options={{ headerShown: false }} />
      <Stack.Screen name="quiz" options={{ headerShown: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="settings" options={{ headerShown: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="streak-calendar" options={{ headerShown: false, animation: "slide_from_bottom" }} />
    </Stack>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F3EC" }}>
        <ActivityIndicator color="#1A1A1A" />
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
              <QuranProvider>
                <AudioProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <KeyboardProvider>
                      <RootLayoutNav />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </AudioProvider>
              </QuranProvider>
            </AuthGate>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
