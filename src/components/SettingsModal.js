import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, Switch } from 'react-native';
import { Modal, Portal, Text, TextInput, Button, HelperText, useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import { isReminderEnabled, setReminderEnabled } from '../utils/notifications';
import { gradients, animations, shadows } from '../constants/theme';

const SettingsModal = ({ visible, onDismiss, navigation }) => {
  const theme = useTheme();
  const { isDark, toggleTheme } = useThemeContext();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [remindersEnabled, setRemindersEnabledState] = useState(false);

  // Reanimated Modal Physics
  const translateY = useSharedValue(150);
  const scale = useSharedValue(0.95);
  const opacity = useSharedValue(0);

  // Focus tracking
  const nameFocus = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      loadProfile();
      translateY.value = withSpring(0, animations.springConfig);
      scale.value = withSpring(1, animations.springConfig);
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(100, { duration: 200 });
      scale.value = withTiming(0.95, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
      setError('');
      setSuccess('');
    }
  }, [visible]);

  const loadProfile = async () => {
    try {
      const profile = await StorageService.loadStudentProfile();
      setName(profile.name);
      const enabled = await isReminderEnabled();
      setRemindersEnabledState(enabled);
    } catch (e) {
      console.error('Failed to load profile', e);
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      setError('Name cannot be empty');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    try {
      await StorageService.saveStudentProfile({
        name: name.trim(),
        setupComplete: true,
      });
      setSuccess('Name updated successfully!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        setSuccess('');
      }, 2000);
    } catch (e) {
      console.error('Failed to save profile', e);
    }
  };

  const handleResetData = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Reset App Data ⚠️",
      "Are you absolutely sure? This will permanently delete all your subjects, timetables, and past logs.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Everything",
          style: "destructive",
          onPress: async () => {
            try {
              await StorageService.clearData();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onDismiss();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }],
              });
            } catch (e) {
              console.error('Failed to clear data', e);
            }
          }
        }
      ]
    );
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setBackupMsg('');
      if (!(await Sharing.isAvailableAsync())) {
        setBackupMsg('Sharing not available on this device.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      const data = await StorageService.exportAllData();
      const json = JSON.stringify(data, null, 2);
      const fileName = `attendance-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const file = new File(Paths.cache, fileName);
      file.write(json, { encoding: 'utf8' });
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save Attendance Backup', UTI: 'public.json' });
      setBackupMsg('Export successful!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setBackupMsg(`Export failed: ${e.message}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setBackupMsg('');
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled) return;
      const pickedFile = result.assets[0];
      const file = new File(pickedFile.uri);
      const text = await file.text();
      const backup = JSON.parse(text);
      await StorageService.importAllData(backup);
      setBackupMsg(`Restored from ${pickedFile.name || 'backup'}.`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setBackupMsg(`Import failed: ${e.message}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setImporting(false);
    }
  };

  // Reanimated style declarations
  const animatedModalStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value }
      ],
    };
  });

  const animatedInputStyle = useAnimatedStyle(() => {
    return {
      borderColor: withTiming(
        nameFocus.value === 1 ? theme.colors.primary : 'rgba(255,255,255,0.08)',
        { duration: 200 }
      ),
    };
  });

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.overlay}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Animated.View style={[styles.cardContainer, animatedModalStyle]}>
            <LinearGradient
              colors={isDark ? gradients.darkGlass : gradients.lightGlass}
              style={styles.modalGradient}
            >
              <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.text }]}>
                ⚙️ Settings
              </Text>

              {/* Theme Selector Option */}
              <View style={[styles.optionRow, { borderBottomColor: theme.colors.surfaceVariant }]}>
                <View style={styles.optionInfo}>
                  <Text variant="titleMedium" style={{ color: theme.colors.text, fontWeight: 'bold' }}>
                    Dark Theme Mode
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Toggle dark or light color palette
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleTheme();
                  }}
                  trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
                  thumbColor={Platform.OS === 'ios' ? undefined : '#FFF'}
                />
              </View>

              {/* Daily Reminder Toggle */}
              <View style={[styles.optionRow, { borderBottomColor: theme.colors.surfaceVariant }]}>
                <View style={styles.optionInfo}>
                  <Text variant="titleMedium" style={{ color: theme.colors.text, fontWeight: 'bold' }}>
                    Daily Reminders
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Notify at 5:00 PM & 10:00 PM to mark attendance
                  </Text>
                </View>
                <Switch
                  value={remindersEnabled}
                  onValueChange={async (val) => {
                    setRemindersEnabledState(val);
                    await setReminderEnabled(val);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
                  thumbColor={Platform.OS === 'ios' ? undefined : '#FFF'}
                />
              </View>

              {/* Edit Student Profile Name Option */}
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  👤 Edit Profile Name
                </Text>
              </View>

              <Animated.View style={[styles.inputWrapper, animatedInputStyle, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
                <TextInput
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    setError('');
                  }}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  style={[styles.input, { backgroundColor: 'transparent' }]}
                  textColor={theme.colors.text}
                  placeholder="Enter name"
                  onFocus={() => (nameFocus.value = 1)}
                  onBlur={() => (nameFocus.value = 0)}
                />
              </Animated.View>

              {!!error && <HelperText type="error" style={styles.msg}>{error}</HelperText>}
              {!!success && <Text style={[styles.msg, styles.successMsg, { color: theme.colors.attendanceGreen }]}>{success}</Text>}

              <View style={styles.saveBtnContainer}>
                <Button
                  mode="contained"
                  onPress={handleSaveName}
                  style={styles.saveBtn}
                  labelStyle={styles.btnLabel}
                  accessibilityLabel="Save profile name"
                >
                  Save Profile
                </Button>
              </View>

              {/* App Reset Panel */}
              <View style={[styles.resetContainer, { borderTopColor: theme.colors.surfaceVariant }]}>
                <Text variant="titleMedium" style={[styles.resetTitle, { color: theme.colors.error }]}>
                  ⚠️ Dangerous Actions
                </Text>
                <Text variant="bodySmall" style={[styles.resetDesc, { color: theme.colors.onSurfaceVariant }]}>
                  This clears everything and launches onboarding.
                </Text>
                <Button
                  mode="outlined"
                  onPress={handleResetData}
                  style={styles.resetBtn}
                  textColor={theme.colors.error}
                  borderColor={theme.colors.error}
                  labelStyle={styles.btnLabel}
                  accessibilityLabel="Clear all app data"
                >
                  Clear All App Data
                </Button>
              </View>

              {/* Backup & Restore Section */}
              <View style={[styles.resetContainer, { borderTopColor: theme.colors.surfaceVariant }]}>
                <Text variant="titleMedium" style={[styles.resetTitle, { color: theme.colors.text }]}>
                  Backup & Restore
                </Text>
                <Text variant="bodySmall" style={[styles.resetDesc, { color: theme.colors.onSurfaceVariant }]}>
                  Export all data to a JSON file or restore from a previous backup.
                </Text>
                <View style={styles.backupRow}>
                  <Button
                    mode="contained"
                    onPress={handleExport}
                    loading={exporting}
                    disabled={exporting || importing}
                    icon="export"
                    style={[styles.backupBtn, { flex: 1 }]}
                    labelStyle={styles.btnLabel}
                    accessibilityLabel="Export backup"
                  >
                    Export
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleImport}
                    loading={importing}
                    disabled={exporting || importing}
                    icon="import"
                    style={[styles.backupBtn, { flex: 1, backgroundColor: theme.colors.accent }]}
                    labelStyle={styles.btnLabel}
                    accessibilityLabel="Import backup"
                  >
                    Import
                  </Button>
                </View>
                {!!backupMsg && (
                  <Text style={[styles.msg, { color: backupMsg.includes('failed') ? theme.colors.error : theme.colors.attendanceGreen }]}>
                    {backupMsg}
                  </Text>
                )}
              </View>

              <View style={styles.actions}>
                <Button
                  onPress={onDismiss}
                  style={styles.closeButton}
                  textColor={theme.colors.onSurfaceVariant}
                >
                  Close Settings
                </Button>
              </View>
            </LinearGradient>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  keyboardView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...shadows.large,
  },
  modalGradient: {
    padding: 24,
  },
  title: {
    marginBottom: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  optionInfo: {
    flex: 1,
    paddingRight: 12,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  input: {
    height: 50,
  },
  msg: {
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  successMsg: {
    fontSize: 14,
  },
  saveBtnContainer: {
    marginBottom: 20,
  },
  saveBtn: {
    borderRadius: 12,
  },
  btnLabel: {
    fontWeight: 'bold',
  },
  resetContainer: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginBottom: 16,
  },
  resetTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resetDesc: {
    marginBottom: 12,
  },
  resetBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
  },
  backupRow: {
    flexDirection: 'row', gap: 10, marginBottom: 8,
  },
  backupBtn: {
    borderRadius: 12,
  },
  actions: {
    alignItems: 'center',
  },
  closeButton: {
    borderRadius: 12,
  },
});

export default SettingsModal;
