import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Modal, Portal, Text, useTheme, IconButton, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useThemeContext } from '../utils/ThemeContext';
import { gradients, shadows, animations } from '../constants/theme';
import { calculatePercentage, getStatus, getLecturesNeeded, getLecturesSkippable } from '../utils/attendance';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BunkSimulatorModal = ({ visible, onDismiss, subjects = [] }) => {
  const theme = useTheme();
  const { isDark } = useThemeContext();

  const [selectedSubjectId, setSelectedSubjectId] = useState('overall');
  const [mode, setMode] = useState('bunk'); // 'bunk' | 'attend'
  const [count, setCount] = useState(1);

  // Derive stats for selection
  const selectedStats = useMemo(() => {
    if (selectedSubjectId === 'overall') {
      const totalAttended = subjects.reduce((sum, s) => sum + (s.attended || 0), 0);
      const totalLectures = subjects.reduce((sum, s) => sum + (s.total || 0), 0);
      const target = 75;
      const percentage = calculatePercentage(totalAttended, totalLectures);
      return {
        id: 'overall',
        name: 'Overall Attendance',
        attended: totalAttended,
        total: totalLectures,
        target,
        percentage,
      };
    }
    const found = subjects.find(s => s.id === selectedSubjectId);
    if (!found) {
      return { id: 'none', name: 'None', attended: 0, total: 0, target: 75, percentage: 0 };
    }
    return {
      id: found.id,
      name: found.name,
      attended: found.attended || 0,
      total: found.total || 0,
      target: found.target || 75,
      percentage: calculatePercentage(found.attended || 0, found.total || 0),
    };
  }, [subjects, selectedSubjectId]);

  // Simulation calculations
  const simulation = useMemo(() => {
    const { attended, total, target } = selectedStats;
    let newAttended = attended;
    let newTotal = total;

    if (mode === 'bunk') {
      newTotal = total + count;
    } else {
      newAttended = attended + count;
      newTotal = total + count;
    }

    const newPercentage = calculatePercentage(newAttended, newTotal);
    const diff = newPercentage - selectedStats.percentage;
    const isSafe = newPercentage >= target;
    const maxSkippable = getLecturesSkippable(attended, total, target);
    const needed = getLecturesNeeded(attended, total, target);

    return {
      newAttended,
      newTotal,
      newPercentage,
      diff,
      isSafe,
      maxSkippable: maxSkippable === Infinity ? '∞' : maxSkippable,
      needed: needed === Infinity ? 'Unreachable' : needed,
    };
  }, [selectedStats, mode, count]);

  const handleCountChange = (delta) => {
    const next = Math.max(0, Math.min(count + delta, 50));
    setCount(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleQuickAdd = (amount) => {
    setCount(Math.min(count + amount, 50));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const glassGradient = isDark ? gradients.darkGlass : gradients.lightGlass;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalOverlay}
      >
        <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
          <LinearGradient colors={glassGradient} style={styles.gradientContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text variant="titleLarge" style={[styles.title, { color: theme.colors.text }]}>
                  Bunk Simulator
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Calculate future attendance before taking off
                </Text>
              </View>
              <IconButton
                icon="close"
                size={22}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={onDismiss}
              />
            </View>

            <ScrollView
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Subject Selector Chips */}
              <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                SELECT SUBJECT
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                <Chip
                  selected={selectedSubjectId === 'overall'}
                  onPress={() => {
                    setSelectedSubjectId('overall');
                    setCount(1);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.subjectChip,
                    selectedSubjectId === 'overall' && {
                      backgroundColor: theme.colors.primary + '25',
                      borderColor: theme.colors.primary,
                    }
                  ]}
                  textStyle={{
                    color: selectedSubjectId === 'overall' ? theme.colors.primary : theme.colors.onSurfaceVariant,
                    fontWeight: selectedSubjectId === 'overall' ? 'bold' : 'normal',
                  }}
                  showSelectedCheck={false}
                >
                  Overall
                </Chip>
                {subjects.map(s => (
                  <Chip
                    key={s.id}
                    selected={selectedSubjectId === s.id}
                    onPress={() => {
                      setSelectedSubjectId(s.id);
                      setCount(1);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.subjectChip,
                      selectedSubjectId === s.id && {
                        backgroundColor: theme.colors.primary + '25',
                        borderColor: theme.colors.primary,
                      }
                    ]}
                    textStyle={{
                      color: selectedSubjectId === s.id ? theme.colors.primary : theme.colors.onSurfaceVariant,
                      fontWeight: selectedSubjectId === s.id ? 'bold' : 'normal',
                    }}
                    showSelectedCheck={false}
                  >
                    {s.name}
                  </Chip>
                ))}
              </ScrollView>

              {/* Current Status Card */}
              <View style={[styles.statsRowCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: theme.colors.cardBorder }]}>
                <View style={styles.statCol}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Current</Text>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.text }}>
                    {selectedStats.percentage.toFixed(1)}%
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {selectedStats.attended}/{selectedStats.total}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Target</Text>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                    {selectedStats.target}%
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Required</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Safe Skips</Text>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', color: simulation.maxSkippable > 0 ? theme.colors.attendanceGreen : theme.colors.attendanceRed }}>
                    {simulation.maxSkippable}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Classes</Text>
                </View>
              </View>

              {/* Mode Toggle */}
              <View style={[styles.toggleContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                <Pressable
                  onPress={() => { setMode('bunk'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.toggleBtn, mode === 'bunk' && { backgroundColor: theme.colors.error, ...shadows.small }]}
                >
                  <Text style={[styles.toggleText, { color: mode === 'bunk' ? '#FFF' : theme.colors.onSurfaceVariant, fontWeight: mode === 'bunk' ? 'bold' : '600' }]}>
                    If I Bunk (Skip)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => { setMode('attend'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.toggleBtn, mode === 'attend' && { backgroundColor: theme.colors.attendanceGreen, ...shadows.small }]}
                >
                  <Text style={[styles.toggleText, { color: mode === 'attend' ? '#FFF' : theme.colors.onSurfaceVariant, fontWeight: mode === 'attend' ? 'bold' : '600' }]}>
                    If I Attend
                  </Text>
                </Pressable>
              </View>

              {/* Counter Controls */}
              <View style={styles.counterSection}>
                <Text variant="bodyMedium" style={{ color: theme.colors.text, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>
                  {mode === 'bunk' ? 'Number of lectures to miss:' : 'Consecutive lectures to attend:'}
                </Text>
                <View style={styles.counterRow}>
                  <IconButton
                    icon="minus-circle-outline"
                    size={32}
                    iconColor={theme.colors.primary}
                    onPress={() => handleCountChange(-1)}
                    disabled={count <= 0}
                  />
                  <View style={[styles.countDisplay, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.text }}>
                      {count}
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {count === 1 ? 'class' : 'classes'}
                    </Text>
                  </View>
                  <IconButton
                    icon="plus-circle-outline"
                    size={32}
                    iconColor={theme.colors.primary}
                    onPress={() => handleCountChange(1)}
                  />
                </View>

                {/* Quick Add Buttons */}
                <View style={styles.quickAddRow}>
                  {[1, 2, 3, 5].map(q => (
                    <Chip
                      key={q}
                      onPress={() => handleQuickAdd(q)}
                      style={styles.quickChip}
                      textStyle={{ fontSize: 11 }}
                    >
                      +{q}
                    </Chip>
                  ))}
                  <Chip
                    onPress={() => setCount(1)}
                    style={styles.quickChip}
                    textStyle={{ fontSize: 11 }}
                  >
                    Reset
                  </Chip>
                </View>
              </View>

              {/* Projected Result Card (Fully Visible with Generous Padding) */}
              <View style={[
                styles.resultCard,
                {
                  backgroundColor: simulation.isSafe
                    ? (isDark ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.09)')
                    : (isDark ? 'rgba(239, 68, 68, 0.14)' : 'rgba(239, 68, 68, 0.09)'),
                  borderColor: simulation.isSafe ? theme.colors.attendanceGreen : theme.colors.attendanceRed,
                }
              ]}>
                <View style={styles.resultHeader}>
                  <MaterialCommunityIcons
                    name={simulation.isSafe ? "check-circle" : "alert-circle"}
                    size={26}
                    color={simulation.isSafe ? theme.colors.attendanceGreen : theme.colors.attendanceRed}
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: simulation.isSafe ? theme.colors.attendanceGreen : theme.colors.attendanceRed }}>
                      {simulation.isSafe ? 'You are Safe!' : 'Attendance Shortage!'}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                      {simulation.isSafe
                        ? `Attendance will stay above your ${selectedStats.target}% target.`
                        : `Attendance will drop below your ${selectedStats.target}% target!`
                      }
                    </Text>
                  </View>
                </View>

                <View style={styles.resultMetrics}>
                  <View style={styles.metricItem}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Projected %</Text>
                    <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.text }}>
                      {simulation.newPercentage.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Change</Text>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: simulation.diff >= 0 ? theme.colors.attendanceGreen : theme.colors.attendanceRed }}>
                      {simulation.diff >= 0 ? `+${simulation.diff.toFixed(1)}%` : `${simulation.diff.toFixed(1)}%`}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>New Lectures</Text>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.text }}>
                      {simulation.newAttended} / {simulation.newTotal}
                    </Text>
                  </View>
                </View>

                {!simulation.isSafe && (
                  <View style={styles.recoveryNotice}>
                    <Text variant="labelSmall" style={{ color: theme.colors.attendanceRed, fontWeight: '600' }}>
                      You need to attend {getLecturesNeeded(simulation.newAttended, simulation.newTotal, selectedStats.target)} classes without missing any to restore {selectedStats.target}%.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    padding: 12,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    height: Math.min(SCREEN_HEIGHT * 0.88, 680),
  },
  gradientContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chipsScroll: {
    marginBottom: 12,
  },
  subjectChip: {
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statsRowCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 14,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 13,
  },
  counterSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  countDisplay: {
    paddingHorizontal: 28,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    minWidth: 110,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  quickChip: {
    height: 28,
    borderRadius: 14,
  },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultEmoji: {
    fontSize: 26,
    marginRight: 10,
  },
  resultMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  metricItem: {
    alignItems: 'center',
  },
  recoveryNotice: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.2)',
  },
});

export default BunkSimulatorModal;
