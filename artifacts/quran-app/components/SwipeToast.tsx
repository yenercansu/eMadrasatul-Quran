import React, { useRef } from "react";
import { Animated, PanResponder, type StyleProp, type ViewStyle } from "react-native";

interface SwipeToastProps {
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Wraps any toast content with swipe-up-to-dismiss gesture.
 * Extracted from PersistentCertToast — used by all toasts in the app.
 */
export function SwipeToast({ onDismiss, style, children }: SwipeToastProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy < -5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -40) {
          Animated.timing(translateY, {
            toValue: -200,
            duration: 180,
            useNativeDriver: true,
          }).start(() => onDismiss());
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[{ transform: [{ translateY }] }, style]}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}
