import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert, Switch, Image, Linking, Pressable } from 'react-native';
import { Text, TextInput, Button, HelperText, useTheme, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import { isReminderEnabled, setReminderEnabled } from '../utils/notifications';
import { gradients } from '../constants/theme';

const SettingsScreen = ({ navigation }) => {
  const theme = useTheme();
  const { isDark, toggleTheme } = useThemeContext();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [remindersEnabled, setRemindersEnabledState] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

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
      "Reset App Data",
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

  return (
    <LinearGradient
      colors={isDark ? gradients.darkGlass : gradients.lightGlass}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          iconColor={theme.colors.text}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        />
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.text }]}>
          Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Theme Toggle */}
        <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <View style={styles.optionRow}>
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

          <View style={[styles.divider, { backgroundColor: theme.colors.surfaceVariant }]} />

          <View style={styles.optionRow}>
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
        </View>

        {/* How To Use App */}
        <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Learning
          </Text>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('HowToUse')}
            icon="help-circle"
            style={styles.howToBtn}
            textColor={theme.colors.primary}
            labelStyle={styles.btnLabel}
            accessibilityLabel="How to use the app"
          >
            How to Use the App
          </Button>
        </View>

        {/* Edit Profile Name */}
        <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Edit Profile Name
          </Text>

          <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
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
            />
          </View>

          {!!error && <HelperText type="error" style={styles.msg}>{error}</HelperText>}
          {!!success && <Text style={[styles.msg, styles.successMsg, { color: theme.colors.attendanceGreen }]}>{success}</Text>}

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

        {/* Backup & Restore */}
        <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Backup & Restore
          </Text>
          <Text variant="bodySmall" style={[styles.desc, { color: theme.colors.onSurfaceVariant }]}>
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

        {/* Privacy & Data */}
        <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Privacy & Data
          </Text>
          <View style={styles.privacyRow}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <View style={styles.privacyInfo}>
              <Text variant="bodyMedium" style={{ color: theme.colors.text, fontWeight: '600' }}>
                Your data stays on your device
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, lineHeight: 18 }}>
                All attendance records, notes, and settings are stored locally using on-device storage. We do not collect, transmit, or share any personal information.
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.surfaceVariant, marginVertical: 12 }]} />
          <View style={styles.privacyRow}>
            <Text style={styles.privacyIcon}>📁</Text>
            <View style={styles.privacyInfo}>
              <Text variant="bodyMedium" style={{ color: theme.colors.text, fontWeight: '600' }}>
                Backup your own data
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, lineHeight: 18 }}>
                Use Export above to create a JSON backup. No cloud sync is provided — you control your data.
              </Text>
            </View>
          </View>
        </View>

        {/* Know the Creator */}
        <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <View style={styles.creatorHeader}>
            <Image source={require('../../assets/icon.png')} style={styles.creatorAvatar} />
            <View style={styles.creatorInfo}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Know the Creator
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                Adarsh Pal
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.surfaceVariant, marginVertical: 12 }]} />
          <View style={styles.creatorLinks}>
            <Pressable style={styles.creatorLinkRow} onPress={() => Linking.openURL('https://github.com/pal-adarsh')} accessibilityLabel="GitHub profile">
              <Text style={styles.creatorLinkIcon}>🐙</Text>
              <View style={styles.creatorLinkContent}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>GitHub</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.text, fontWeight: '500' }} numberOfLines={1}>pal-adarsh</Text>
              </View>
              <IconButton icon="open-in-new" size={18} iconColor={theme.colors.onSurfaceVariant} />
            </Pressable>
            <Pressable style={styles.creatorLinkRow} onPress={() => Linking.openURL('mailto:adarsh.r.s.pal@gmail.com')} accessibilityLabel="Email">
              <Text style={styles.creatorLinkIcon}>📧</Text>
              <View style={styles.creatorLinkContent}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Email</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.text, fontWeight: '500' }} numberOfLines={1}>adarsh.r.s.pal@gmail.com</Text>
              </View>
              <IconButton icon="open-in-new" size={18} iconColor={theme.colors.onSurfaceVariant} />
            </Pressable>
            <Pressable style={styles.creatorLinkRow} onPress={() => Linking.openURL('https://linkedin.com/in/adarsh-pal-11212b292')} accessibilityLabel="LinkedIn profile">
              <Text style={styles.creatorLinkIcon}>💼</Text>
              <View style={styles.creatorLinkContent}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>LinkedIn</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.text, fontWeight: '500' }} numberOfLines={1}>Adarsh Pal</Text>
              </View>
              <IconButton icon="open-in-new" size={18} iconColor={theme.colors.onSurfaceVariant} />
            </Pressable>
          </View>
        </View>

        {/* Dangerous Actions */}
        <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.error }]}>
            Dangerous Actions
          </Text>
          <Text variant="bodySmall" style={[styles.desc, { color: theme.colors.onSurfaceVariant }]}>
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
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    marginLeft: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionInfo: {
    flex: 1,
    paddingRight: 12,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  desc: {
    marginBottom: 12,
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
  saveBtn: {
    borderRadius: 12,
  },
  btnLabel: {
    fontWeight: 'bold',
  },
  backupRow: {
    flexDirection: 'row', gap: 10, marginBottom: 8,
  },
  backupBtn: {
    borderRadius: 12,
  },
  resetBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
  },
  howToBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  privacyIcon: { fontSize: 24, marginTop: 2 },
  privacyInfo: { flex: 1 },
  creatorHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  creatorAvatar: {
    width: 44, height: 44, borderRadius: 12,
  },
  creatorInfo: { flex: 1 },
  creatorLinks: { gap: 4 },
  creatorLinkRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 4,
    borderRadius: 10,
  },
  creatorLinkIcon: { fontSize: 20, marginRight: 10 },
  creatorLinkContent: { flex: 1 },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginLeft: 4,
  },
});

export default SettingsScreen;
