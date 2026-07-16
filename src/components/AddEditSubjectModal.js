import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Modal, Portal, Text, TextInput, Button, HelperText, useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useThemeContext } from '../utils/ThemeContext';
import { gradients, theme as appTheme, animations, shadows } from '../constants/theme';

const AddEditSubjectModal = ({ visible, onDismiss, onSave, editingSubject }) => {
  const theme = useTheme();
  const { isDark } = useThemeContext();
  const [name, setName] = useState('');
  const [attended, setAttended] = useState('0');
  const [total, setTotal] = useState('0');
  const [target, setTarget] = useState('75');
  const [lecturesPerWeek, setLecturesPerWeek] = useState('0');
  const [error, setError] = useState('');

  const translateY = useSharedValue(150);
  const scale = useSharedValue(0.95);
  const opacity = useSharedValue(0);
  const shakeX = useSharedValue(0);

  const nameFocus = useSharedValue(0);
  const attendedFocus = useSharedValue(0);
  const totalFocus = useSharedValue(0);
  const targetFocus = useSharedValue(0);
  const lpwFocus = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, animations.springConfig);
      scale.value = withSpring(1, animations.springConfig);
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(100, { duration: 200 });
      scale.value = withTiming(0.95, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  useEffect(() => {
    if (editingSubject) {
      setName(editingSubject.name);
      setAttended(String(editingSubject.attended));
      setTotal(String(editingSubject.total));
      setTarget(String(editingSubject.target || 75));
      setLecturesPerWeek(String(editingSubject.lecturesPerWeek || 0));
    } else {
      resetForm();
    }
  }, [editingSubject, visible]);

  const resetForm = () => {
    setName('');
    setAttended('0');
    setTotal('0');
    setTarget('75');
    setLecturesPerWeek('0');
    setError('');
  };

  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shakeX.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-4, { duration: 60 }),
      withTiming(4, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Subject name is required');
      triggerShake();
      return;
    }

    let attendedNum = parseInt(attended) || 0;
    let totalNum = parseInt(total) || 0;
    let targetNum = parseInt(target) || 75;
    let lecturesPerWeekNum = parseInt(lecturesPerWeek) || 0;

    // Input clamping
    targetNum = Math.max(1, Math.min(targetNum, 100));
    lecturesPerWeekNum = Math.max(0, Math.min(lecturesPerWeekNum, 50));
    attendedNum = Math.max(0, attendedNum);
    totalNum = Math.max(0, totalNum);

    if (attendedNum > totalNum) {
      setError('Attended lectures cannot exceed total');
      triggerShake();
      return;
    }

    const baselineAttended = editingSubject ? (editingSubject.baselineAttended ?? 0) : 0;
    const baselineTotal = editingSubject ? (editingSubject.baselineTotal ?? 0) : 0;

    onSave({
      id: editingSubject ? editingSubject.id : Date.now().toString(),
      name: name.trim(),
      attended: attendedNum,
      total: totalNum,
      target: targetNum,
      lecturesPerWeek: lecturesPerWeekNum,
      baselineAttended,
      baselineTotal,
    });

    resetForm();
    onDismiss();
  };

  const animatedModalStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
        { translateX: shakeX.value }
      ],
    };
  });

  const getFocusStyle = (focusedValue) => {
    return useAnimatedStyle(() => {
      return {
        borderColor: withTiming(
          focusedValue.value === 1 ? theme.colors.primary : theme.colors.cardBorder,
          { duration: 200 }
        ),
      };
    });
  };

  const glassGradient = isDark ? gradients.darkGlass : gradients.lightGlass;
  const inputBgColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)';

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
          <Animated.View style={[styles.cardContainer, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }, animatedModalStyle]}>
            <LinearGradient
              colors={glassGradient}
              style={styles.modalGradient}
            >
              <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.text }]}>
                {editingSubject ? '✍️ Edit Subject' : '📚 Add New Subject'}
              </Text>

              <Animated.View style={[styles.inputWrapper, { backgroundColor: inputBgColor }, getFocusStyle(nameFocus)]}>
                <TextInput
                  label="Subject Name"
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
                  theme={{ colors: { primary: theme.colors.primary } }}
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  onFocus={() => (nameFocus.value = 1)}
                  onBlur={() => (nameFocus.value = 0)}
                />
              </Animated.View>

              <View style={styles.row}>
                <Animated.View style={[styles.inputWrapper, styles.halfInput, { backgroundColor: inputBgColor }, getFocusStyle(attendedFocus)]}>
                  <TextInput
                    label="Attended"
                    value={attended}
                    onChangeText={(text) => {
                      setAttended(text);
                      setError('');
                    }}
                    keyboardType="numeric"
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    style={[styles.input, { backgroundColor: 'transparent' }]}
                    textColor={theme.colors.text}
                    theme={{ colors: { primary: theme.colors.primary } }}
                    onFocus={() => (attendedFocus.value = 1)}
                    onBlur={() => (attendedFocus.value = 0)}
                  />
                </Animated.View>
                <Animated.View style={[styles.inputWrapper, styles.halfInput, { backgroundColor: inputBgColor }, getFocusStyle(totalFocus)]}>
                  <TextInput
                    label="Total"
                    value={total}
                    onChangeText={(text) => {
                      setTotal(text);
                      setError('');
                    }}
                    keyboardType="numeric"
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    style={[styles.input, { backgroundColor: 'transparent' }]}
                    textColor={theme.colors.text}
                    theme={{ colors: { primary: theme.colors.primary } }}
                    onFocus={() => (totalFocus.value = 1)}
                    onBlur={() => (totalFocus.value = 0)}
                  />
                </Animated.View>
              </View>

              <View style={styles.row}>
                <Animated.View style={[styles.inputWrapper, styles.halfInput, { backgroundColor: inputBgColor }, getFocusStyle(targetFocus)]}>
                  <TextInput
                    label="Target %"
                    value={target}
                    onChangeText={(text) => {
                      setTarget(text);
                      setError('');
                    }}
                    keyboardType="numeric"
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    style={[styles.input, { backgroundColor: 'transparent' }]}
                    textColor={theme.colors.text}
                    theme={{ colors: { primary: theme.colors.primary } }}
                    onFocus={() => (targetFocus.value = 1)}
                    onBlur={() => (targetFocus.value = 0)}
                  />
                </Animated.View>
                <Animated.View style={[styles.inputWrapper, styles.halfInput, { backgroundColor: inputBgColor }, getFocusStyle(lpwFocus)]}>
                  <TextInput
                    label="Lectures/Week"
                    value={lecturesPerWeek}
                    onChangeText={(text) => {
                      setLecturesPerWeek(text);
                      setError('');
                    }}
                    keyboardType="numeric"
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    style={[styles.input, { backgroundColor: 'transparent' }]}
                    textColor={theme.colors.text}
                    theme={{ colors: { primary: theme.colors.primary } }}
                    onFocus={() => (lpwFocus.value = 1)}
                    onBlur={() => (lpwFocus.value = 0)}
                  />
                </Animated.View>
              </View>

              {editingSubject && (
                <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
                  Adjusts your starting count — today's marks still count separately
                </Text>
              )}

              {!!error && (
                <HelperText type="error" style={[styles.errorText, { color: theme.colors.error }]}>
                  {error}
                </HelperText>
              )}

              <View style={styles.actions}>
                <Button
                  onPress={onDismiss}
                  style={styles.cancelButton}
                  textColor={theme.colors.onSurfaceVariant}
                  labelStyle={styles.buttonLabel}
                >
                  Cancel
                </Button>

                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <Button
                    mode="contained"
                    onPress={handleSave}
                    style={styles.saveButton}
                    buttonColor="transparent"
                    labelStyle={[styles.buttonLabel, { color: '#FFF' }]}
                  >
                    Save Subject
                  </Button>
                </LinearGradient>
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
    backgroundColor: '#1E1E1E',
    ...shadows.large,
  },
  modalGradient: {
    padding: 24,
  },
  title: {
    marginBottom: 24,
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    overflow: 'hidden',
  },
  input: {
    backgroundColor: 'transparent',
    height: 54,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  hint: {
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  errorText: {
    color: appTheme.colors.error,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  cancelButton: {
    borderRadius: 12,
    marginRight: 8,
  },
  saveButtonGradient: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButton: {
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  buttonLabel: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default AddEditSubjectModal;
