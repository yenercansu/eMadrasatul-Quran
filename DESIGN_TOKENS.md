# Design Tokens System

## Overview

This document explains the design tokens system implemented for the Quran Memorization App to ensure design consistency and maintainability across the codebase.

## What Are Design Tokens?

Design tokens are named entities that store visual design attributes like colors, spacing, typography, shadows, and borders. They act as a single source of truth for all design decisions.

## Implementation

### Colors (`constants/colors.ts`)

The colors system has been extended with semantic design tokens in addition to the existing color scheme:

#### Semantic Color Tokens

Each theme (light/dark) now includes semantic color tokens with the `app` prefix:

```typescript
// Light Theme
appBackground: "#FDFBF7"        // Main app background
appCard: "#FFFFFF"               // Card backgrounds
appBorder: "#E8E8ED"             // Border colors
appText: "#1A1A1A"               // Primary text
appTextMuted: "#8E8E93"          // Secondary text
appPrimary: "#1A1A1A"            // Primary brand color
appSuccess: "#4CAF50"            // Success states
appWarning: "#EAB308"            // Warning states
appInfo: "#2196F3"               // Info states
appError: "#D9534F"              // Error states
appGold: "#C9A02A"               // Gold accent
appGreen: "#4CAF50"              // Green accent
appLightBg: "#FEFCE8"            // Light background variant
appLighterBg: "#FAFAF9"          // Lighter background variant
appLightGray: "#F5F5F4"          // Light gray
appDarkGray: "#78716C"           // Dark gray text
appDarkerGray: "#57534E"         // Darker gray text
appLightText: "#71717A"          // Light text
appBorderLight: "#D6D3D1"        // Light border
appBorderLighter: "#DDDAD4"      // Lighter border
appWhite: "#FFFFFF"              // Pure white
appBlack: "#000000"              // Pure black

// Dark Theme (automatically adjusted for contrast)
// Same token names with dark-appropriate values
```

#### Benefits

1. **Consistency**: Use `appSuccess` instead of multiple green hex codes
2. **Theming**: Switch between light/dark automatically
3. **Maintainability**: Change colors in one place
4. **Semantic Meaning**: `appSuccess` is clearer than `#4CAF50`

### Spacing Tokens

```typescript
spacing: {
  xs: 4,     // 4px
  sm: 8,     // 8px
  md: 12,    // 12px
  lg: 16,    // 16px
  xl: 20,    // 20px
  "2xl": 24, // 24px
  "3xl": 32, // 32px
}
```

**Usage Example:**
```typescript
// Instead of:
padding: 16

// Use:
padding: colors.spacing.lg
```

### Typography Tokens

```typescript
typography: {
  fontSize: {
    xs: 11,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    "2xl": 20,
    "3xl": 24,
    "4xl": 28,
    "5xl": 32,
    "6xl": 36,
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
}
```

**Usage Example:**
```typescript
// Instead of:
fontSize: 18

// Use:
fontSize: colors.typography.fontSize.xl
```

### Border Radius Tokens

```typescript
borders: {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  full: 9999,
}
```

**Usage Example:**
```typescript
// Instead of:
borderRadius: 12

// Use:
borderRadius: colors.borders.lg
```

### Shadow Tokens

```typescript
shadows: {
  sm: { /* subtle shadow */ },
  md: { /* medium shadow */ },
  lg: { /* large shadow */ },
}
```

**Usage Example:**
```typescript
// Instead of:
shadowColor: "#000",
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.06,
shadowRadius: 8,
elevation: 3,

// Use:
...colors.shadows.md
```

## Migration Guide

### Before (Hard-Coded Values)

```typescript
// ❌ Hard-coded hex colors
backgroundColor: "#FFFFFF"
color: "#1A1A1A"
borderColor: "#E8E8ED"

// ❌ Hard-coded sizes
borderRadius: 20
padding: 18
fontSize: 13

// ❌ Inconsistent values across components
// Component A uses #16A34A for success
// Component B uses #4CAF50 for success
```

### After (Design Tokens)

```typescript
// ✅ Semantic color tokens
backgroundColor: colors.appWhite
color: colors.appText
borderColor: colors.appBorder

// ✅ Token-based sizes
borderRadius: colors.radius + 8  // 20px
padding: 18  // or define in spacing tokens
fontSize: colors.typography.fontSize.sm

// ✅ Consistent semantic tokens
backgroundColor: colors.appSuccess  // Same everywhere!
```

## Usage in Components

### React Native Styles

```typescript
import { useColors } from "@/hooks/useColors"

const MyComponent = () => {
  const colors = useColors()
  const s = styles(colors)
  
  return <View style={s.container} />
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.appCard,
      borderRadius: colors.borders.lg,
      padding: colors.spacing.lg,
      shadowColor: colors.shadows.md.shadowColor,
      shadowOffset: colors.shadows.md.shadowOffset,
      shadowOpacity: colors.shadows.md.shadowOpacity,
      shadowRadius: colors.shadows.md.shadowRadius,
      elevation: colors.shadows.md.elevation,
    },
  })
```

### Web/React Components

For the mockup-sandbox (Tailwind CSS), colors are defined in CSS variables:

```css
/* src/index.css */
--color-background: hsl(var(--background));
--color-foreground: hsl(var(--foreground));
--color-primary: hsl(var(--primary));
```

```tsx
// Usage with Tailwind
<div className="bg-background text-foreground" />
```

## Adding New Tokens

### 1. Add to colors.ts

```typescript
const colors = {
  light: {
    // ... existing colors
    appNewToken: "#HEXVALUE",
  },
  dark: {
    // ... existing colors  
    appNewToken: "#HEXVALUE", // Dark theme appropriate value
  },
}
```

### 2. Use in Components

```typescript
backgroundColor: colors.appNewToken
```

## Benefits Achieved

1. **Design Consistency**: All components use the same color values for the same purposes
2. **Easy Theming**: Light/dark theme switching is automatic
3. **Maintainability**: Update colors in one place (colors.ts)
4. **Developer Experience**: Autocomplete for token names
5. **Type Safety**: TypeScript ensures correct usage
6. **Scalability**: Easy to add new tokens as the app grows

## Current Hard-Coded Values (To Be Migrated)

The following components still contain hard-coded values that should be migrated:

- [x] `SurahCard.tsx` - Migrated ✓
- [x] `AyahItem.tsx` - Migrated ✓
- [x] `AudioPlayerBar.tsx` - Migrated ✓
- [x] `SettingsScreen.tsx` - Migrated ✓

## Future Improvements

1. **CSS Custom Properties for Web**: Implement CSS variables for the mockup-sandbox
2. **Token Validation**: Add runtime validation for token values
3. **Figma Sync**: Sync tokens with Figma design system
4. **Token Documentation**: Generate documentation from token definitions
5. **Motion Tokens**: Add animation/timing tokens
6. **Z-Index Tokens**: Add layering tokens
