import React, { useState, useMemo, useCallback, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { FullScreenShell, AppChip } from "@/components/DesignSystem";
import { SettingsCard, SettingsRow } from "@/components/SettingsRow";
import { Tag } from "@/components/Tag";
import { SubSectionTitle } from "@/components/Typography";
import { SwipeToast } from "@/components/SwipeToast";
import { useQuran } from "@/contexts/QuranContext";
import {
  MEMORIZATION_COLLECTIONS,
  COLLECTION_FILTER_CHIPS,
  SECTION_CONFIG,
  GROUP_CONFIG,
  type CollectionFilter,
  type CollectionGroup,
  type CollectionSection,
  type MemorizationCollection,
} from "@/constants/memorization-collections";

export default function MemorizationPacksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addedCollectionIds, addCollection, removeCollection } = useQuran();
  const [activeFilter, setActiveFilter] = useState<CollectionFilter>("all");
  const [showAddToast, setShowAddToast] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sections = useMemo(() => {
    const enabled = MEMORIZATION_COLLECTIONS.filter((c) => c.enabled);
    const sectionIds = (Object.keys(SECTION_CONFIG) as CollectionSection[]).sort(
      (a, b) => SECTION_CONFIG[a].order - SECTION_CONFIG[b].order
    );
    return sectionIds
      .map((sectionId) => {
        const groupIds = (Object.keys(GROUP_CONFIG) as CollectionGroup[])
          .filter((g) => GROUP_CONFIG[g].section === sectionId)
          .sort((a, b) => GROUP_CONFIG[a].order - GROUP_CONFIG[b].order);
        const groups = groupIds
          .map((groupId) => ({
            id: groupId,
            label: GROUP_CONFIG[groupId].label,
            collections: enabled.filter(
              (c) =>
                c.section === sectionId &&
                c.group === groupId &&
                (activeFilter === "all" || c.group === activeFilter)
            ),
          }))
          .filter((g) => g.collections.length > 0);
        return { id: sectionId, title: SECTION_CONFIG[sectionId].title, groups };
      })
      .filter((s) => s.groups.length > 0);
  }, [activeFilter]);

  const handleAdd = useCallback(
    (collection: MemorizationCollection) => {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
      addCollection(collection.id);
      setShowAddToast(true);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => setShowAddToast(false), 3000);
    },
    [addCollection]
  );

  const handleRowPress = useCallback((collection: MemorizationCollection) => {
    const firstRange = collection.ayahRanges[0];
    router.push(`/surah/${firstRange.surahNumber}?ayah=${firstRange.startAyah}`);
  }, []);

  const s = screenStyles(colors);

  return (
    <FullScreenShell
      title="Memorization Packs"
      onClose={() => router.back()}
      scrollable={false}
    >
      {showAddToast && (
        <SwipeToast
          onDismiss={() => setShowAddToast(false)}
          style={[s.addToast, { top: insets.top + 12 }]}
        >
          <View style={s.toastIcon}>
            <Feather name="check" size={16} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.toastTitle}>Added to Memorization Quiz</Text>
          </View>
          <TouchableOpacity onPress={() => setShowAddToast(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </SwipeToast>
      )}

      {/* Filter chips — same pattern as library.tsx */}
      <View style={s.chipsRow}>
        {COLLECTION_FILTER_CHIPS.map((chip) => (
          <Tag
            key={chip.key}
            label={chip.label}
            selected={activeFilter === chip.key}
            onPress={() => setActiveFilter(chip.key)}
          />
        ))}
      </View>

      <ScrollView
        style={s.scrollFill}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => {
          const packCount = section.groups.reduce(
            (sum, g) => sum + g.collections.length,
            0
          );
          return (
            <View key={section.id}>
              {/* Section heading */}
              <View style={s.sectionHeader}>
                <SubSectionTitle>{section.title}</SubSectionTitle>
                <Text style={s.sectionCount}>
                  {packCount} {packCount === 1 ? "pack" : "packs"}
                </Text>
              </View>

              {/* Groups — same Section pattern as settings.tsx */}
              {section.groups.map((group) => (
                <View key={group.id} style={s.groupBlock}>
                  <View style={s.groupTitleRow}>
                    <Text style={s.groupTitleText}>{group.label}</Text>
                  </View>
                  <SettingsCard>
                    {group.collections.map((collection, i) => {
                      const isAdded = addedCollectionIds.includes(collection.id);
                      const ayahLabel =
                        collection.ayahCount === 1
                          ? "1 ayah"
                          : `${collection.ayahCount} ayahs`;

                      return (
                        <SettingsRow
                          key={collection.id}
                          label={collection.title}
                          last={i === group.collections.length - 1}
                          onPress={() => handleRowPress(collection)}
                          right={
                            <View style={s.rowRight}>
                              <Text style={s.rowMeta}>{ayahLabel}</Text>
                              {isAdded ? (
                                <AppChip
                                  variant="success"
                                  size="sm"
                                  icon="check"
                                  label="Added"
                                  onPress={() => removeCollection(collection.id)}
                                />
                              ) : (
                                <AppChip
                                  variant="outline"
                                  size="sm"
                                  icon="plus"
                                  label="Add"
                                  onPress={() => handleAdd(collection)}
                                />
                              )}
                              <Feather
                                name="chevron-right"
                                size={16}
                                color={colors.appIconMuted}
                              />
                            </View>
                          }
                        />
                      );
                    })}
                  </SettingsCard>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </FullScreenShell>
  );
}

const screenStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    // Filter chips row — matches library.tsx filterRow
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 8,
    },
    scrollFill: {
      flex: 1,
    },
    content: {
      paddingTop: 4,
    },
    // Section heading row (SubSectionTitle + pack count)
    sectionHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 4,
    },
    sectionCount: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.appTextMuted,
    },
    // Group block — mirrors settings.tsx Section component layout
    groupBlock: {
      marginTop: 22,
    },
    groupTitleRow: {
      paddingHorizontal: 22,
      marginBottom: 9,
    },
    groupTitleText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.appIconMuted,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      fontFamily: "Inter_700Bold",
    },
    // Add-collection toast — same pattern as weekDoneToast in index.tsx
    addToast: {
      position: "absolute",
      left: 16,
      right: 16,
      zIndex: 50,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      shadowColor: colors.shadowNeutral,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 6,
    },
    toastIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.borderSubtle,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    toastTitle: {
      fontSize: 13,
      fontWeight: "600",
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
    },
    toastSub: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      marginTop: 1,
    },
    // Row right slot
    rowRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexShrink: 0,
    },
    rowMeta: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.appTextMuted,
    },
  });
