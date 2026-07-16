import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, shadows } from '../constants/theme';

export default class ErrorBoundary extends React.Component {
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
            return (
                <SafeAreaView style={{ flex: 1 }}>
                    <LinearGradient
                        colors={gradients.darkBackground}
                        style={styles.container}
                    >
                        <View style={styles.content}>
                            <Text style={styles.emoji}>😵</Text>
                            <Text variant="headlineSmall" style={styles.title}>
                                Something went wrong
                            </Text>
                            <Text variant="bodyMedium" style={styles.subtitle}>
                                An unexpected error occurred. Please try again.
                            </Text>
                            <Button
                                mode="contained"
                                onPress={this.handleRetry}
                                style={styles.button}
                                labelStyle={styles.buttonLabel}
                                buttonColor="#BB86FC"
                            >
                                Try Again
                            </Button>
                        </View>
                    </LinearGradient>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        color: '#FFF',
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        color: '#A1A1AA',
        textAlign: 'center',
        marginBottom: 24,
    },
    button: {
        borderRadius: 12,
        paddingHorizontal: 24,
        ...shadows.medium,
    },
    buttonLabel: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#FFF',
    },
});
