import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
} from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import * as Haptics from 'expo-haptics';
import { gradients, shadows, animations } from '../constants/theme';
import { sanitizeText } from '../utils/security';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    id: 'attendance',
    icon: 'calendar-check',
    gradient: ['#FF8533', '#FF6B00'],
    title: 'Smart Daily Attendance',
    subtitle: 'Mark lectures with real status types: Present, Absent, On Duty (OD), and Cancelled.',
    features: [
      { text: 'One-tap attendance marking with instant percentage' },
      { text: 'College Duty (OD) & Cancelled class support' },
      { text: 'Mark custom working Saturdays & national holidays' },
    ],
  },
  {
    id: 'bunk_simulator',
    icon: 'calculator-variant',
    gradient: ['#F97316', '#EA580C'],
    title: 'What-If Bunk Simulator',
    subtitle: 'Simulate future absences before taking off to ensure you never fall below target.',
    features: [
      { text: 'Simulate bunking 1 to 10+ upcoming lectures' },
      { text: 'Instant shortage alerts and safe-to-bunk buffer' },
      { text: 'Calculates exact recovery classes needed' },
    ],
  },
  {
    id: 'timetable_qr',
    icon: 'qrcode-scan',
    gradient: ['#FB923C', '#D97706'],
    title: 'Timetable & QR Sync',
    subtitle: 'View all 6 days in a 3×2 grid. Share your schedule or scan your classmate’s QR live.',
    features: [
      { text: 'All 6 days visible at once without scrolling' },
      { text: 'Built-in camera scanner to import schedules instantly' },
      { text: 'Add extra or compensatory lectures on any day' },
    ],
  },
  {
    id: 'notes_tasks',
    icon: 'notebook-edit-outline',
    gradient: ['#EA580C', '#C2410C'],
    title: 'Subject Notes & Tasks',
    subtitle: 'Keep lecture notes organized per subject and track your assignments and study goals.',
    features: [
      { text: 'Organized notes linked directly to your subjects' },
      { text: 'Active vs. Completed assignment to-do checklists' },
      { text: '100% private, on-device local storage' },
    ],
  },
  {
    id: 'setup',
    icon: null,
    gradient: null,
    title: "What's your name?",
    subtitle: "We'll personalise your experience. Your data stays on-device, always private.",
    features: null,
  },
];

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const SlideCard = ({ slide, index, scrollX, isDark, theme }) => {
  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP);
    const scale = interpolate(scrollX.value, inputRange, [0.88, 1, 0.88], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [20, 0, 20], Extrapolation.CLAMP);
    return { opacity, transform: [{ scale }, { translateY }] };
  });

  const floatValue = useSharedValue(0);
  useEffect(() => {
    floatValue.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2200 }),
        withTiming(0, { duration: 2200 })
      ),
      -1, true
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatValue.value }],
  }));

  if (slide.id === 'setup') return null; // setup slide rendered separately

  return (
    <Animated.View style={[styles.slideCard, animatedStyle]}>
      {/* Icon with gradient bubble */}
      <Animated.View style={[styles.emojiWrapper, floatStyle]}>
        <LinearGradient colors={slide.gradient} style={styles.emojiBubble}>
          <MaterialCommunityIcons name={slide.icon} size={38} color="#FFF" />
        </LinearGradient>
        {/* Glow ring */}
        <View style={[styles.glowRing, { borderColor: slide.gradient[0] + '40' }]} />
      </Animated.View>

      <Text style={[styles.slideTitle, { color: theme.colors.text }]}>
        {slide.title}
      </Text>
      <Text style={[styles.slideSubtitle, { color: theme.colors.onSurfaceVariant }]}>
        {slide.subtitle}
      </Text>

      {slide.features && (
        <View style={styles.featuresList}>
          {slide.features.map((f, i) => (
            <View
              key={i}
              style={[
                styles.featureRow,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.03)',
                  borderColor: isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.06)',
                },
              ]}
            >
              <MaterialCommunityIcons name="check" size={16} color={theme.colors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.featureText, { color: theme.colors.text }]}>
                {f.text}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
};

const PagerDot = ({ index, scrollX, isDark }) => {
  const dotStyle = useAnimatedStyle(() => {
    const width = interpolate(
      scrollX.value,
      [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH],
      [8, 24, 8],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH],
      [0.25, 1, 0.25],
      Extrapolation.CLAMP
    );
    return {
      width,
      opacity,
      backgroundColor: isDark ? '#FB923C' : '#EA580C',
    };
  });
  return <Animated.View style={[styles.dot, dotStyle]} />;
};


const OnboardingScreen = ({ navigation }) => {
  const theme = useTheme();
  const { isDark } = useThemeContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef(null);
  const scrollX = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  const TOTAL_SLIDES = SLIDES.length;
  const isLastSlide = currentIndex === TOTAL_SLIDES - 1;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleScroll = (event) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const goNext = () => {
    if (currentIndex < TOTAL_SLIDES - 1) {
      scrollRef.current?.scrollTo({ x: (currentIndex + 1) * SCREEN_WIDTH, animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    const cleanName = sanitizeText(name, 50);
    if (!cleanName) {
      setError('Please enter your name to continue');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setIsSubmitting(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await StorageService.saveStudentProfile({ name: cleanName, setupComplete: true });
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e) {
      console.error('Failed to save profile', e);
      setIsSubmitting(false);
    }
  };

  const handlePressIn = () => { buttonScale.value = withSpring(0.95, animations.bouncySpring); };
  const handlePressOut = () => { buttonScale.value = withSpring(1, animations.bouncySpring); };

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <LinearGradient colors={backgroundGradient} style={styles.container}>
      {/* Slide pager */}
      <AnimatedScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={{ width: SCREEN_WIDTH * TOTAL_SLIDES }}
      >
        {SLIDES.map((slide, index) => {
          if (slide.id === 'setup') {
            return (
              <View
                key={slide.id}
                style={[styles.slideWrapper, { width: SCREEN_WIDTH }]}
              >
                <View style={styles.setupContent}>
                  {/* App icon */}
                  <View style={styles.setupIconWrapper}>
                    <LinearGradient colors={gradients.primary} style={styles.setupIconGradient}>
                      <Image
                        source={require('../../assets/icon.png')}
                        style={styles.setupIcon}
                      />
                    </LinearGradient>
                  </View>

                  <Text style={[styles.setupTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {slide.title}
                  </Text>
                  <Text style={[styles.setupSubtitle, { color: isDark ? '#A1A1AA' : '#64748B' }]}>
                    {slide.subtitle}
                  </Text>

                  <Text style={[styles.inputLabel, { color: isDark ? '#E4E4E7' : '#334155' }]}>
                    Your Name
                  </Text>
                  <TextInput
                    placeholder="Enter your name"
                    placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
                    value={name}
                    onChangeText={(t) => { setName(t); setError(''); }}
                    mode="outlined"
                    style={styles.nameInput}
                    error={!!error}
                    onSubmitEditing={handleGetStarted}
                    outlineColor={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}
                    activeOutlineColor={theme.colors.primary}
                    textColor={theme.colors.text}
                    theme={{ colors: { background: 'transparent' } }}
                    returnKeyType="done"
                    autoCapitalize="words"
                  />
                  {!!error && (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
                  )}

                  <Text style={[styles.privacyNote, { color: isDark ? '#71717A' : '#94A3B8' }]}>
                    Your data stays on this device only. Offline & private.
                  </Text>
                </View>
              </View>
            );
          }

          return (
            <View key={slide.id} style={[styles.slideWrapper, { width: SCREEN_WIDTH }]}>
              <SlideCard
                slide={slide}
                index={index}
                scrollX={scrollX}
                isDark={isDark}
                theme={theme}
              />
            </View>
          );
        })}
      </AnimatedScrollView>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <PagerDot key={i} index={i} scrollX={scrollX} isDark={isDark} />
          ))}
        </View>

        {/* Continue / Get Started button */}
        <Animated.View style={[styles.nextBtnWrapper, buttonAnimStyle]}>
          <Pressable
            onPress={goNext}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isSubmitting}
            style={styles.nextBtnWrapper}
            accessibilityLabel={isLastSlide ? 'Get Started' : 'Next slide'}
          >
            <LinearGradient
              colors={isLastSlide ? gradients.success : gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.nextBtn, shadows.medium]}
            >
              <Text style={styles.nextBtnText}>
                {isLastSlide ? (isSubmitting ? 'Setting up...' : 'Get Started') : 'Continue'}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  slideWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },

  // Slide card
  slideCard: {
    width: '100%',
    alignItems: 'center',
  },
  emojiWrapper: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBubble: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
  },
  slideEmoji: {
    fontSize: 52,
  },
  glowRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
  },
  slideTitle: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 28,
    paddingHorizontal: 8,
  },

  // Features
  featuresList: { width: '100%', gap: 10 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  featureIcon: { fontSize: 20 },
  featureText: { fontSize: 14, fontWeight: '500', flex: 1 },

  // Setup (last slide)
  setupContent: {
    width: '100%',
    alignItems: 'center',
  },
  setupIconWrapper: { marginBottom: 24 },
  setupIconGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
  },
  setupIcon: { width: 58, height: 58, borderRadius: 12 },
  setupTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  setupSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  nameInput: {
    width: '100%',
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  privacyNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 12,
    alignItems: 'center',
    gap: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtnWrapper: { width: '100%' },
  nextBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  nextBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  skipBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { fontSize: 14, fontWeight: '600' },
});

export default OnboardingScreen;
