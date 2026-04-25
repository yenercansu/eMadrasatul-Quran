import { BlurView } from "expo-blur";
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

  const visibleRoutes = state.routes.filter((r: any) =>
    TAB_DEFS.find(t => t.name === r.name)
  );

  return (
    <View style={[tabStyles.floatWrapper, { bottom: insets.bottom + 12 }]}>
      <View style={tabStyles.bar}>
        {isIOS && (
          <BlurView
            intensity={90}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        )}
        {!isIOS && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F5F5F5" }]} />
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
              style={tabStyles.tabItem}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <View style={[tabStyles.iconPill, isFocused && tabStyles.iconPillActive]}>
                <Feather
                  name={tabDef.icon}
                  size={20}
                  color={isFocused ? "#FFFFFF" : "#9A9A9A"}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  floatWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 40,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconPill: {
    width: 52,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillActive: {
    backgroundColor: "#1A1A1A",
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
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
