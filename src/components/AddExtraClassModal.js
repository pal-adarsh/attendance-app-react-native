import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Modal, Portal, Text, useTheme, IconButton, Button, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useThemeContext } from '../utils/ThemeContext';
import { gradients, shadows } from '../constants/theme';
import { StorageService } from '../utils/storage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const AddExtraClassModal = ({ visible, onDismiss, date, subjects = [], onSaved }) => {
  const theme = useTheme();
  const { isDark } = useThemeContext();

  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || null);
  const [selectedStatus, setSelectedStatus] = useState('present'); // 'present' | 'absent' | 'od' | 'cancelled'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initial subject if none selected
  const activeSubjectId = selectedSubjectId || subjects[0]?.id;

  const handleSave = async () => {
    if (!activeSubjectId) return;
    setIsSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await StorageService.addExtraAttendanceRecord(date, activeSubjectId, selectedStatus);
      await StorageService.recomputeSubjectTotals(activeSubjectId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved?.();
      onDismiss();
    } catch (e) {
      console.error('Failed to add extra class', e);
    } finally {
      setIsSubmitting(false);
    }
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
                  Add Extra Lecture
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  Record an extra or compensatory class for today
                </Text>
              </View>
              <IconButton
                icon="close"
                size={22}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={onDismiss}
              />
            </View>

            {/* Scrollable Form Content */}
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                SELECT SUBJECT
              </Text>
              {subjects.length === 0 ? (
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, marginBottom: 12 }}>
                  No courses added yet. Please add subjects in the Subjects tab first.
                </Text>
              ) : (
                <View style={styles.chipsContainer}>
                  {subjects.map(s => {
                    const isSelected = activeSubjectId === s.id;
                    return (
                      <Chip
                        key={s.id}
                        selected={isSelected}
                        onPress={() => {
                          setSelectedSubjectId(s.id);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={[
                          styles.subjectChip,
                          isSelected
                            ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                            : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: theme.colors.cardBorder }
                        ]}
                        textStyle={{
                          color: isSelected ? '#FFFFFF' : theme.colors.text,
                          fontWeight: isSelected ? 'bold' : '600',
                          fontSize: 13,
                        }}
                        showSelectedCheck={false}
                      >
                        {s.name}
                      </Chip>
                    );
                  })}
                </View>
              )}

              <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant, marginTop: 14 }]}>
                ATTENDANCE STATUS
              </Text>
              <View style={styles.statusRow}>
                {[
                  { key: 'present', label: 'Present', icon: 'check-circle', color: theme.colors.attendanceGreen },
                  { key: 'absent', label: 'Absent', icon: 'close-circle', color: theme.colors.attendanceRed },
                  { key: 'od', label: 'On Duty (OD)', icon: 'shield-check', color: theme.colors.attendanceOD || '#D97706' },
                  { key: 'cancelled', label: 'Cancelled', icon: 'cancel', color: '#A1A1AA' },
                ].map(item => {
                  const isSelected = selectedStatus === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => {
                        setSelectedStatus(item.key);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.statusBtn,
                        {
                          backgroundColor: isSelected
                            ? item.color + '25'
                            : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                          borderColor: isSelected ? item.color : 'transparent',
                        }
                      ]}
                    >
                      <IconButton
                        icon={item.icon}
                        iconColor={isSelected ? item.color : theme.colors.onSurfaceVariant}
                        size={20}
                        style={{ margin: 0 }}
                      />
                      <Text
                        style={[
                          styles.statusBtnText,
                          {
                            color: isSelected ? item.color : theme.colors.text,
                            fontWeight: isSelected ? 'bold' : '600',
                          }
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Fixed Bottom Action Container (Guaranteed 100% Visible) */}
            <View style={[styles.bottomActionBar, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={isSubmitting}
                disabled={!activeSubjectId || isSubmitting}
                style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
                contentStyle={{ paddingVertical: 4 }}
                labelStyle={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}
              >
                Add to Attendance
              </Button>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    padding: 16,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    height: Math.min(SCREEN_HEIGHT * 0.85, 620),
    display: 'flex',
    flexDirection: 'column',
  },
  gradientContainer: {
    flex: 1,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 14,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  subjectChip: {
    borderRadius: 16,
    borderWidth: 1.5,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: '46%',
    flex: 1,
  },
  statusBtnText: {
    fontSize: 13,
    marginLeft: 6,
  },
  bottomActionBar: {
    paddingTop: 14,
    marginTop: 4,
    borderTopWidth: 1,
  },
  saveBtn: {
    borderRadius: 14,
    ...shadows.medium,
  },
});

export default AddExtraClassModal;
