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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    id: 'welcome',
    emoji: '🎓',
    gradient: ['#7C3AED', '#A855F7'],
    title: 'All Your College\nWork, One Place',
    subtitle: 'Attendance, notes, tasks — everything you need to ace your semester, organized beautifully.',
    features: null,
  },
  {
    id: 'attendance',
    emoji: '📋',
    gradient: ['#2563EB', '#7C3AED'],
    title: 'Smart Attendance\nTracking',
    subtitle: 'Mark attendance in one tap. Get real-time stats and never miss the 75% threshold again.',
    features: [
      { icon: '✅', text: 'One-tap daily attendance' },
      { icon: '📊', text: 'Analytics & attendance streaks' },
      { icon: '📅', text: 'Weekly timetable planner' },
    ],
  },
  {
    id: 'notes',
    emoji: '📝',
    gradient: ['#059669', '#0D9488'],
    title: 'Notes That Stay\nOrganized',
    subtitle: 'Write, pin and archive notes per subject. Search instantly and keep your study material tidy.',
    features: [
      { icon: '📌', text: 'Pin important notes to the top' },
      { icon: '🔍', text: 'Instant full-text search' },
      { icon: '🗂️', text: 'Archive to declutter anytime' },
    ],
  },
  {
    id: 'todo',
    emoji: '☑️',
    gradient: ['#D97706', '#EA580C'],
    title: 'To-Do List for\nEvery Task',
    subtitle: 'Add assignments, deadlines and study goals. Track active vs. completed tasks at a glance.',
    features: [
      { icon: '🎯', text: 'Add tasks instantly from notes tab' },
      { icon: '🔄', text: 'Filter: All / Active / Completed' },
      { icon: '🧹', text: 'Clear done tasks in one tap' },
    ],
  },
  {
    id: 'setup',
    emoji: null,
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
      {/* Emoji icon with gradient bubble */}
      <Animated.View style={[styles.emojiWrapper, floatStyle]}>
        <LinearGradient colors={slide.gradient} style={styles.emojiBubble}>
          <Text style={styles.slideEmoji}>{slide.emoji}</Text>
        </LinearGradient>
        {/* Glow ring */}
        <View style={[styles.glowRing, { borderColor: slide.gradient[0] + '40' }]} />
      </Animated.View>

      <Text style={[styles.slideTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
        {slide.title}
      </Text>
      <Text style={[styles.slideSubtitle, { color: isDark ? '#A1A1AA' : '#64748B' }]}>
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
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={[styles.featureText, { color: isDark ? '#D4D4D8' : '#334155' }]}>
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
      backgroundColor: isDark ? '#BB86FC' : '#7C3AED',
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
    if (!name.trim()) {
      setError('Please enter your name to continue');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setIsSubmitting(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await StorageService.saveStudentProfile({ name: name.trim(), setupComplete: true });
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
                    🔒 Your data stays on this device only. Nothing is ever uploaded.
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

        {/* Next / Get Started button */}
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
                {isLastSlide ? (isSubmitting ? 'Setting up...' : '🚀 Get Started') : 'Next  →'}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Skip button on non-last slides */}
        {!isLastSlide && (
          <Pressable
            onPress={() => {
              scrollRef.current?.scrollTo({ x: (TOTAL_SLIDES - 1) * SCREEN_WIDTH, animated: true });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.skipBtn, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]}
          >
            <Text style={[styles.skipText, { color: isDark ? '#A1A1AA' : '#64748B' }]}>Skip intro</Text>
          </Pressable>
        )}
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
