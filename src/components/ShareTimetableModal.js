import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, Share, ActivityIndicator, Pressable, Dimensions } from 'react-native';
import { Modal, Portal, Text, TextInput, Button, useTheme, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useThemeContext } from '../utils/ThemeContext';
import { gradients, shadows } from '../constants/theme';
import { StorageService } from '../utils/storage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ShareTimetableModal = ({ visible, onDismiss, timetable = {}, subjects = [], onImportSuccess }) => {
  const theme = useTheme();
  const { isDark } = useThemeContext();

  const [activeTab, setActiveTab] = useState('share'); // 'share' | 'scan' | 'paste'
  const [importCode, setImportCode] = useState('');
  const [qrLoading, setQrLoading] = useState(true);
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Camera scanner states
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedTimetable, setScannedTimetable] = useState(null);

  // Reset scanner when modal opens or closes
  const handleDismiss = () => {
    setScanned(false);
    setScannedTimetable(null);
    setImportError('');
    onDismiss();
  };

  // Generate lightweight shareable payload
  const sharePayload = useMemo(() => {
    try {
      const subjectMap = {};
      subjects.forEach(s => {
        subjectMap[s.id] = { name: s.name, target: s.target || 75, lecturesPerWeek: s.lecturesPerWeek || 0 };
      });

      const cleanTimetable = {};
      for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']) {
        const daySubjNames = (timetable[day] || [])
          .map(id => subjectMap[id]?.name)
          .filter(Boolean);
        if (daySubjNames.length > 0) {
          cleanTimetable[day] = daySubjNames;
        }
      }

      const bundle = {
        type: 'ATTENDANCE_TIMETABLE_V1',
        createdAt: new Date().toISOString(),
        subjects: Object.values(subjectMap),
        schedule: cleanTimetable,
      };

      return JSON.stringify(bundle);
    } catch (e) {
      console.error('Failed to construct timetable share payload', e);
      return '';
    }
  }, [timetable, subjects]);

  const qrUri = useMemo(() => {
    if (!sharePayload) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(sharePayload)}`;
  }, [sharePayload]);

  const handleShareSheet = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        title: 'Class Timetable',
        message: `Here is our class timetable for Attendance Calculator app:\n\n${sharePayload}`,
      });
    } catch (e) {
      console.error('Failed to share timetable', e);
    }
  };

  // Core Import Handler (Unified for Scan & Paste)
  const executeImport = async (parsed) => {
    setIsImporting(true);
    setImportError('');

    try {
      if (!parsed.schedule || !Array.isArray(parsed.subjects)) {
        throw new Error('Invalid format: missing subjects or schedule');
      }

      // Merge subjects
      const existingSubjects = await StorageService.loadSubjects();
      const updatedSubjects = [...existingSubjects];
      const nameToId = {};

      existingSubjects.forEach(s => {
        nameToId[s.name.toLowerCase().trim()] = s.id;
      });

      parsed.subjects.forEach(sub => {
        const normalized = sub.name.toLowerCase().trim();
        if (!nameToId[normalized]) {
          const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          const newSub = {
            id: newId,
            name: sub.name.trim(),
            attended: 0,
            total: 0,
            target: sub.target || 75,
            lecturesPerWeek: sub.lecturesPerWeek || 0,
            baselineAttended: 0,
            baselineTotal: 0,
          };
          updatedSubjects.push(newSub);
          nameToId[normalized] = newId;
        }
      });

      await StorageService.saveSubjects(updatedSubjects);

      // Reconstruct timetable with mapped IDs
      const newTimetable = {
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [],
      };

      for (const day of Object.keys(parsed.schedule)) {
        if (newTimetable[day] !== undefined) {
          const names = parsed.schedule[day] || [];
          newTimetable[day] = names
            .map(n => nameToId[n.toLowerCase().trim()])
            .filter(Boolean);
        }
      }

      // If Saturday has classes, automatically enable Saturday in working days
      if (newTimetable.Saturday && newTimetable.Saturday.length > 0) {
        await StorageService.setSaturdayEnabled(true);
      }

      await StorageService.saveTimetable(newTimetable);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Timetable Imported! 🎉',
        `Successfully imported ${parsed.subjects.length} subjects and your weekly class schedule.`,
        [{
          text: 'Awesome',
          onPress: () => {
            handleDismiss();
            onImportSuccess?.();
          }
        }]
      );
    } catch (e) {
      console.error('Import failed', e);
      setImportError(`Failed to import timetable: ${e.message}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleApplyPasteImport = () => {
    if (!importCode.trim()) {
      setImportError('Please paste a timetable code or JSON.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      let jsonString = importCode.trim();
      const jsonStart = jsonString.indexOf('{');
      const jsonEnd = jsonString.lastIndexOf('}');
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
      }
      const parsed = JSON.parse(jsonString);
      executeImport(parsed);
    } catch (e) {
      setImportError('Invalid timetable JSON code format.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // QR Barcode Scanned Callback
  const handleBarcodeScanned = ({ data }) => {
    if (scanned || isImporting) return;
    setScanned(true);

    try {
      let jsonString = (data || '').trim();
      const jsonStart = jsonString.indexOf('{');
      const jsonEnd = jsonString.lastIndexOf('}');
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
      }

      const parsed = JSON.parse(jsonString);
      if (!parsed.schedule || !Array.isArray(parsed.subjects)) {
        throw new Error('Not an Attendance timetable code');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScannedTimetable(parsed);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Unrecognized QR Code',
        'This QR code does not contain a valid attendance timetable. Please ensure your friend displays their timetable QR code.',
        [{ text: 'Try Again', onPress: () => { setScanned(false); setScannedTimetable(null); } }]
      );
    }
  };

  const glassGradient = isDark ? gradients.darkGlass : gradients.lightGlass;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={styles.modalOverlay}
      >
        <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
          <LinearGradient colors={glassGradient} style={styles.gradientContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text variant="titleLarge" style={[styles.title, { color: theme.colors.text }]}>
                  {activeTab === 'share' && '📲 Share Timetable'}
                  {activeTab === 'scan' && '📷 Scan Friend\'s QR'}
                  {activeTab === 'paste' && '📋 Paste Timetable'}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {activeTab === 'share' && 'Show this QR or share link with classmates'}
                  {activeTab === 'scan' && 'Scan a classmate’s timetable QR directly'}
                  {activeTab === 'paste' && 'Import schedule via JSON or shared text'}
                </Text>
              </View>
              <IconButton
                icon="close"
                size={22}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={handleDismiss}
              />
            </View>

            {/* 3-Tab Segmented Selector */}
            <View style={[styles.toggleContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
              <Pressable
                onPress={() => { setActiveTab('share'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.toggleBtn, activeTab === 'share' && { backgroundColor: theme.colors.primary, ...shadows.small }]}
              >
                <Text style={[styles.toggleText, { color: activeTab === 'share' ? '#FFF' : theme.colors.onSurfaceVariant, fontWeight: activeTab === 'share' ? 'bold' : '600' }]}>
                  Share QR
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setActiveTab('scan');
                  setScanned(false);
                  setScannedTimetable(null);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[styles.toggleBtn, activeTab === 'scan' && { backgroundColor: theme.colors.primary, ...shadows.small }]}
              >
                <Text style={[styles.toggleText, { color: activeTab === 'scan' ? '#FFF' : theme.colors.onSurfaceVariant, fontWeight: activeTab === 'scan' ? 'bold' : '600' }]}>
                  Scan QR
                </Text>
              </Pressable>

              <Pressable
                onPress={() => { setActiveTab('paste'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.toggleBtn, activeTab === 'paste' && { backgroundColor: theme.colors.primary, ...shadows.small }]}
              >
                <Text style={[styles.toggleText, { color: activeTab === 'paste' ? '#FFF' : theme.colors.onSurfaceVariant, fontWeight: activeTab === 'paste' ? 'bold' : '600' }]}>
                  Paste Code
                </Text>
              </Pressable>
            </View>

            {/* Tab 1: Share QR */}
            {activeTab === 'share' && (
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.shareContent}>
                  <View style={[styles.qrWrapper, { backgroundColor: '#FFFFFF', borderColor: theme.colors.cardBorder }]}>
                    {qrLoading && (
                      <View style={styles.qrLoader}>
                        <ActivityIndicator color="#6D28D9" />
                      </View>
                    )}
                    <Image
                      source={{ uri: qrUri }}
                      style={styles.qrImage}
                      onLoad={() => setQrLoading(false)}
                      onError={() => setQrLoading(false)}
                    />
                  </View>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 12, marginBottom: 14 }}>
                    Friends can open "Scan QR" on their phone and point at this screen
                  </Text>

                  <Button
                    mode="contained"
                    icon="share-variant"
                    onPress={handleShareSheet}
                    style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                    contentStyle={{ paddingVertical: 4 }}
                    labelStyle={{ color: '#FFF', fontWeight: 'bold' }}
                  >
                    Share Timetable Link / Text
                  </Button>
                </View>
              </ScrollView>
            )}

            {/* Tab 2: Scan QR Live */}
            {activeTab === 'scan' && (
              <View style={styles.tabContainer}>
                {!permission ? (
                  <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                  </View>
                ) : !permission.granted ? (
                  <View style={styles.permissionCard}>
                    <View style={[styles.permIconCircle, { backgroundColor: theme.colors.primary + '18' }]}>
                      <IconButton icon="camera" iconColor={theme.colors.primary} size={36} />
                    </View>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.text, marginTop: 12, textAlign: 'center' }}>
                      Camera Access Required
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 6, marginBottom: 20, paddingHorizontal: 16 }}>
                      Camera access is needed to scan your classmate's timetable QR code directly.
                    </Text>
                    <Button
                      mode="contained"
                      icon="camera"
                      onPress={async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        const res = await requestPermission();
                        if (!res.granted) {
                          Alert.alert('Permission Denied', 'You can still import timetables by pasting the text in the "Paste Code" tab.');
                        }
                      }}
                      style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                      labelStyle={{ color: '#FFF', fontWeight: 'bold' }}
                    >
                      Enable Camera
                    </Button>
                  </View>
                ) : scannedTimetable ? (
                  /* Timetable Detected Preview */
                  <View style={styles.previewContainer}>
                    <View style={[styles.detectedBadge, { backgroundColor: theme.colors.attendanceGreen + '20', borderColor: theme.colors.attendanceGreen }]}>
                      <IconButton icon="check-decagram" iconColor={theme.colors.attendanceGreen} size={28} style={{ margin: 0 }} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.text }}>
                          Timetable Code Detected!
                        </Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Found {scannedTimetable.subjects?.length || 0} subjects in schedule
                        </Text>
                      </View>
                    </View>

                    <ScrollView style={{ flex: 1, marginVertical: 12 }} showsVerticalScrollIndicator={false}>
                      <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 }}>
                        SUBJECTS TO IMPORT
                      </Text>
                      <View style={styles.chipsWrap}>
                        {(scannedTimetable.subjects || []).map((sub, idx) => (
                          <View key={idx} style={[styles.previewSubjectPill, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary + '35' }]}>
                            <Text style={[styles.previewSubjectText, { color: theme.colors.text }]}>
                              {sub.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>

                    <View style={styles.previewBottomActions}>
                      <Button
                        mode="contained"
                        icon="download"
                        onPress={() => executeImport(scannedTimetable)}
                        loading={isImporting}
                        disabled={isImporting}
                        style={[styles.actionBtn, { backgroundColor: theme.colors.primary, marginBottom: 8 }]}
                        labelStyle={{ color: '#FFF', fontWeight: 'bold' }}
                      >
                        Import & Apply Timetable
                      </Button>
                      <Button
                        mode="outlined"
                        icon="camera-retake"
                        onPress={() => {
                          setScanned(false);
                          setScannedTimetable(null);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        textColor={theme.colors.onSurfaceVariant}
                        style={{ borderColor: theme.colors.cardBorder, borderRadius: 12 }}
                      >
                        Scan Another Code
                      </Button>
                    </View>
                  </View>
                ) : (
                  /* Live Camera Viewfinder */
                  <View style={styles.cameraSection}>
                    <View style={[styles.cameraFrame, { borderColor: theme.colors.cardBorder }]}>
                      <CameraView
                        style={StyleSheet.absoluteFillObject}
                        facing="back"
                        barcodeScannerSettings={{
                          barcodeTypes: ['qr'],
                        }}
                        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                      />
                      {/* Targeting Corner Reticle */}
                      <View style={styles.reticleOverlay} pointerEvents="none">
                        <View style={[styles.reticleCornerTL, { borderColor: theme.colors.primary }]} />
                        <View style={[styles.reticleCornerTR, { borderColor: theme.colors.primary }]} />
                        <View style={[styles.reticleCornerBL, { borderColor: theme.colors.primary }]} />
                        <View style={[styles.reticleCornerBR, { borderColor: theme.colors.primary }]} />
                      </View>
                    </View>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }}>
                      Center your friend's timetable QR inside the box
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Tab 3: Paste Code */}
            {activeTab === 'paste' && (
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.importContent}>
                  <Text variant="bodySmall" style={{ color: theme.colors.text, marginBottom: 8, fontWeight: '600' }}>
                    Paste the shared timetable JSON text from your classmate:
                  </Text>

                  <TextInput
                    mode="outlined"
                    placeholder='{"type":"ATTENDANCE_TIMETABLE_V1"...}'
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    value={importCode}
                    onChangeText={(t) => { setImportCode(t); setImportError(''); }}
                    multiline
                    numberOfLines={6}
                    style={styles.importInput}
                    outlineColor={theme.colors.cardBorder}
                    activeOutlineColor={theme.colors.primary}
                    textColor={theme.colors.text}
                  />

                  {!!importError && (
                    <Text variant="labelSmall" style={{ color: theme.colors.error, marginTop: 6 }}>
                      {importError}
                    </Text>
                  )}

                  <Button
                    mode="contained"
                    icon="download"
                    onPress={handleApplyPasteImport}
                    loading={isImporting}
                    disabled={isImporting || !importCode.trim()}
                    style={[styles.actionBtn, { backgroundColor: theme.colors.primary, marginTop: 16 }]}
                    contentStyle={{ paddingVertical: 4 }}
                    labelStyle={{ color: '#FFF', fontWeight: 'bold' }}
                  >
                    Import & Save Timetable
                  </Button>
                </View>
              </ScrollView>
            )}
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
    height: Math.min(SCREEN_HEIGHT * 0.88, 680),
  },
  gradientContainer: {
    flex: 1,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 12.5,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  shareContent: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  qrWrapper: {
    width: 220,
    height: 220,
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  qrLoader: {
    position: 'absolute',
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  tabContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  cameraFrame: {
    width: 240,
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    ...shadows.medium,
  },
  reticleOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 14,
  },
  reticleCornerTL: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 24,
    height: 24,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 6,
  },
  reticleCornerTR: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 24,
    height: 24,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 6,
  },
  reticleCornerBL: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    width: 24,
    height: 24,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 6,
  },
  reticleCornerBR: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 24,
    height: 24,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 6,
  },
  permissionCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  permIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  detectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewSubjectPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  previewSubjectText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  previewBottomActions: {
    paddingTop: 8,
  },
  actionBtn: {
    width: '100%',
    borderRadius: 12,
  },
  importContent: {
    paddingVertical: 4,
  },
  importInput: {
    backgroundColor: 'transparent',
    fontSize: 13,
  },
});

export default ShareTimetableModal;
