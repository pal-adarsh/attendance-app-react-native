import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import GradientCard from '../components/GradientCard';
import AnimatedProgressBar from '../components/AnimatedProgressBar';
import SettingsModal from '../components/SettingsModal';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import { calculatePercentage, getStatus, getLecturesNeeded, getLecturesSkippable } from '../utils/attendance';
import { gradients, shadows } from '../constants/theme';
import useCountUp from '../hooks/useCountUp';

const AnalyticsScreen = ({ navigation }) => {
    const theme = useTheme();
    const { isDark } = useThemeContext();
    const [subjects, setSubjects] = useState([]);
    const [settingsVisible, setSettingsVisible] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <IconButton
                    icon="cog"
                    iconColor={theme.colors.text}
                    onPress={() => setSettingsVisible(true)}
                />
            ),
        });
    }, [navigation, theme.colors.text]);

    const loadData = async () => {
        const allSubjects = await StorageService.loadSubjects();
        setSubjects(allSubjects);
    };

    const overallStats = useMemo(() => {
        const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
        const totalLectures = subjects.reduce((sum, s) => sum + s.total, 0);
        const percentage = calculatePercentage(totalAttended, totalLectures);
        const status = getStatus(percentage, 75);

        return { totalAttended, totalLectures, percentage, status };
    }, [subjects]);

    const overallPercentage = useCountUp(overallStats.percentage, 1200);

    const getStatusGradient = (status) => {
        switch (status) {
            case 'red': return gradients.danger;
            case 'yellow': return gradients.warning;
            case 'green': return gradients.success;
            default: return isDark ? gradients.darkCard : gradients.lightCard;
        }
    };

    const statusColor = {
        red: theme.colors.attendanceRed,
        yellow: theme.colors.attendanceYellow,
        green: theme.colors.attendanceGreen,
    }[overallStats.status];

    const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;
    const cardGradient = isDark ? gradients.darkCard : gradients.lightCard;

    return (
        <LinearGradient colors={backgroundGradient} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Overall Summary */}
                <Animated.View entering={FadeInDown.duration(600)}>
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
                                    {overallPercentage.toFixed(1)}%
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
                                <AnimatedProgressBar
                                    progress={overallStats.percentage / 100}
                                    colors={['#FFFFFF', '#FFFFFF']}
                                    height={12}
                                    style={styles.progressBarBackground}
                                />
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
                <Animated.Text 
                    entering={FadeInDown.delay(100).duration(500)}
                    variant="titleLarge" 
                    style={styles.sectionTitle}
                >
                    Subject-wise Breakdown
                </Animated.Text>

                {subjects.length === 0 ? (
                    <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                        <GradientCard gradient={cardGradient} style={styles.emptyCard}>
                            <View style={styles.emptyContent}>
                                <Text style={styles.emptyEmoji}>📊</Text>
                                <Text variant="titleMedium" style={styles.emptyTitle}>
                                    No subjects added yet
                                </Text>
                            </View>
                        </GradientCard>
                    </Animated.View>
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
                                entering={FadeInDown.delay(150 + index * 80).duration(500)}
                                layout={Layout.springify()}
                            >
                                <GradientCard gradient={cardGradient} style={styles.subjectCard}>
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

                                        {/* Premium Animated Progress Bar */}
                                        <View style={styles.progressContainer}>
                                            <AnimatedProgressBar
                                                progress={subject.total === 0 ? 0 : percentage / 100}
                                                colors={gradient}
                                                height={10}
                                                style={styles.subjectProgressBackground}
                                            />
                                        </View>

                                        <View style={styles.insights}>
                                            {status === 'red' ? (
                                                <Text variant="bodySmall" style={{ color: theme.colors.attendanceRed, fontWeight: '600' }}>
                                                    📚 Attend next {needed} lectures to reach {subject.target}%
                                                </Text>
                                            ) : (
                                                <Text variant="bodySmall" style={{ color: theme.colors.attendanceGreen, fontWeight: '600' }}>
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

            <SettingsModal
                visible={settingsVisible}
                onDismiss={() => setSettingsVisible(false)}
                navigation={navigation}
            />
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
        height: 10,
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

