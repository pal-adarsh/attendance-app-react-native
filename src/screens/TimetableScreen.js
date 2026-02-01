import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Animated } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import GradientCard from '../components/GradientCard';
import { StorageService } from '../utils/storage';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TimetableScreen = () => {
    const theme = useTheme();
    const [subjects, setSubjects] = useState([]);
    const [timetable, setTimetable] = useState({});
    const [selectedDay, setSelectedDay] = useState('Monday');
    const fadeAnim = useRef(new Animated.Value(0)).current;

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
        const [loadedSubjects, loadedTimetable] = await Promise.all([
            StorageService.loadSubjects(),
            StorageService.loadTimetable()
        ]);
        setSubjects(loadedSubjects);
        setTimetable(loadedTimetable);
    };

    const toggleSubject = async (subjectId) => {
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
    };

    const isSubjectSelected = (subjectId) => {
        return (timetable[selectedDay] || []).includes(subjectId);
    };

    return (
        <LinearGradient colors={gradients.background} style={styles.container}>
            {/* Day Selector */}
            <View style={styles.daySelectorContainer}>
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
                                colors={isSelected ? gradients.primary : ['#2C2C2C', '#2C2C2C']}
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
                                        isSelected && { color: '#FFF', fontWeight: 'bold' }
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
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <View style={styles.sectionHeader}>
                    <Text variant="titleLarge" style={styles.sectionTitle}>
                        Select subjects for {selectedDay}
                    </Text>
                </View>

                {subjects.length === 0 ? (
                    <GradientCard gradient={gradients.card} style={styles.emptyCard}>
                        <View style={styles.emptyContent}>
                            <Text style={styles.emptyEmoji}>📚</Text>
                            <Text variant="titleMedium" style={styles.emptyTitle}>
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
                        renderItem={({ item }) => {
                            const isSelected = isSubjectSelected(item.id);
                            return (
                                <LinearGradient
                                    colors={isSelected ? gradients.primary : gradients.card}
                                    style={[styles.subjectChipGradient, shadows.small]}
                                >
                                    <Chip
                                        selected={isSelected}
                                        onPress={() => toggleSubject(item.id)}
                                        style={styles.subjectChip}
                                        textStyle={[
                                            styles.subjectChipText,
                                            isSelected && { color: '#FFF', fontWeight: 'bold' }
                                        ]}
                                        icon={isSelected ? 'check' : 'plus'}
                                        mode="flat"
                                    >
                                        {item.name}
                                    </Chip>
                                </LinearGradient>
                            );
                        }}
                        numColumns={2}
                        columnWrapperStyle={styles.row}
                        contentContainerStyle={styles.listContent}
                    />
                )}
            </Animated.View>

            {/* Summary */}
            <LinearGradient
                colors={gradients.card}
                style={[styles.summary, shadows.medium]}
            >
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {(timetable[selectedDay] || []).length} subject(s) on {selectedDay}
                </Text>
            </LinearGradient>
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
    subjectChipGradient: {
        flex: 0.48,
        borderRadius: 20,
        marginBottom: 8,
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
