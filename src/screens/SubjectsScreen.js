import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Alert, Animated } from 'react-native';
import { FAB, useTheme, Text, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import GradientCard from '../components/GradientCard';
import AddEditSubjectModal from '../components/AddEditSubjectModal';
import { StorageService } from '../utils/storage';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';
import { calculatePercentage, getStatus } from '../utils/attendance';

const SubjectsScreen = () => {
    const theme = useTheme();
    const [subjects, setSubjects] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
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
        const data = await StorageService.loadSubjects();
        setSubjects(data);
    };

    const handleSaveSubject = async (subject) => {
        let newSubjects;
        if (editingSubject) {
            newSubjects = subjects.map(s => s.id === subject.id ? subject : s);
        } else {
            newSubjects = [...subjects, subject];
        }
        setSubjects(newSubjects);
        await StorageService.saveSubjects(newSubjects);
        setEditingSubject(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const deleteSubject = async (id) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
            "Delete Subject",
            "Are you sure? This will also remove all attendance records for this subject.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const newSubjects = subjects.filter(s => s.id !== id);
                        setSubjects(newSubjects);
                        await StorageService.saveSubjects(newSubjects);
                    }
                }
            ]
        );
    };

    const openAddModal = () => {
        setEditingSubject(null);
        setModalVisible(true);
    };

    const openEditModal = (subject) => {
        setEditingSubject(subject);
        setModalVisible(true);
    };

    return (
        <LinearGradient colors={gradients.background} style={styles.container}>
            {subjects.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>📚</Text>
                    <Text variant="titleLarge" style={styles.emptyTitle}>
                        No subjects added yet
                    </Text>
                    <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                        Tap the + button to add one
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={subjects}
                    keyExtractor={item => item.id}
                    renderItem={({ item, index }) => {
                        const percentage = calculatePercentage(item.attended, item.total);
                        const status = getStatus(percentage, item.target);
                        const statusGradient = {
                            red: gradients.danger,
                            yellow: gradients.warning,
                            green: gradients.success,
                        }[status];

                        return (
                            <Animated.View
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
                                <GradientCard gradient={gradients.card} style={styles.card}>
                                    <View style={styles.cardContent}>
                                        <View style={styles.header}>
                                            <View style={{ flex: 1 }}>
                                                <Text variant="titleLarge" style={styles.title}>
                                                    {item.name}
                                                </Text>
                                                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                                                    {item.attended} / {item.total} lectures • Target: {item.target}%
                                                </Text>
                                                {item.lecturesPerWeek > 0 && (
                                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                                                        {item.lecturesPerWeek} lectures/week
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={styles.actions}>
                                                <IconButton
                                                    icon="pencil"
                                                    size={20}
                                                    onPress={() => openEditModal(item)}
                                                    iconColor={theme.colors.primary}
                                                />
                                                <IconButton
                                                    icon="delete"
                                                    size={20}
                                                    onPress={() => deleteSubject(item.id)}
                                                    iconColor={theme.colors.error}
                                                />
                                            </View>
                                        </View>

                                        {/* Progress Bar */}
                                        <View style={styles.progressContainer}>
                                            <View style={styles.progressBackground}>
                                                <LinearGradient
                                                    colors={statusGradient}
                                                    style={[
                                                        styles.progressFill,
                                                        { width: `${Math.min(percentage, 100)}%` }
                                                    ]}
                                                />
                                            </View>
                                            <LinearGradient
                                                colors={statusGradient}
                                                style={styles.percentageBadge}
                                            >
                                                <Text style={styles.percentageText}>
                                                    {percentage.toFixed(1)}%
                                                </Text>
                                            </LinearGradient>
                                        </View>
                                    </View>
                                </GradientCard>
                            </Animated.View>
                        );
                    }}
                    contentContainerStyle={styles.listContent}
                />
            )}

            <LinearGradient
                colors={gradients.primary}
                style={[styles.fab, shadows.large]}
            >
                <FAB
                    icon="plus"
                    style={styles.fabButton}
                    color="#FFF"
                    onPress={openAddModal}
                />
            </LinearGradient>

            <AddEditSubjectModal
                visible={modalVisible}
                onDismiss={() => setModalVisible(false)}
                onSave={handleSaveSubject}
                editingSubject={editingSubject}
            />
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },
    card: {
        marginBottom: 12,
    },
    cardContent: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    title: {
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    progressBackground: {
        flex: 1,
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    percentageBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        ...shadows.small,
    },
    percentageText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubtitle: {
        textAlign: 'center',
        opacity: 0.7,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        borderRadius: 28,
    },
    fabButton: {
        backgroundColor: 'transparent',
    },
});

export default SubjectsScreen;
