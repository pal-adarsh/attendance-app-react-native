import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, StyleSheet, ScrollView, TextInput as RNTextInput,
    KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { Text, useTheme, IconButton, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import * as Haptics from 'expo-haptics';
import { gradients } from '../constants/theme';

const DEBOUNCE_MS = 500;

const NoteEditorScreen = ({ route, navigation }) => {
    const theme = useTheme();
    const { isDark } = useThemeContext();
    const { noteId, subjectId: routeSubjectId } = route.params || {};

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [pinned, setPinned] = useState(false);
    const [saved, setSaved] = useState(true);
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [isEditing, setIsEditing] = useState(!!noteId);
    const [subjectName, setSubjectName] = useState('');
    const [showCount, setShowCount] = useState(false);

    const debounceRef = useRef(null);
    const bodyRef = useRef(null);
    const noteIdRef = useRef(noteId || null);
    const titleRef = useRef(title);
    const bodyRefForSave = useRef(body);
    const pinnedRef = useRef(pinned);

    titleRef.current = title;
    bodyRefForSave.current = body;
    pinnedRef.current = pinned;

    useFocusEffect(
        useCallback(() => {
            loadNote();
            if (routeSubjectId) {
                StorageService.loadSubjects().then(subs => {
                    const sub = subs.find(s => s.id === routeSubjectId);
                    if (sub) setSubjectName(sub.name);
                }).catch(e => console.error('Failed to load subject', e));
            }
            return () => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                saveImmediate();
            };
        }, [noteId, routeSubjectId])
    );

    const loadNote = async () => {
        try {
            if (!noteId) return;
            const notes = await StorageService.loadNotes();
            const note = notes.find(n => n.id === noteId);
            if (!note) return;

            setTitle(note.title || '');
            setBody(note.body || '');
            setPinned(note.pinned || false);
            noteIdRef.current = note.id;
            setIsEditing(true);

            if (note.subjectId) {
                StorageService.loadSubjects().then(subs => {
                    const sub = subs.find(s => s.id === note.subjectId);
                    if (sub) setSubjectName(sub.name);
                }).catch(e => console.error('Failed to load subject', e));
            }

            navigation.setOptions({ title: note.title || 'Edit Note' });
        } catch (e) {
            console.error('Failed to load note', e);
        }
    };

    const saveImmediate = async () => {
        try {
            const trimmedTitle = titleRef.current.trim();
            const trimmedBody = bodyRefForSave.current.trim();
            const isEmpty = !trimmedTitle && !trimmedBody;

            // If it's a new note and it's empty, skip saving
            if (!noteIdRef.current && isEmpty) {
                setSaved(true);
                return;
            }

            // If an existing note is completely cleared, delete it
            if (noteIdRef.current && isEmpty) {
                await StorageService.deleteNote(noteIdRef.current);
                noteIdRef.current = null;
                setSaved(true);
                return;
            }

            const now = new Date().toISOString();
            const noteData = {
                id: noteIdRef.current || undefined,
                title: trimmedTitle,
                body: bodyRefForSave.current,
                subjectId: routeSubjectId || null,
                labels: [],
                pinned: pinnedRef.current,
                favorite: false,
                archived: false,
                checklist: null,
                updatedAt: now,
            };

            const { savedNote } = await StorageService.upsertNote(noteData);
            if (!noteIdRef.current && savedNote) {
                noteIdRef.current = savedNote.id;
                setIsEditing(true);
                navigation.setOptions({ title: savedNote.title || 'Edit Note' });
            }
            setSaved(true);
            setLastSavedAt(now);
        } catch (e) {
            console.error('Failed to save note', e);
            setSaved(true);
        }
    };

    const debouncedSave = () => {
        setSaved(false);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            saveImmediate();
        }, DEBOUNCE_MS);
    };

    useEffect(() => {
        debouncedSave();
    }, [title, body, pinned]);

    const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
    const charCount = body.length;
    const lastSavedStr = lastSavedAt
        ? (Date.now() - new Date(lastSavedAt).getTime() < 60000 ? 'just now' : `${Math.floor((Date.now() - new Date(lastSavedAt).getTime()) / 60000)}m ago`)
        : '';

    const insets = useSafeAreaInsets();
    const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <LinearGradient colors={backgroundGradient} style={styles.container}>
                {/* Header */}
                <View style={[styles.headerBar, { borderBottomColor: theme.colors.surfaceVariant, paddingTop: insets.top + 4 }]}>
                    <View style={styles.headerLeft}>
                        <IconButton
                            icon="arrow-left"
                            size={22}
                            onPress={() => navigation.goBack()}
                            iconColor={theme.colors.text}
                            accessibilityLabel="Go back"
                        />
                        <View>
                            <Text variant="titleMedium" style={{ color: theme.colors.text, fontWeight: 'bold' }}>
                                {isEditing ? 'Edit Note' : 'New Note'}
                            </Text>
                            {subjectName && (
                                <View style={[styles.subjectChip, { backgroundColor: theme.colors.primary + '15' }]}>
                                    <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                                        {subjectName}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        {/* Save status to left of pin icon */}
                        <View style={styles.saveStatusContainer}>
                            <View style={[styles.statusDot, { backgroundColor: saved ? theme.colors.attendanceGreen : theme.colors.attendanceYellow }]} />
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>
                                {saved ? `Saved${lastSavedStr ? ` · ${lastSavedStr}` : ''}` : 'Saving...'}
                            </Text>
                        </View>
                        <IconButton
                            icon={pinned ? 'pin' : 'pin-outline'}
                            size={20}
                            onPress={() => { setPinned(!pinned); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                            iconColor={pinned ? theme.colors.primary : theme.colors.onSurfaceVariant}
                            accessibilityLabel={pinned ? 'Unpin' : 'Pin'}
                        />
                        <IconButton
                            icon="information-outline"
                            size={18}
                            onPress={() => setShowCount(!showCount)}
                            iconColor={showCount ? theme.colors.primary : theme.colors.onSurfaceVariant}
                            accessibilityLabel="Toggle word count"
                        />
                    </View>
                </View>

                {/* Optional word count bar */}
                {showCount && (
                    <Animated.View entering={FadeIn.duration(200)} style={[styles.statusBar, { borderBottomColor: theme.colors.surfaceVariant }]}>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} chars
                        </Text>
                    </Animated.View>
                )}

                <ScrollView
                    style={styles.scrollArea}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Title */}
                    <TextInput
                        placeholder="Note title"
                        value={title}
                        onChangeText={setTitle}
                        mode="flat"
                        underlineColor="transparent"
                        activeUnderlineColor="transparent"
                        style={[styles.titleInput, { backgroundColor: 'transparent', color: theme.colors.text }]}
                        textColor={theme.colors.text}
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        theme={{ colors: { primary: theme.colors.primary } }}
                    />

                    {/* Body input */}
                    <RNTextInput
                        ref={bodyRef}
                        value={body}
                        onChangeText={setBody}
                        placeholder="Start writing..."
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        multiline
                        style={[styles.bodyInput, { color: theme.colors.text }]}
                        textAlignVertical="top"
                    />
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderBottomWidth: 1, paddingRight: 4,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    saveStatusContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
    subjectChip: {
        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1,
        alignSelf: 'flex-start', marginTop: 1,
    },
    statusBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
        paddingHorizontal: 16, paddingVertical: 4, borderBottomWidth: 1,
    },
    scrollArea: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    titleInput: {
        fontSize: 24, fontWeight: 'bold', marginBottom: 8,
        height: 48, paddingHorizontal: 0,
    },
    bodyInput: { fontSize: 16, lineHeight: 24, minHeight: 200 },
});

export default NoteEditorScreen;
