import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeContext } from '../utils/ThemeContext';
import { gradients, shadows } from '../constants/theme';

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
            return <ErrorFallback onRetry={this.handleRetry} />;
        }
        return this.props.children;
    }
}

const ErrorFallback = ({ onRetry }) => {
    const theme = useTheme();
    const { isDark } = useThemeContext();

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <LinearGradient
                colors={isDark ? gradients.darkBackground : gradients.lightBackground}
                style={styles.container}
            >
                <View style={styles.content}>
                    <Text style={styles.emoji}>😵</Text>
                    <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.text }]}>
                        Something went wrong
                    </Text>
                    <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                        An unexpected error occurred. Please try again.
                    </Text>
                    <Button
                        mode="contained"
                        onPress={onRetry}
                        style={styles.button}
                        labelStyle={[styles.buttonLabel, { color: '#FFF' }]}
                        buttonColor={theme.colors.primary}
                    >
                        Try Again
                    </Button>
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
    subtitle: { textAlign: 'center', marginBottom: 24 },
    button: {
        borderRadius: 12, paddingHorizontal: 24, ...shadows.medium,
    },
    buttonLabel: { fontWeight: 'bold', fontSize: 16 },
});

export default ErrorBoundary;
