import { Tabs } from "expo-router";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  { name: "index", icon: "home" as const, label: "Home" },
  { name: "quran", icon: "book-open" as const, label: "Quran" },
  { name: "library", icon: "bookmark" as const, label: "Quiz" },
];

function FixedTabBar(props: any) {
  const { state, navigation } = props;
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((r: any) =>
    TAB_DEFS.find(t => t.name === r.name)
  );

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
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
            style={styles.item}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Feather
              name={tabDef.icon}
              size={22}
              color={isFocused ? "#1A1A1A" : "#AAAAAA"}
            />
            <Text style={[styles.label, isFocused && styles.labelActive]}>
              {tabDef.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 2,
    borderTopColor: "#EFEDE8",
    paddingTop: 10,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 3,
  },
  label: {
    fontSize: 10,
    color: "#AAAAAA",
    fontFamily: "Inter_400Regular",
  },
  labelActive: {
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
  },
});

function ClassicTabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FixedTabBar {...props} />}
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
