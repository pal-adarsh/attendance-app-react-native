import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { StorageService } from '../utils/storage';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';

const OnboardingScreen = ({ navigation }) => {
    const theme = useTheme();
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 20,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleContinue = async () => {
        if (!name.trim()) {
            setError('Please enter your name');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        try {
            await StorageService.saveStudentProfile({
                name: name.trim(),
                setupComplete: true
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.replace('MainTabs');
        } catch (e) {
            console.error('Failed to save profile', e);
            setError('Failed to save. Please try again.');
        }
    };

    return (
        <LinearGradient
            colors={gradients.background}
            style={styles.container}
        >
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Animated.View
                    style={[
                        styles.content,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Welcome Icon */}
                    <View style={styles.iconContainer}>
                        <LinearGradient
                            colors={gradients.primary}
                            style={styles.iconGradient}
                        >
                            <Text style={styles.iconEmoji}>📚</Text>
                        </LinearGradient>
                    </View>

                    <Text variant="displayMedium" style={styles.title}>
                        Welcome!
                    </Text>
                    <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                        Let's get you set up to track your attendance
                    </Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            label="Your Name"
                            value={name}
                            onChangeText={(text) => {
                                setName(text);
                                setError('');
                            }}
                            mode="outlined"
                            style={styles.input}
                            error={!!error}
                            autoFocus
                            onSubmitEditing={handleContinue}
                            outlineColor={theme.colors.cardBorder}
                            activeOutlineColor={theme.colors.primary}
                            theme={{
                                colors: {
                                    background: theme.colors.surfaceVariant,
                                },
                            }}
                        />

                        {!!error && (
                            <Animated.View>
                                <Text style={{ color: theme.colors.error, marginTop: 8 }}>
                                    {error}
                                </Text>
                            </Animated.View>
                        )}
                    </View>

                    <LinearGradient
                        colors={gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.buttonGradient, shadows.medium]}
                    >
                        <Button
                            mode="contained"
                            onPress={handleContinue}
                            style={styles.button}
                            contentStyle={styles.buttonContent}
                            labelStyle={styles.buttonLabel}
                            buttonColor="transparent"
                        >
                            Get Started
                        </Button>
                    </LinearGradient>

                    <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
                        You can add your subjects and create your timetable next
                    </Text>
                </Animated.View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.large,
    },
    iconEmoji: {
        fontSize: 50,
    },
    title: {
        marginBottom: 8,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    subtitle: {
        marginBottom: 48,
        textAlign: 'center',
        opacity: 0.8,
    },
    inputContainer: {
        marginBottom: 24,
    },
    input: {
        backgroundColor: 'transparent',
    },
    buttonGradient: {
        borderRadius: 12,
        marginBottom: 16,
    },
    button: {
        borderRadius: 12,
    },
    buttonContent: {
        paddingVertical: 8,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    hint: {
        textAlign: 'center',
        opacity: 0.7,
    }
});

export default OnboardingScreen;
