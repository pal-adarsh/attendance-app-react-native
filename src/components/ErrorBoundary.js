import React, { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withSpring,
} from 'react-native-reanimated';
import { useThemeContext } from '../utils/ThemeContext';
import { gradients, shadows, animations } from '../constants/theme';

class ErrorBoundaryInner extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return <ErrorFallback onRetry={this.handleRetry} error={this.state.error} />;
        }
        return this.props.children;
    }
}

const ErrorFallback = ({ onRetry, error }) => {
    const theme = useTheme();
    const { isDark } = useThemeContext();
    const emojiScale = useSharedValue(1);
    const buttonScale = useSharedValue(1);

    useEffect(() => {
        emojiScale.value = withRepeat(
            withSequence(
                withTiming(1.12, { duration: 800 }),
                withTiming(1, { duration: 800 })
            ),
            -1, true
        );
    }, []);

    const emojiStyle = useAnimatedStyle(() => ({
        transform: [{ scale: emojiScale.value }],
    }));

    const btnStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const errorType = error?.message?.split(':')[0] || error?.name || 'Error';

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <LinearGradient
                colors={isDark ? gradients.darkBackground : gradients.lightBackground}
                style={styles.container}
            >
                <View style={styles.content}>
                    <Animated.View style={emojiStyle}>
                        <Text style={styles.emoji}>😵</Text>
                    </Animated.View>
                    <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.text }]}>
                        Something went wrong
                    </Text>
                    <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                        {errorType}. Please try restarting the app.
                    </Text>
                    <Animated.View style={btnStyle}>
                        <Pressable
                            onPressIn={() => { buttonScale.value = withSpring(0.95, animations.bouncySpring); }}
                            onPressOut={() => { buttonScale.value = withSpring(1, animations.bouncySpring); }}
                            onPress={onRetry}
                        >
                            <LinearGradient
                                colors={gradients.primary}
                                style={[styles.buttonGradient, shadows.medium]}
                            >
                                <Text style={styles.buttonLabel}>Try Again</Text>
                            </LinearGradient>
                        </Pressable>
                    </Animated.View>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
};

const ErrorBoundary = (props) => <ErrorBoundaryInner {...props} />;

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
        flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32,
    },
    emoji: { fontSize: 64, marginBottom: 16 },
    title: { fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    subtitle: { textAlign: 'center', marginBottom: 24, opacity: 0.8 },
    buttonGradient: {
        borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12,
    },
    buttonLabel: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});

export default ErrorBoundary;
