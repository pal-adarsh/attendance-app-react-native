import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeContext } from '../utils/ThemeContext';
import { gradients } from '../constants/theme';
import GradientCard from './GradientCard';

const ErrorStateCard = ({
    title = "Couldn't load data",
    message = "Check your device storage and try again.",
    onRetry,
    style
}) => {
    const theme = useTheme();
    const { isDark } = useThemeContext();

    return (
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.container, style]}>
            <GradientCard
                gradient={isDark ? gradients.darkCard : gradients.lightCard}
                style={styles.card}
            >
                <View style={styles.content}>
                    <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={42}
                        color={theme.colors.error}
                        style={{ marginBottom: 10 }}
                    />
                    <Text variant="titleMedium" style={[styles.title, { color: theme.colors.text }]}>
                        {title}
                    </Text>
                    <Text variant="bodySmall" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
                        {message}
                    </Text>
                    {onRetry && (
                        <Button
                            mode="contained"
                            onPress={onRetry}
                            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
                            labelStyle={styles.retryBtnLabel}
                            accessibilityLabel="Retry loading"
                        >
                            Retry
                        </Button>
                    )}
                </View>
            </GradientCard>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
    },
    card: {
        borderRadius: 16,
    },
    content: {
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 6,
        textAlign: 'center',
    },
    message: {
        textAlign: 'center',
        marginBottom: 16,
        maxWidth: 280,
        lineHeight: 18,
    },
    retryBtn: {
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    retryBtnLabel: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
});

export default ErrorStateCard;
