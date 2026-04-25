import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleSheet,
  View,
  Text,
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
  { name: "index", label: "Home", icon: "home" as const },
  { name: "quran", label: "Quran", icon: "book-open" as const },
  { name: "library", label: "Quiz", icon: "bookmark" as const },
];

function CustomTabBar(props: any) {
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
    <View style={[tabStyles.outerWrapper, { paddingBottom: insets.bottom }]}>
      {isIOS && (
        <BlurView
          intensity={80}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      )}
      {!isIOS && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border }]} />
      )}
      <View style={tabStyles.bar}>
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
                  color={isFocused ? "#FFFFFF" : colors.mutedForeground}
                />
              </View>
              <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
                {tabDef.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  outerWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  iconPill: {
    width: 52,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillActive: {
    backgroundColor: "#1A1A1A",
  },
  label: {
    fontSize: 11,
    color: "#9A9A9A",
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.2,
  },
  labelActive: {
    color: "#1A1A1A",
    fontFamily: "Inter_600SemiBold",
  },
});

function ClassicTabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
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
