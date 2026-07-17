import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, StyleSheet, ScrollView, TextInput as RNTextInput,
    KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { Text, useTheme, IconButton, Chip, TextInput, Button, Portal, Modal } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';

const DEBOUNCE_MS = 500;

const TOOLBAR_BTNS = [
    { icon: 'B', label: 'Bold', markdown: ['**', '**'], style: { fontWeight: 'bold', fontSize: 17 } },
    { icon: 'I', label: 'Italic', markdown: ['*', '*'], style: { fontStyle: 'italic', fontSize: 17 } },
    { icon: '•', label: 'Bullet list', markdown: ['\n- '], style: { fontSize: 18 } },
    { icon: '☐', label: 'Checklist item', markdown: ['\n- [ ] '], style: { fontSize: 16 } },
    { icon: '—', label: 'Divider', markdown: ['\n---\n'], style: { fontSize: 16 } },
];

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
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [isEditing, setIsEditing] = useState(!!noteId);
    const [subjectName, setSubjectName] = useState('');
    const [showCount, setShowCount] = useState(false);

    const debounceRef = useRef(null);
    const bodyRef = useRef(null);
    const noteIdRef = useRef(noteId || null);
    const titleRef = useRef(title);
    const bodyRefForSave = useRef(body);
    const labelsRef = useRef(labels);
    const pinnedRef = useRef(pinned);
    const isChecklistRef = useRef(isChecklist);
    const checklistRef = useRef(checklistItems);

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
                }).catch(e => console.error('Failed to load subject', e));
            }

            navigation.setOptions({ title: note.title || 'Edit Note' });
        } catch (e) {
            console.error('Failed to load note', e);
        }
    };

    const saveImmediate = async () => {
        try {
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
    }, [title, body, labels, pinned, isChecklist, checklistItems]);

    const checklistIdCounter = useRef(0);

    const addChecklistItem = () => {
        checklistIdCounter.current++;
        setChecklistItems(prev => [...prev, { _key: checklistIdCounter.current, text: '', done: false }]);
    };

    const removeChecklistItem = (index) => {
        setChecklistItems(prev => prev.filter((_, i) => i !== index));
    };

    const toggleChecklistItem = (index) => {
        setChecklistItems(prev => prev.map((item, i) =>
            i === index ? { ...item, done: !item.done } : item
        ));
    };

    const updateChecklistItem = (index, text) => {
        setChecklistItems(prev => prev.map((item, i) =>
            i === index ? { ...item, text } : item
        ));
    };

    const insertMarkdown = (before, after = '') => {
        const input = bodyRef.current;
        if (input) {
            const selection = input._lastNativeSelection || { start: body.length, end: body.length };
            const selected = body.slice(selection.start, selection.end);
            const newText = body.slice(0, selection.start) + before + selected + after + body.slice(selection.end);
            setBody(newText);
        } else {
            setBody(prev => prev + before + after);
        }
    };

    const addLabel = () => {
        const trimmed = labelInput.trim();
        if (trimmed && !labels.includes(trimmed)) {
            setLabels([...labels, trimmed]);
            setLabelInput('');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const removeLabel = (label) => {
        setLabels(labels.filter(l => l !== label));
    };

    const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
    const charCount = body.length;
    const lastSavedStr = lastSavedAt
        ? (Date.now() - new Date(lastSavedAt).getTime() < 60000 ? 'just now' : `${Math.floor((Date.now() - new Date(lastSavedAt).getTime()) / 60000)}m ago`)
        : '';

    const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;
    const inputBgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <LinearGradient colors={backgroundGradient} style={styles.container}>
                {/* Header */}
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
                                <View style={[styles.subjectChip, { backgroundColor: theme.colors.primary + '15' }]}>
                                    <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                                        {subjectName}
                                    </Text>
                                </View>
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
                            iconColor={labels.length ? theme.colors.primary : theme.colors.onSurfaceVariant}
                            accessibilityLabel="Edit labels"
                        />
                        <IconButton
                            icon={isChecklist ? 'checklist' : 'text'}
                            size={20}
                            onPress={() => { setIsChecklist(!isChecklist); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                            iconColor={isChecklist ? theme.colors.primary : theme.colors.onSurfaceVariant}
                            accessibilityLabel={isChecklist ? 'Switch to text' : 'Switch to checklist'}
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

                {/* Save / word count bar */}
                <View style={[styles.statusBar, { borderBottomColor: theme.colors.surfaceVariant }]}>
                    <View style={styles.statusLeft}>
                        <View style={[styles.statusDot, { backgroundColor: saved ? theme.colors.attendanceGreen : theme.colors.attendanceYellow }]} />
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {saved ? 'Saved' : 'Saving...'}
                        </Text>
                        {lastSavedStr && saved && (
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                                {lastSavedStr}
                            </Text>
                        )}
                    </View>
                    {showCount && (
                        <Animated.View entering={FadeIn.duration(200)} style={styles.countRow}>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} chars
                            </Text>
                        </Animated.View>
                    )}
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
                        <View style={[styles.toolbar, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                            {TOOLBAR_BTNS.map((btn, i) => (
                                <Pressable
                                    key={i}
                                    style={[styles.toolbarBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                                    onPress={() => insertMarkdown(...btn.markdown)}
                                    accessibilityLabel={btn.label}
                                >
                                    <Text style={[styles.toolbarBtnText, { color: theme.colors.onSurfaceVariant }, btn.style]}>
                                        {btn.icon}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    )}

                    {/* Body / Checklist */}
                    {isChecklist ? (
                        <View style={styles.checklistContainer}>
                            {checklistItems.map((item, index) => (
                                <Animated.View key={item._key || index} entering={FadeInDown.duration(200)} style={[styles.checklistRow, { borderBottomColor: theme.colors.surfaceVariant }]}>
                                    <Pressable onPress={() => toggleChecklistItem(index)} style={styles.checkbox}>
                                        <Text style={{ fontSize: 18 }}>{item.done ? '✅' : '⬜'}</Text>
                                    </Pressable>
                                    <RNTextInput
                                        value={item.text}
                                        onChangeText={(text) => updateChecklistItem(index, text)}
                                        placeholder="Checklist item"
                                        placeholderTextColor={theme.colors.onSurfaceVariant}
                                        style={[styles.checklistInput, {
                                            color: theme.colors.text,
                                            textDecorationLine: item.done ? 'line-through' : 'none',
                                            opacity: item.done ? 0.5 : 1,
                                        }]}
                                    />
                                    <IconButton
                                        icon="close-circle"
                                        size={18}
                                        onPress={() => removeChecklistItem(index)}
                                        iconColor={theme.colors.onSurfaceVariant}
                                        accessibilityLabel="Remove item"
                                    />
                                </Animated.View>
                            ))}
                            <Pressable style={styles.addChecklistBtn} onPress={addChecklistItem}>
                                <IconButton icon="plus-circle-outline" size={20} iconColor={theme.colors.primary} />
                                <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Add item</Text>
                            </Pressable>
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
                                    style={[styles.labelChip, { borderColor: theme.colors.primary + '30', backgroundColor: theme.colors.primary + '10' }]}
                                    textStyle={{ fontSize: 11, color: theme.colors.primary }}
                                    onClose={() => removeLabel(label)}
                                    closeIcon="close-circle"
                                >
                                    {label}
                                </Chip>
                            ))}
                        </View>
                    )}
                </ScrollView>

                {/* Labels Modal */}
                <Portal>
                    <Modal
                        visible={labelModalVisible}
                        onDismiss={() => setLabelModalVisible(false)}
                        contentContainerStyle={[styles.labelModal, { backgroundColor: isDark ? '#18181B' : '#FFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                    >
                        <Text variant="titleMedium" style={[styles.labelModalTitle, { color: theme.colors.text }]}>
                            Edit Labels
                        </Text>
                        <View style={[styles.labelInputRow, { backgroundColor: inputBgColor, borderColor: theme.colors.cardBorder }]}>
                            <RNTextInput
                                value={labelInput}
                                onChangeText={setLabelInput}
                                placeholder="Add label..."
                                placeholderTextColor={theme.colors.onSurfaceVariant}
                                onSubmitEditing={addLabel}
                                style={[styles.labelTextInput, { color: theme.colors.text }]}
                            />
                            <Pressable onPress={addLabel} style={[styles.labelAddBtn, { backgroundColor: theme.colors.primary }]} accessibilityLabel="Add label">
                                <Text style={styles.labelAddBtnText}>+</Text>
                            </Pressable>
                        </View>
                        {labels.length > 0 ? (
                            <Animated.View entering={FadeInDown.duration(300)} style={styles.labelList}>
                                {labels.map(label => (
                                    <Chip
                                        key={label}
                                        compact
                                        mode="outlined"
                                        style={[styles.labelModalChip, { borderColor: theme.colors.primary + '30', backgroundColor: theme.colors.primary + '10' }]}
                                        textStyle={{ color: theme.colors.primary }}
                                        onClose={() => removeLabel(label)}
                                        closeIcon="close-circle"
                                    >
                                        {label}
                                    </Chip>
                                ))}
                            </Animated.View>
                        ) : (
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginVertical: 20 }}>
                                No labels yet. Type above to add one.
                            </Text>
                        )}
                        <Button
                            mode="contained"
                            onPress={() => setLabelModalVisible(false)}
                            style={styles.labelDoneBtn}
                            buttonColor={theme.colors.primary}
                            labelStyle={{ fontWeight: 'bold' }}
                        >
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
    subjectChip: {
        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1,
        alignSelf: 'flex-start', marginTop: 1,
    },
    statusBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1,
    },
    statusLeft: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    countRow: { flexDirection: 'row' },
    scrollArea: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    titleInput: {
        fontSize: 24, fontWeight: 'bold', marginBottom: 8,
        height: 48, paddingHorizontal: 0,
    },
    toolbar: {
        flexDirection: 'row', gap: 6, marginBottom: 14,
        paddingVertical: 10, paddingHorizontal: 8,
        borderRadius: 12, borderWidth: 1,
    },
    toolbarBtn: {
        width: 36, height: 32, borderRadius: 8,
        justifyContent: 'center', alignItems: 'center',
    },
    toolbarBtnText: { fontSize: 16, fontWeight: 'bold' },
    bodyInput: { fontSize: 16, lineHeight: 24, minHeight: 200 },
    checklistContainer: { gap: 2, marginTop: 8 },
    checklistRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderBottomWidth: 1, paddingVertical: 4,
    },
    checkbox: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    checklistInput: { flex: 1, fontSize: 16, paddingVertical: 8 },
    addChecklistBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-start' },
    labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16 },
    labelChip: { borderRadius: 10, height: 28 },
    labelModal: {
        margin: 32, borderRadius: 20, padding: 24, borderWidth: 1,
        ...shadows.large,
    },
    labelModalTitle: { fontWeight: 'bold', marginBottom: 16 },
    labelInputRow: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginBottom: 16,
    },
    labelTextInput: {
        flex: 1, paddingHorizontal: 12, height: 44, fontSize: 14,
    },
    labelAddBtn: {
        width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
    },
    labelAddBtnText: { color: '#FFF', fontSize: 22, fontWeight: 'bold', lineHeight: 24 },
    labelList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
    labelModalChip: { borderRadius: 10, height: 30 },
    labelDoneBtn: { borderRadius: 12, marginTop: 8 },
});

export default NoteEditorScreen;
