import { Tabs } from "expo-router";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";

import Svg, { ClipPath, Defs, G, Path, Rect } from "react-native-svg";
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
        <Icon sf={{ default: "graduationcap", selected: "graduationcap.fill" }} />
        <Label>Madrasa</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const TAB_DEFS = [
  { name: "index", icon: "home" as const, label: "Home" },
  { name: "quran", icon: "quran" as const, label: "Quran" },
  { name: "library", icon: "madrasa" as const, label: "Madrasa" },
];

function TabIcon({ name, color }: { name: "home" | "quran" | "madrasa"; color: string }) {
  if (name === "home") {
    return (
      <Svg width={22} height={20} viewBox="0 0 18 16" fill="none">
        <G clipPath="url(#homeClip)">
          <Path
            d="M17.9737 7.9843C17.9737 8.54631 17.5055 8.98655 16.9748 8.98655H15.9759L15.9978 13.9884C15.9978 14.0727 15.9916 14.1571 15.9822 14.2414V14.7441C15.9822 15.4341 15.4234 15.993 14.7336 15.993H14.2342C14.1998 15.993 14.1655 15.993 14.1312 15.9899C14.0874 15.993 14.0438 15.993 14 15.993H12.9856H12.2364C11.5466 15.993 10.9878 15.4341 10.9878 14.7441V13.9947V11.9964C10.9878 11.4438 10.5414 10.9973 9.98889 10.9973H7.99111C7.4386 10.9973 6.99222 11.4438 6.99222 11.9964V13.9947V14.7441C6.99222 15.4341 6.43347 15.993 5.74361 15.993H4.99444H3.99868C3.95185 15.993 3.90503 15.9899 3.85821 15.9867C3.82075 15.9899 3.78329 15.993 3.74583 15.993H3.24639C2.55653 15.993 1.99778 15.4341 1.99778 14.7441V11.2471C1.99778 11.219 1.99778 11.1877 2.00089 11.1597V8.98655H0.998889C0.437014 8.98655 0 8.54943 0 7.9843C0 7.70328 0.0936458 7.4535 0.312153 7.23495L8.31575 0.256619C8.53426 0.0380589 8.78398 0.00683594 9.00249 0.00683594C9.22099 0.00683594 9.47071 0.0692818 9.65801 0.225396L17.6304 7.23495C17.8801 7.4535 18.005 7.70328 17.9737 7.9843Z"
            fill={color}
          />
        </G>
        <Defs>
          <ClipPath id="homeClip">
            <Rect width={17.98} height={16} fill="white" />
          </ClipPath>
        </Defs>
      </Svg>
    );
  }

  if (name === "quran") {
    return (
      <Svg width={18} height={21} viewBox="0 0 14 16" fill="none">
        <G clipPath="url(#quranClip)">
          <Path
            d="M11 0C12.6562 0 14 1.34375 14 3V13C14 14.6562 12.6562 16 11 16H2H1C0.446875 16 0 15.5531 0 15C0 14.4469 0.446875 14 1 14V12C0.446875 12 0 11.5531 0 11V1C0 0.446875 0.446875 0 1 0H2H11ZM11 12H3V14H11C11.5531 14 12 13.5531 12 13C12 12.4469 11.5531 12 11 12ZM8.56563 4.69375L8.2875 5.3625L7.56563 5.42188C7.3875 5.4375 7.31562 5.65625 7.45 5.77187L8 6.24375L7.83125 6.95C7.79063 7.12187 7.97813 7.25938 8.13125 7.16563L8.75 6.7875L9.36875 7.16563C9.52187 7.25938 9.70937 7.12187 9.66875 6.95L9.5 6.24375L10.05 5.77187C10.1844 5.65625 10.1125 5.43438 9.93437 5.42188L9.2125 5.3625L8.93437 4.69375C8.86562 4.52812 8.63438 4.52812 8.56563 4.69375ZM3 6C3 8.20937 4.79063 10 7 10C7.8 10 8.54688 9.76562 9.17188 9.35938C9.27188 9.29375 9.3125 9.16562 9.26875 9.05625C9.225 8.94687 9.10625 8.88125 8.9875 8.90625C8.79688 8.94375 8.59688 8.96562 8.39375 8.96562C6.75625 8.96562 5.42812 7.6375 5.42812 6C5.42812 4.3625 6.75625 3.03437 8.39375 3.03437C8.59688 3.03437 8.79375 3.05625 8.9875 3.09375C9.10625 3.11875 9.22188 3.05312 9.26875 2.94375C9.31563 2.83437 9.275 2.70625 9.17188 2.64062C8.54688 2.23438 7.8 2 7 2C4.79063 2 3 3.79063 3 6Z"
            fill={color}
          />
        </G>
        <Defs>
          <ClipPath id="quranClip">
            <Rect width={14} height={16} fill="white" />
          </ClipPath>
        </Defs>
      </Svg>
    );
  }

  return (
    <Svg width={28} height={22} viewBox="0 0 23 18" fill="none">
      <Path
        d="M11.251 1.125C10.9662 1.125 10.685 1.17422 10.4178 1.26914L0.556437 4.83047C0.222453 4.95352 0.000968381 5.26992 0.000968381 5.625C0.000968381 5.98008 0.222453 6.29648 0.556437 6.41953L2.59198 7.1543C2.01542 8.06133 1.68847 9.13359 1.68847 10.2621V11.25C1.68847 12.2484 1.30878 13.2785 0.904484 14.0906C0.675968 14.5477 0.415812 14.9977 0.113468 15.4125C0.000968382 15.5637 -0.0306722 15.7605 0.032609 15.9398C0.0958903 16.1191 0.243547 16.2527 0.426359 16.2984L2.67636 16.8609C2.82402 16.8996 2.98222 16.8715 3.1123 16.7906C3.24237 16.7098 3.33378 16.5762 3.36191 16.425C3.66425 14.9203 3.51308 13.5703 3.28808 12.6035C3.17558 12.1043 3.02441 11.5945 2.81347 11.127V10.2621C2.81347 9.20039 3.17206 8.19844 3.79433 7.39687C4.24784 6.85195 4.83495 6.4125 5.52402 6.1418L11.0435 3.97266C11.3318 3.86016 11.6588 4.00078 11.7713 4.28906C11.8838 4.57734 11.7432 4.9043 11.4549 5.0168L5.93534 7.18594C5.49941 7.3582 5.1162 7.62188 4.80331 7.94531L10.4142 9.97031C10.6814 10.0652 10.9627 10.1145 11.2475 10.1145C11.5322 10.1145 11.8135 10.0652 12.0807 9.97031L21.9455 6.41953C22.2795 6.3 22.501 5.98008 22.501 5.625C22.501 5.26992 22.2795 4.95352 21.9455 4.83047L12.0842 1.26914C11.817 1.17422 11.5357 1.125 11.251 1.125ZM4.50097 14.3438C4.50097 15.5848 7.52441 16.875 11.251 16.875C14.9775 16.875 18.001 15.5848 18.001 14.3438L17.4631 9.23203L12.4639 11.0391C12.0736 11.1797 11.6623 11.25 11.251 11.25C10.8396 11.25 10.4248 11.1797 10.0381 11.0391L5.03886 9.23203L4.50097 14.3438Z"
        fill={color}
      />
    </Svg>
  );
}

function FixedTabBar(props: any) {
  const { state, navigation } = props;
  const colors = useColors();
  const styles = createStyles(colors);

  const visibleRoutes = state.routes.filter((r: any) =>
    TAB_DEFS.find(t => t.name === r.name)
  );

  return (
    <View style={styles.shell}>
      <View style={styles.surface}>
        <View style={styles.itemsRow}>
          {visibleRoutes.map((route: any) => {
            const tabDef = TAB_DEFS.find(t => t.name === route.name);
            if (!tabDef) return null;
            const routeIndex = state.routes.findIndex((r: any) => r.name === route.name);
            const isFocused = state.index === routeIndex;
            const color = isFocused ? colors.tabBarActive : colors.tabBarInactive;

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
                style={[styles.item, isFocused && styles.itemActive]}
                onPress={onPress}
                activeOpacity={0.78}
              >
                <View style={styles.iconWrap}>
                  <TabIcon name={tabDef.icon} color={color} />
                </View>
                <Text style={[styles.label, { color }]}>
                  {tabDef.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
StyleSheet.create({
  shell: {
    backgroundColor: colors.tabBarBackground,
  },
  surface: {
    minHeight: 82,
    backgroundColor: colors.tabBarBackground,
    paddingTop: 10,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  itemsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 38,
  },
  item: {
    width: 72,
    height: 56,
    padding: 8,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
    borderRadius: 18,
    transform: [{ translateY: -6 }],
  },
  itemActive: {
    backgroundColor: colors.tabBarActiveBackground,
  },
  iconWrap: {
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    lineHeight: 12,
    fontFamily: "Inter_700Bold",
    fontWeight: "600",
    transform: [{ translateY: 2 }],
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
  return <ClassicTabLayout />;
}
