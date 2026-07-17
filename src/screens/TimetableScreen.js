import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import GradientCard from '../components/GradientCard';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TimetableScreen = () => {
    const theme = useTheme();
    const { isDark } = useThemeContext();
    const [subjects, setSubjects] = useState([]);
    const [timetable, setTimetable] = useState({});
    const [selectedDay, setSelectedDay] = useState('Monday');

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const [loadedSubjects, loadedTimetable] = await Promise.all([
                StorageService.loadSubjects(),
                StorageService.loadTimetable()
            ]);
            setSubjects(loadedSubjects);
            setTimetable(loadedTimetable);
        } catch (e) {
            console.error('Failed to load timetable data', e);
        }
    };

    const toggleSubject = async (subjectId) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            const daySubjects = timetable[selectedDay] || [];
            const newDaySubjects = daySubjects.includes(subjectId)
                ? daySubjects.filter(id => id !== subjectId)
                : [...daySubjects, subjectId];

            const newTimetable = {
                ...timetable,
                [selectedDay]: newDaySubjects
            };

            setTimetable(newTimetable);
            await StorageService.saveTimetable(newTimetable);
        } catch (e) {
            console.error('Failed to toggle subject', e);
        }
    };

    const isSubjectSelected = (subjectId) => {
        return (timetable[selectedDay] || []).includes(subjectId);
    };

    const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;
    const cardGradient = isDark ? gradients.darkCard : gradients.lightCard;
    const defaultButtonColors = isDark ? ['#2C2C2C', '#2C2C2C'] : ['#E2E8F0', '#E2E8F0'];

    return (
        <LinearGradient colors={backgroundGradient} style={styles.container}>
            {/* Day Selector */}
            <View style={[styles.daySelectorContainer, { borderBottomColor: theme.colors.surfaceVariant }]}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.daySelectorContent}
                >
                    {DAYS.map(day => {
                        const isSelected = selectedDay === day;
                        return (
                            <LinearGradient
                                key={day}
                                colors={isSelected ? gradients.primary : defaultButtonColors}
                                style={[styles.dayChipGradient, shadows.small]}
                            >
                                <Chip
                                    selected={isSelected}
                                    onPress={() => {
                                        setSelectedDay(day);
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                    style={styles.dayChip}
                                    textStyle={[
                                        styles.dayChipText,
                                        isSelected ? { color: '#FFF', fontWeight: 'bold' } : { color: theme.colors.onSurface }
                                    ]}
                                    mode="flat"
                                >
                                    {day.substring(0, 3)}
                                </Chip>
                            </LinearGradient>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Subject Selection */}
            <Animated.View 
                key={selectedDay}
                entering={FadeInDown.duration(400)}
                style={styles.content}
            >
                <View style={styles.sectionHeader}>
                    <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        Select subjects for {selectedDay}
                    </Text>
                </View>

                {subjects.length === 0 ? (
                    <GradientCard gradient={cardGradient} style={styles.emptyCard}>
                        <View style={styles.emptyContent}>
                            <Text style={styles.emptyEmoji}>📚</Text>
                            <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.colors.text }]}>
                                No subjects added yet
                            </Text>
                            <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                                Go to Subjects tab to add some
                            </Text>
                        </View>
                    </GradientCard>
                ) : (
                    <FlatList
                        data={subjects}
                        keyExtractor={item => item.id}
                        renderItem={({ item, index }) => {
                            const isSelected = isSubjectSelected(item.id);
                            return (
                                <Animated.View 
                                    entering={FadeInDown.delay(index * 60).duration(350)}
                                    layout={Layout.springify()}
                                    style={styles.subjectChipContainer}
                                >
                                    <LinearGradient
                                        colors={isSelected ? gradients.primary : cardGradient}
                                        style={[styles.subjectChipGradient, shadows.small]}
                                    >
                                        <Chip
                                            selected={isSelected}
                                            onPress={() => toggleSubject(item.id)}
                                            style={styles.subjectChip}
                                            textStyle={[
                                                styles.subjectChipText,
                                                isSelected ? { color: '#FFF', fontWeight: 'bold' } : { color: theme.colors.onSurface }
                                            ]}
                                            icon={isSelected ? 'check' : 'plus'}
                                            mode="flat"
                                        >
                                            {item.name}
                                        </Chip>
                                    </LinearGradient>
                                </Animated.View>
                            );
                        }}
                        numColumns={2}
                        columnWrapperStyle={styles.row}
                        contentContainerStyle={styles.listContent}
                    />
                )}
            </Animated.View>

            {/* Summary */}
            <Animated.View entering={FadeInDown.delay(200)}>
                <LinearGradient
                    colors={cardGradient}
                    style={[styles.summary, shadows.medium]}
                >
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        {(timetable[selectedDay] || []).length} subject(s) on {selectedDay}
                    </Text>
                </LinearGradient>
            </Animated.View>
        </LinearGradient>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    daySelectorContainer: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 12,
    },
    daySelectorContent: {
        paddingHorizontal: 12,
        gap: 8,
    },
    dayChipGradient: {
        borderRadius: 20,
        marginRight: 8,
    },
    dayChip: {
        backgroundColor: 'transparent',
    },
    dayChipText: {
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontWeight: 'bold',
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    subjectChipContainer: {
        flex: 0.48,
    },
    subjectChipGradient: {
        width: '100%',
        borderRadius: 20,
    },
    subjectChip: {
        backgroundColor: 'transparent',
    },
    subjectChipText: {
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 16,
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
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        textAlign: 'center',
        opacity: 0.7,
    },
    summary: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
    }
});

export default TimetableScreen;

