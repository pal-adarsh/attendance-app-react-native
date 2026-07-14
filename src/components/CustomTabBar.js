import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useThemeContext } from '../utils/ThemeContext';
import { shadows, animations } from '../constants/theme';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width;
const TAB_PADDING = 8;

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { theme, isDark } = useThemeContext();
  const routesCount = state.routes.length;
  const tabWidth = (TAB_BAR_WIDTH - TAB_PADDING * 2) / routesCount;

  // Shared value for sliding indicator X position
  const indicatorX = useSharedValue(0);

  useEffect(() => {
    indicatorX.value = withSpring(
      state.index * tabWidth,
      animations.springConfig
    );
  }, [state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: indicatorX.value }],
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.surfaceVariant, shadowColor: isDark ? '#000' : '#0F172A' }]}>
      {/* Animated active indicator pill background */}
      <Animated.View
        style={[
          styles.activeIndicator,
          {
            width: tabWidth,
            backgroundColor: theme.colors.tabIndicatorGlow,
            borderColor: theme.colors.cardBorder
          },
          indicatorStyle,
        ]}
      />

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate({ name: route.name, merge: true });
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Icon resolution
        let iconName = 'home';
        if (route.name === 'Today') iconName = 'home';
        else if (route.name === 'Timetable') iconName = 'calendar-week';
        else if (route.name === 'Subjects') iconName = 'book-multiple';
        else if (route.name === 'Calendar') iconName = 'calendar-edit';
        else if (route.name === 'Analytics') iconName = 'chart-box';

        return (
          <TabItem
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            isFocused={isFocused}
            iconName={iconName}
            label={label}
            tabWidth={tabWidth}
            theme={theme}
            isDark={isDark}
          />
        );
      })}
    </View>
  );
};

// Sub-component for individual tab items with spring scaling on press
const TabItem = ({ onPress, onLongPress, isFocused, iconName, label, tabWidth, theme, isDark }) => {
  const scale = useSharedValue(isFocused ? 1.15 : 1);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.15 : 1, animations.bouncySpring);
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const activeTextColor = isDark ? '#FFF' : theme.colors.primary;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.tabButton, { width: tabWidth }]}
    >
      <Animated.View style={animatedIconStyle}>
        <MaterialCommunityIcons
          name={iconName}
          size={24}
          color={isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant}
        />
      </Animated.View>
      <Text
        variant="labelSmall"
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          styles.label,
          {
            color: isFocused ? activeTextColor : theme.colors.onSurfaceVariant,
            fontWeight: isFocused ? 'bold' : 'normal',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: TAB_PADDING,
    borderTopWidth: 1,
    ...shadows.large,
    position: 'relative',
    height: 64,
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 1,
  },
  activeIndicator: {
    position: 'absolute',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    bottom: 8,
    left: TAB_PADDING,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.2,
  },
});

export default CustomTabBar;

