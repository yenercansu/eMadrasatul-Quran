import React, { useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

interface SwipeableRowProps {
  onDelete: () => void;
  onOpen?: () => void;
  children: React.ReactNode;
}

export function SwipeableRow({ onDelete, onOpen, children }: SwipeableRowProps) {
  const c = useColors();
  const swipeRef = useRef<Swipeable>(null);
  // Tracks which side is fully settled open. Null during snap animation and when closed.
  // Action buttons check this before firing so a lifting finger during the snap can't
  // accidentally trigger the action before the row has fully come to rest.
  const openSideRef = useRef<"right" | "left" | null>(null);

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
    return (
      <Animated.View style={[s.actionOuter, { transform: [{ translateX: trans }] }]}>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: c.destructive, borderRadius: c.radius }]}
          onPress={() => {
            if (openSideRef.current !== "right") return;
            openSideRef.current = null;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            swipeRef.current?.close();
            onDelete();
          }}
          activeOpacity={0.8}
        >
          <Feather name="trash-2" size={20} color={c.destructiveForeground} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] });
    return (
      <Animated.View style={[s.leftActionOuter, { transform: [{ translateX: trans }] }]}>
        <TouchableOpacity
          style={[s.leftActionBtn, { backgroundColor: c.foreground, borderRadius: c.radius }]}
          onPress={() => {
            if (openSideRef.current !== "left") return;
            openSideRef.current = null;
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
            swipeRef.current?.close();
            onOpen!();
          }}
          activeOpacity={0.8}
        >
          <Feather name="book-open" size={20} color={c.primaryForeground} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      renderLeftActions={onOpen ? renderLeftActions : undefined}
      rightThreshold={50}
      leftThreshold={onOpen ? 50 : undefined}
      overshootRight={false}
      overshootLeft={onOpen ? false : undefined}
      friction={2}
      onSwipeableOpen={(direction) => {
        // "right" = right-side actions revealed (user swiped left = delete side)
        // "left"  = left-side actions revealed (user swiped right = open side)
        openSideRef.current = direction === "right" ? "right" : "left";
      }}
      onSwipeableClose={() => {
        openSideRef.current = null;
      }}
    >
      {children}
    </Swipeable>
  );
}

const s = StyleSheet.create({
  actionOuter: {
    width: 80,
    paddingLeft: 8,
    justifyContent: "center",
    alignItems: "stretch",
  },
  actionBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  leftActionOuter: {
    width: 80,
    paddingRight: 8,
    justifyContent: "center",
    alignItems: "stretch",
  },
  leftActionBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
