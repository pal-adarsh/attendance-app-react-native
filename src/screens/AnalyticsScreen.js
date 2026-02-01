import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { Text, ProgressBar, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import GradientCard from '../components/GradientCard';
import { StorageService } from '../utils/storage';
import { calculatePercentage, getStatus, getLecturesNeeded, getLecturesSkippable } from '../utils/attendance';
import { gradients, shadows } from '../constants/theme';

const AnalyticsScreen = () => {
    const theme = useTheme();
    const [subjects, setSubjects] = useState([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const progressAnims = useRef([]).current;

    useFocusEffect(
        useCallback(() => {
            loadData();
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }, [])
    );

    const loadData = async () => {
        const allSubjects = await StorageService.loadSubjects();
        setSubjects(allSubjects);

        // Animate progress bars
        allSubjects.forEach((_, index) => {
            if (!progressAnims[index]) {
                progressAnims[index] = new Animated.Value(0);
            }
            Animated.timing(progressAnims[index], {
                toValue: 1,
                duration: 1000,
                delay: index * 100,
                useNativeDriver: false,
            }).start();
        });
    };

    const overallStats = useMemo(() => {
        const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
        const totalLectures = subjects.reduce((sum, s) => sum + s.total, 0);
        const percentage = calculatePercentage(totalAttended, totalLectures);
        const status = getStatus(percentage, 75);

        return { totalAttended, totalLectures, percentage, status };
    }, [subjects]);

    const getStatusGradient = (status) => {
        switch (status) {
            case 'red': return gradients.danger;
            case 'yellow': return gradients.warning;
            case 'green': return gradients.success;
            default: return gradients.card;
        }
    };

    const statusColor = {
        red: theme.colors.attendanceRed,
        yellow: theme.colors.attendanceYellow,
        green: theme.colors.attendanceGreen,
    }[overallStats.status];

    return (
        <LinearGradient colors={gradients.background} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Overall Summary */}
                <Animated.View style={{ opacity: fadeAnim }}>
                    <LinearGradient
                        colors={getStatusGradient(overallStats.status)}
                        style={[styles.overallCard, shadows.large]}
                    >
                        <View style={styles.overallContent}>
                            <Text variant="titleLarge" style={styles.cardTitle}>
                                Overall Attendance
                            </Text>

                            <View style={styles.overallStats}>
                                <Text variant="displayLarge" style={styles.percentageText}>
                                    {overallStats.percentage.toFixed(1)}%
                                </Text>
                                <View style={styles.statsDetails}>
                                    <Text variant="headlineSmall" style={styles.statsText}>
                                        {overallStats.totalAttended} / {overallStats.totalLectures}
                                    </Text>
                                    <Text variant="bodyMedium" style={styles.statsLabel}>
                                        Lectures Attended
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.progressContainer}>
                                <View style={styles.progressBarBackground}>
                                    <View
                                        style={[
                                            styles.progressBarFill,
                                            { width: `${overallStats.percentage}%` },
                                        ]}
                                    />
                                </View>
                            </View>

                            {overallStats.status === 'red' && (
                                <Text style={styles.statusMessage}>
                                    ⚠️ Below 75% - Focus on attending lectures!
                                </Text>
                            )}
                            {overallStats.status === 'yellow' && (
                                <Text style={styles.statusMessage}>
                                    ⚡ Close to 75% - Be careful!
                                </Text>
                            )}
                            {overallStats.status === 'green' && (
                                <Text style={styles.statusMessage}>
                                    ✅ Great! You're in the safe zone
                                </Text>
                            )}
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Subject-wise Breakdown */}
                <Text variant="titleLarge" style={styles.sectionTitle}>
                    Subject-wise Breakdown
                </Text>

                {subjects.length === 0 ? (
                    <GradientCard gradient={gradients.card} style={styles.emptyCard}>
                        <View style={styles.emptyContent}>
                            <Text style={styles.emptyEmoji}>📊</Text>
                            <Text variant="titleMedium" style={styles.emptyTitle}>
                                No subjects added yet
                            </Text>
                        </View>
                    </GradientCard>
                ) : (
                    subjects.map((subject, index) => {
                        const percentage = calculatePercentage(subject.attended, subject.total);
                        const status = getStatus(percentage, subject.target);
                        const gradient = getStatusGradient(status);
                        const needed = getLecturesNeeded(subject.attended, subject.total, subject.target);
                        const skippable = getLecturesSkippable(subject.attended, subject.total, subject.target);

                        return (
                            <Animated.View
                                key={subject.id}
                                style={{
                                    opacity: fadeAnim,
                                    transform: [{
                                        translateY: fadeAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [50, 0],
                                        }),
                                    }],
                                }}
                            >
                                <GradientCard gradient={gradients.card} style={styles.subjectCard}>
                                    <View style={styles.subjectContent}>
                                        <View style={styles.subjectHeader}>
                                            <Text variant="titleMedium" style={styles.subjectName}>
                                                {subject.name}
                                            </Text>
                                            <LinearGradient
                                                colors={gradient}
                                                style={styles.percentageBadge}
                                            >
                                                <Text style={styles.percentageBadgeText}>
                                                    {percentage.toFixed(1)}%
                                                </Text>
                                            </LinearGradient>
                                        </View>

                                        <Text variant="bodySmall" style={[styles.lectureCount, { color: theme.colors.onSurfaceVariant }]}>
                                            {subject.attended} / {subject.total} lectures
                                        </Text>

                                        <View style={styles.progressContainer}>
                                            <View style={styles.subjectProgressBackground}>
                                                <LinearGradient
                                                    colors={gradient}
                                                    style={[
                                                        styles.subjectProgressFill,
                                                        { width: `${Math.min(percentage, 100)}%` }
                                                    ]}
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.insights}>
                                            {status === 'red' ? (
                                                <Text variant="bodySmall" style={{ color: theme.colors.attendanceRed }}>
                                                    📚 Attend next {needed} lectures to reach {subject.target}%
                                                </Text>
                                            ) : (
                                                <Text variant="bodySmall" style={{ color: theme.colors.attendanceGreen }}>
                                                    ✨ Can skip {skippable} lectures safely
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </GradientCard>
                            </Animated.View>
                        );
                    })
                )}
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    overallCard: {
        borderRadius: 20,
        marginBottom: 24,
        overflow: 'hidden',
    },
    overallContent: {
        padding: 24,
    },
    cardTitle: {
        marginBottom: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    overallStats: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    percentageText: {
        fontWeight: 'bold',
        color: '#FFF',
    },
    statsDetails: {
        alignItems: 'flex-end',
    },
    statsText: {
        fontWeight: 'bold',
        color: '#FFF',
    },
    statsLabel: {
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBarBackground: {
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 6,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FFF',
        borderRadius: 6,
    },
    statusMessage: {
        color: '#FFF',
        textAlign: 'center',
        fontWeight: '600',
    },
    sectionTitle: {
        marginBottom: 16,
        fontWeight: 'bold',
    },
    subjectCard: {
        marginBottom: 12,
    },
    subjectContent: {
        padding: 16,
    },
    subjectHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    subjectName: {
        fontWeight: 'bold',
        flex: 1,
    },
    percentageBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        ...shadows.small,
    },
    percentageBadgeText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    lectureCount: {
        marginBottom: 12,
    },
    subjectProgressBackground: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    subjectProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    insights: {
        marginTop: 12,
    },
    emptyCard: {
        padding: 32,
    },
    emptyContent: {
        alignItems: 'center',
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default AnalyticsScreen;
