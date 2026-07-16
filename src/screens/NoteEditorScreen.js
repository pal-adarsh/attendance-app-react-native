import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, StyleSheet, ScrollView, TextInput as RNTextInput,
    KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { Text, useTheme, IconButton, Chip, TextInput, Button, Portal, Modal } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';

const DEBOUNCE_MS = 500;

const NoteEditorScreen = ({ route, navigation }) => {
    const theme = useTheme();
    const { isDark } = useThemeContext();
    const { noteId, subjectId: routeSubjectId } = route.params || {};

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [isChecklist, setIsChecklist] = useState(false);
    const [checklistItems, setChecklistItems] = useState([]);
    const [labels, setLabels] = useState([]);
    const [labelInput, setLabelInput] = useState('');
    const [labelModalVisible, setLabelModalVisible] = useState(false);
    const [pinned, setPinned] = useState(false);
    const [saved, setSaved] = useState(true);
    const [isEditing, setIsEditing] = useState(!!noteId);
    const [subjectName, setSubjectName] = useState('');

    const debounceRef = useRef(null);
    const bodyRef = useRef(null);
    const noteIdRef = useRef(noteId || null);
    const titleRef = useRef(title);
    const bodyRefForSave = useRef(body);
    const labelsRef = useRef(labels);
    const pinnedRef = useRef(pinned);
    const isChecklistRef = useRef(isChecklist);
    const checklistRef = useRef(checklistItems);

    // Keep refs in sync with state
    titleRef.current = title;
    bodyRefForSave.current = body;
    labelsRef.current = labels;
    pinnedRef.current = pinned;
    isChecklistRef.current = isChecklist;
    checklistRef.current = checklistItems;

    useFocusEffect(
        useCallback(() => {
            loadNote();
            if (routeSubjectId) {
                StorageService.loadSubjects().then(subs => {
                    const sub = subs.find(s => s.id === routeSubjectId);
                    if (sub) setSubjectName(sub.name);
                });
            }
            return () => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                saveImmediate();
            };
        }, [noteId, routeSubjectId])
    );

    const loadNote = async () => {
        if (!noteId) return;
        const notes = await StorageService.loadNotes();
        const note = notes.find(n => n.id === noteId);
        if (!note) return;

        setTitle(note.title || '');
        setBody(note.body || '');
        setIsChecklist(!!note.checklist);
        setChecklistItems(note.checklist || []);
        setLabels(note.labels || []);
        setPinned(note.pinned || false);
        noteIdRef.current = note.id;
        setIsEditing(true);

        if (note.subjectId) {
            StorageService.loadSubjects().then(subs => {
                const sub = subs.find(s => s.id === note.subjectId);
                if (sub) setSubjectName(sub.name);
            });
        }

        navigation.setOptions({ title: note.title || 'Edit Note' });
    };

    const saveImmediate = async () => {
        const now = new Date().toISOString();
        const noteData = {
            id: noteIdRef.current || undefined,
            title: titleRef.current.trim(),
            body: bodyRefForSave.current,
            subjectId: routeSubjectId || null,
            labels: labelsRef.current,
            pinned: pinnedRef.current,
            favorite: false,
            archived: false,
            checklist: isChecklistRef.current ? checklistRef.current : null,
            updatedAt: now,
        };

        const { savedNote } = await StorageService.upsertNote(noteData);
        if (!noteIdRef.current && savedNote) {
            noteIdRef.current = savedNote.id;
            setIsEditing(true);
            navigation.setOptions({ title: savedNote.title || 'Edit Note' });
        }
        setSaved(true);
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
    }, [title, body, labels, pinned, isChecklist, checklistItems]);

    const inputBgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

    const addLabel = () => {
        const trimmed = labelInput.trim();
        if (trimmed && !labels.includes(trimmed)) {
            setLabels([...labels, trimmed]);
            setLabelInput('');
        }
    };

    const removeLabel = (label) => {
        setLabels(labels.filter(l => l !== label));
    };

    const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <LinearGradient colors={backgroundGradient} style={styles.container}>
                {/* Header bar */}
                <View style={[styles.headerBar, { borderBottomColor: theme.colors.surfaceVariant }]}>
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
                                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {subjectName}
                                </Text>
                            )}
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <IconButton
                            icon={pinned ? 'pin' : 'pin-outline'}
                            size={20}
                            onPress={() => { setPinned(!pinned); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                            iconColor={pinned ? theme.colors.primary : theme.colors.onSurfaceVariant}
                            accessibilityLabel={pinned ? 'Unpin' : 'Pin'}
                        />
                        <IconButton
                            icon="label-outline"
                            size={20}
                            onPress={() => setLabelModalVisible(true)}
                            iconColor={theme.colors.onSurfaceVariant}
                            accessibilityLabel="Edit labels"
                        />
                        <IconButton
                            icon={isChecklist ? 'checklist' : 'text'}
                            size={20}
                            onPress={() => { setIsChecklist(!isChecklist); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                            iconColor={isChecklist ? theme.colors.primary : theme.colors.onSurfaceVariant}
                            accessibilityLabel={isChecklist ? 'Switch to text' : 'Switch to checklist'}
                        />
                    </View>
                </View>

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

                    {/* Markdown toolbar (text mode only) */}
                    {!isChecklist && (
                        <View style={styles.toolbar}>
                            <Pressable style={styles.toolbarBtn} onPress={() => insertMarkdown('**', '**')}>
                                <Text style={[styles.toolbarBtnText, { color: theme.colors.onSurfaceVariant }]}>B</Text>
                            </Pressable>
                            <Pressable style={styles.toolbarBtn} onPress={() => insertMarkdown('*', '*')}>
                                <Text style={[styles.toolbarBtnText, { color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }]}>I</Text>
                            </Pressable>
                            <Pressable style={styles.toolbarBtn} onPress={() => insertMarkdown('- ')}>
                                <Text style={[styles.toolbarBtnText, { color: theme.colors.onSurfaceVariant }]}>•</Text>
                            </Pressable>
                            <Pressable style={styles.toolbarBtn} onPress={() => insertMarkdown('\n- [ ] ')}>
                                <Text style={[styles.toolbarBtnText, { color: theme.colors.onSurfaceVariant }]}>☐</Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Body / Checklist */}
                    {isChecklist ? (
                        <View style={styles.checklistContainer}>
                            {checklistItems.map((item, index) => (
                                <View key={index} style={styles.checklistRow}>
                                    <Pressable onPress={() => toggleChecklistItem(index)} style={styles.checkbox}>
                                        <Text>{item.done ? '✅' : '⬜'}</Text>
                                    </Pressable>
                                    <RNTextInput
                                        value={item.text}
                                        onChangeText={(text) => updateChecklistItem(index, text)}
                                        placeholder="Checklist item"
                                        placeholderTextColor={theme.colors.onSurfaceVariant}
                                        style={[styles.checklistInput, { color: theme.colors.text, borderBottomColor: theme.colors.surfaceVariant }]}
                                    />
                                    <IconButton
                                        icon="close"
                                        size={16}
                                        onPress={() => removeChecklistItem(index)}
                                        iconColor={theme.colors.onSurfaceVariant}
                                        accessibilityLabel="Remove item"
                                    />
                                </View>
                            ))}
                            <Button
                                mode="text"
                                onPress={addChecklistItem}
                                icon="plus"
                                textColor={theme.colors.primary}
                                labelStyle={{ fontWeight: 'bold' }}
                                style={styles.addChecklistBtn}
                            >
                                Add item
                            </Button>
                        </View>
                    ) : (
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
                    )}

                    {/* Labels display */}
                    {labels.length > 0 && (
                        <View style={styles.labelRow}>
                            {labels.map(label => (
                                <Chip
                                    key={label}
                                    compact
                                    mode="outlined"
                                    style={[styles.labelChip, { borderColor: theme.colors.cardBorder }]}
                                    textStyle={{ fontSize: 11, color: theme.colors.primary }}
                                    onClose={() => removeLabel(label)}
                                >
                                    {label}
                                </Chip>
                            ))}
                        </View>
                    )}

                    {/* Save indicator */}
                    <View style={styles.saveIndicator}>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {saved ? '✓ Saved' : 'Saving...'}
                        </Text>
                    </View>
                </ScrollView>

                {/* Labels Modal */}
                <Portal>
                    <Modal
                        visible={labelModalVisible}
                        onDismiss={() => setLabelModalVisible(false)}
                        contentContainerStyle={[styles.labelModal, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}
                    >
                        <Text variant="titleMedium" style={[styles.labelModalTitle, { color: theme.colors.text }]}>
                            Edit Labels
                        </Text>
                        <View style={styles.labelInputRow}>
                            <RNTextInput
                                value={labelInput}
                                onChangeText={setLabelInput}
                                placeholder="Add label..."
                                placeholderTextColor={theme.colors.onSurfaceVariant}
                                onSubmitEditing={addLabel}
                                style={[styles.labelTextInput, { color: theme.colors.text, borderColor: theme.colors.cardBorder, backgroundColor: inputBgColor }]}
                            />
                            <IconButton icon="plus" size={20} onPress={addLabel} iconColor={theme.colors.primary} />
                        </View>
                        {labels.length > 0 && (
                            <View style={styles.labelList}>
                                {labels.map(label => (
                                    <Chip
                                        key={label}
                                        compact
                                        mode="outlined"
                                        style={[styles.labelChip, { borderColor: theme.colors.cardBorder }]}
                                        textStyle={{ color: theme.colors.primary }}
                                        onClose={() => removeLabel(label)}
                                    >
                                        {label}
                                    </Chip>
                                ))}
                            </View>
                        )}
                        <Button mode="contained" onPress={() => setLabelModalVisible(false)} style={styles.labelDoneBtn}
                            buttonColor={theme.colors.primary} labelStyle={{ fontWeight: 'bold' }}>
                            Done
                        </Button>
                    </Modal>
                </Portal>
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
    headerRight: { flexDirection: 'row' },
    scrollArea: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    titleInput: {
        fontSize: 24, fontWeight: 'bold', marginBottom: 8,
        height: 48, paddingHorizontal: 0,
    },
    toolbar: {
        flexDirection: 'row', gap: 4, marginBottom: 12,
        paddingVertical: 6, borderTopWidth: 1, borderBottomWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    toolbarBtn: { paddingHorizontal: 10, paddingVertical: 4 },
    toolbarBtnText: { fontSize: 16, fontWeight: 'bold' },
    bodyInput: { fontSize: 16, lineHeight: 24, minHeight: 200 },
    checklistContainer: { gap: 4, marginTop: 8 },
    checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkbox: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
    checklistInput: { flex: 1, fontSize: 16, borderBottomWidth: 1, paddingVertical: 8 },
    addChecklistBtn: { alignSelf: 'flex-start', marginTop: 8 },
    labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16 },
    labelChip: { borderRadius: 12, height: 28 },
    saveIndicator: { marginTop: 16, alignItems: 'center' },
    labelModal: {
        margin: 32, borderRadius: 20, padding: 24, borderWidth: 1,
        ...shadows.large,
    },
    labelModalTitle: { fontWeight: 'bold', marginBottom: 16 },
    labelInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    labelTextInput: {
        flex: 1, borderRadius: 10, borderWidth: 1,
        paddingHorizontal: 12, height: 40, fontSize: 14,
    },
    labelList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
    labelDoneBtn: { borderRadius: 12, marginTop: 8 },
});

export default NoteEditorScreen;
