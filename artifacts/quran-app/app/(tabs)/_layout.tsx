import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleSheet,
  View,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="quran">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>Quran</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <Icon sf={{ default: "bookmark", selected: "bookmark.fill" }} />
        <Label>Quiz</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const TAB_DEFS = [
  { name: "index", icon: "home" as const },
  { name: "quran", icon: "book-open" as const },
  { name: "library", icon: "bookmark" as const },
];

function FloatingTabBar(props: any) {
  const { state, navigation } = props;
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";

  const EDGE_GAP = Math.max(insets.bottom + 12, 24);
  const BLUR_HEIGHT = EDGE_GAP + 80;

  const gradientFade = isDark
    ? ["rgba(14,14,14,0)", "rgba(14,14,14,0.88)", "rgba(14,14,14,1)"] as const
    : ["rgba(248,244,239,0)", "rgba(248,244,239,0.88)", "rgba(248,244,239,1)"] as const;

  const visibleRoutes = state.routes.filter((r: any) =>
    TAB_DEFS.find(t => t.name === r.name)
  );

  return (
    <>
      <LinearGradient
        colors={gradientFade}
        style={[styles.blurStrip, { height: BLUR_HEIGHT }]}
        pointerEvents="none"
      />
      <View style={[styles.floatWrapper, { bottom: EDGE_GAP }]} pointerEvents="box-none">
        <View style={[styles.bar, { marginHorizontal: EDGE_GAP, borderColor: colors.border }]}>
          {isIOS && (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          )}
          {!isIOS && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          )}
          {visibleRoutes.map((route: any) => {
            const tabDef = TAB_DEFS.find(t => t.name === route.name);
            if (!tabDef) return null;
            const routeIndex = state.routes.findIndex((r: any) => r.name === route.name);
            const isFocused = state.index === routeIndex;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabItem}
                onPress={onPress}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.iconPill,
                  isFocused && { backgroundColor: colors.primary },
                ]}>
                  <Feather
                    name={tabDef.icon}
                    size={22}
                    color={isFocused ? colors.primaryForeground : colors.mutedForeground}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  blurStrip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  floatWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 40,
    paddingVertical: 10,
    gap: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPill: {
    width: 60,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});

function ClassicTabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="quran" />
      <Tabs.Screen name="library" />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
