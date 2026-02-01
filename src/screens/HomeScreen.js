import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { FAB, useTheme, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import SubjectCard from '../components/SubjectCard';
import AddEditSubjectModal from '../components/AddEditSubjectModal';
import OverallSummary from '../components/OverallSummary';
import { StorageService } from '../utils/storage';
import * as Haptics from 'expo-haptics';

const HomeScreen = () => {
    const theme = useTheme();
    const [subjects, setSubjects] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);

    const loadData = async () => {
        const data = await StorageService.loadSubjects();
        setSubjects(data);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

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
            "Are you sure you want to delete this subject?",
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

    const handleUpdateAttendance = async (id, attended, total) => {
        // Optimistic update
        const newSubjects = subjects.map(s =>
            s.id === id ? { ...s, attended, total } : s
        );
        setSubjects(newSubjects);
        await StorageService.saveSubjects(newSubjects);
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
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <OverallSummary subjects={subjects} />

            {subjects.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text variant="titleMedium">No subjects added yet.</Text>
                    <Text variant="bodySmall">Tap the + button to add one.</Text>
                </View>
            ) : (
                <FlatList
                    data={subjects}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <SubjectCard
                            subject={item}
                            onEdit={openEditModal}
                            onDelete={deleteSubject}
                            onUpdate={handleUpdateAttendance}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                />
            )}

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color={theme.colors.onPrimary}
                onPress={openAddModal}
            />

            <AddEditSubjectModal
                visible={modalVisible}
                onDismiss={() => setModalVisible(false)}
                onSave={handleSaveSubject}
                editingSubject={editingSubject}
            />
        </View>
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
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.5,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        borderRadius: 16,
    },
});

export default HomeScreen;
