import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, FlatList, Alert, Share, Pressable, TextInput as RNTextInput } from 'react-native';
import { Text, useTheme, IconButton, Searchbar, Menu, Button, Chip, Switch } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import GradientCard from '../components/GradientCard';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';

const SORT_OPTIONS = [
    { key: 'updatedAt', label: 'Updated' },
    { key: 'createdAt', label: 'Created' },
    { key: 'title', label: 'Title A-Z' },
];

const NotesHomeScreen = ({ route }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { isDark } = useThemeContext();
    const [notes, setNotes] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMode, setFilterMode] = useState('all'); // 'all' | 'general' | 'subject'
    const [sortKey, setSortKey] = useState('updatedAt');
    const [sortMenuVisible, setSortMenuVisible] = useState(false);
    const [contextMenuNote, setContextMenuNote] = useState(null);
    const searchRef = useRef(null);

    const initialFilter = route?.params?.filter;
    const initialSubjectId = route?.params?.subjectId;

    useFocusEffect(
        useCallback(() => {
            loadData();
            if (initialFilter) setFilterMode(initialFilter);
        }, [initialFilter, initialSubjectId])
    );

    const loadData = async () => {
        const [allNotes, allSubjects] = await Promise.all([
            StorageService.loadNotes(),
            StorageService.loadSubjects(),
        ]);
        setNotes(allNotes);
        setSubjects(allSubjects);
    };

    const getSubjectName = (subjectId) => {
        if (!subjectId) return null;
        const subj = subjects.find(s => s.id === subjectId);
        return subj ? subj.name : null;
    };

    const filteredNotes = useMemo(() => {
        let result = notes.filter(n => !n.archived);

        if (initialSubjectId) {
            result = result.filter(n => n.subjectId === initialSubjectId);
        } else if (filterMode === 'general') {
            result = result.filter(n => !n.subjectId);
        } else if (filterMode === 'subject') {
            result = result.filter(n => n.subjectId);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(n =>
                n.title.toLowerCase().includes(q) ||
                n.body.toLowerCase().includes(q)
            );
        }

        result.sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            if (sortKey === 'title') return a.title.localeCompare(b.title);
            const aTime = new Date(a[sortKey]).getTime();
            const bTime = new Date(b[sortKey]).getTime();
            return bTime - aTime;
        });

        return result;
    }, [notes, filterMode, searchQuery, sortKey, initialSubjectId]);

    const handlePin = async (note, value) => {
        const { notes: updatedNotes } = await StorageService.upsertNote({ ...note, pinned: value });
        setNotes(updatedNotes);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleArchive = async (note) => {
        const updated = await StorageService.archiveNote(note.id, true);
        setNotes(updated);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleDelete = (note) => {
        Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    const updated = await StorageService.deleteNote(note.id);
                    setNotes(updated);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
            },
        ]);
    };

    const handleDuplicate = async (note) => {
        const updated = await StorageService.duplicateNote(note.id);
        setNotes(updated);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleShare = async (note) => {
        try {
            await Share.share({
                title: note.title,
                message: `${note.title}\n\n${note.body}`,
            });
        } catch (e) {
            // user cancelled
        }
    };

    const getRelativeTime = (isoString) => {
        const now = new Date();
        const date = new Date(isoString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const renderRightActions = (note) => {
        return (
            <Pressable
                onPress={() => handleArchive(note)}
                style={[styles.swipeAction, { backgroundColor: theme.colors.attendanceYellow }]}
            >
                <Text style={styles.swipeActionText}>Archive</Text>
            </Pressable>
        );
    };

    const renderLeftActions = (note) => {
        return (
            <Pressable
                onPress={() => handlePin(note, !note.pinned)}
                style={[styles.swipeAction, { backgroundColor: theme.colors.primary }]}
            >
                <Text style={styles.swipeActionText}>{note.pinned ? 'Unpin' : 'Pin'}</Text>
            </Pressable>
        );
    };

    const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;
    const cardGradient = isDark ? gradients.darkCard : gradients.lightCard;

    const renderNoteItem = ({ item, index }) => {
        const subjectName = getSubjectName(item.subjectId);
        const bodyPreview = item.body.replace(/\n/g, ' ').substring(0, 100);

        return (
            <Swipeable
                renderRightActions={() => renderRightActions(item)}
                renderLeftActions={() => renderLeftActions(item)}
                overshootRight={false}
                overshootLeft={false}
            >
                <Animated.View entering={FadeInDown.delay(index * 50).duration(400)} layout={Layout.springify()}>
                    <GradientCard gradient={cardGradient} style={styles.noteCard}>
                        <Pressable
                            onPress={() => navigation.navigate('NoteEditor', { noteId: item.id, subjectId: item.subjectId })}
                            onLongPress={() => setContextMenuNote(item.id === contextMenuNote?.id ? null : item)}
                            style={styles.notePressable}
                            android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
                        >
                            <View style={styles.noteContent}>
                                <View style={styles.noteHeader}>
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        {item.pinned && (
                                            <Text style={styles.pinIcon}>📌</Text>
                                        )}
                                        <Text variant="titleSmall" style={[styles.noteTitle, { color: theme.colors.text }]} numberOfLines={1}>
                                            {item.title || 'Untitled'}
                                        </Text>
                                    </View>
                                    <Menu
                                        visible={contextMenuNote?.id === item.id}
                                        onDismiss={() => setContextMenuNote(null)}
                                        anchor={
                                            <IconButton
                                                icon="dots-vertical"
                                                size={18}
                                                onPress={() => setContextMenuNote(item)}
                                                iconColor={theme.colors.onSurfaceVariant}
                                                accessibilityLabel="Note options"
                                            />
                                        }
                                        anchorPosition="bottom"
                                    >
                                        <Menu.Item
                                            leadingIcon={item.pinned ? 'pin-off' : 'pin'}
                                            onPress={() => { setContextMenuNote(null); handlePin(item, !item.pinned); }}
                                            title={item.pinned ? 'Unpin' : 'Pin'}
                                        />
                                        <Menu.Item
                                            leadingIcon="content-duplicate"
                                            onPress={() => { setContextMenuNote(null); handleDuplicate(item); }}
                                            title="Duplicate"
                                        />
                                        <Menu.Item
                                            leadingIcon="archive"
                                            onPress={() => { setContextMenuNote(null); handleArchive(item); }}
                                            title="Archive"
                                        />
                                        <Menu.Item
                                            leadingIcon="share-variant"
                                            onPress={() => { setContextMenuNote(null); handleShare(item); }}
                                            title="Share"
                                        />
                                        <Menu.Item
                                            leadingIcon="delete"
                                            onPress={() => { setContextMenuNote(null); handleDelete(item); }}
                                            title="Delete"
                                            titleStyle={{ color: theme.colors.error }}
                                        />
                                    </Menu>
                                </View>

                                {subjectName && (
                                    <Chip
                                        mode="outlined"
                                        style={[styles.subjectChip, { borderColor: theme.colors.cardBorder }]}
                                        textStyle={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}
                                        compact
                                    >
                                        {subjectName}
                                    </Chip>
                                )}

                                {item.checklist ? (
                                    <View style={styles.checklistPreview}>
                                        {item.checklist.slice(0, 3).map((c, i) => (
                                            <Text key={i} variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                                                {c.done ? '✅' : '⬜'} {c.text}
                                            </Text>
                                        ))}
                                        {item.checklist.length > 3 && (
                                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                                +{item.checklist.length - 3} more
                                            </Text>
                                        )}
                                    </View>
                                ) : (
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }} numberOfLines={2}>
                                        {bodyPreview || 'No content'}
                                    </Text>
                                )}

                                <View style={styles.noteFooter}>
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        {getRelativeTime(item.updatedAt)}
                                    </Text>
                                    {item.labels.length > 0 && (
                                        <View style={styles.labelsRow}>
                                            {item.labels.slice(0, 2).map((label, i) => (
                                                <Text key={i} variant="labelSmall" style={[styles.labelChip, { color: theme.colors.primary }]}>
                                                    #{label}
                                                </Text>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>
                        </Pressable>
                    </GradientCard>
                </Animated.View>
            </Swipeable>
        );
    };

    return (
        <LinearGradient colors={backgroundGradient} style={styles.container}>
            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder="Search notes..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                    inputStyle={{ color: theme.colors.text }}
                    iconColor={theme.colors.onSurfaceVariant}
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                />
            </View>

            <View style={styles.filterRow}>
                <View style={styles.filterChips}>
                    {['all', 'general', 'subject'].map(mode => (
                        <Chip
                            key={mode}
                            selected={filterMode === mode}
                            onPress={() => setFilterMode(mode)}
                            style={[styles.filterChip, { borderColor: theme.colors.cardBorder }]}
                            textStyle={{ fontSize: 12, color: filterMode === mode ? '#FFF' : theme.colors.onSurfaceVariant }}
                            compact
                            showSelectedCheck={false}
                        >
                            {mode === 'all' ? 'All' : mode === 'general' ? 'General' : 'Subjects'}
                        </Chip>
                    ))}
                </View>
                <Menu
                    visible={sortMenuVisible}
                    onDismiss={() => setSortMenuVisible(false)}
                    anchor={
                        <Pressable onPress={() => setSortMenuVisible(true)} style={styles.sortButton}>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                Sort: {SORT_OPTIONS.find(o => o.key === sortKey)?.label}
                            </Text>
                            <IconButton icon="unfold-more-variant" size={16} iconColor={theme.colors.onSurfaceVariant} />
                        </Pressable>
                    }
                >
                    {SORT_OPTIONS.map(opt => (
                        <Menu.Item
                            key={opt.key}
                            onPress={() => { setSortKey(opt.key); setSortMenuVisible(false); }}
                            title={opt.label}
                            leadingIcon={sortKey === opt.key ? 'check' : undefined}
                        />
                    ))}
                </Menu>
            </View>

            <FlatList
                data={filteredNotes}
                keyExtractor={item => item.id}
                renderItem={renderNoteItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Animated.View entering={FadeInDown.duration(500)} style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>{searchQuery ? '🔍' : '📝'}</Text>
                        <Text variant="titleLarge" style={[styles.emptyTitle, { color: theme.colors.text }]}>
                            {searchQuery ? 'No notes found' : 'No notes yet'}
                        </Text>
                        <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                            {searchQuery ? 'Try a different search' : 'Tap + to create your first note'}
                        </Text>
                    </Animated.View>
                }
            />

            <Pressable
                onPress={() => navigation.navigate('NoteEditor', { subjectId: initialSubjectId || null })}
                style={styles.fab}
            >
                <LinearGradient colors={gradients.primary} style={[styles.fabGradient, shadows.large]}>
                    <IconButton icon="plus" size={24} iconColor="#FFF" />
                </LinearGradient>
            </Pressable>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    searchContainer: { padding: 16, paddingBottom: 8 },
    searchBar: { borderRadius: 12, elevation: 0 },
    filterRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 8,
    },
    filterChips: { flexDirection: 'row', gap: 6 },
    filterChip: { borderRadius: 16, borderWidth: 1 },
    sortButton: { flexDirection: 'row', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 80 },
    noteCard: { marginBottom: 8 },
    notePressable: { padding: 14 },
    noteContent: {},
    noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    noteTitle: { fontWeight: 'bold', flex: 1 },
    pinIcon: { fontSize: 14 },
    subjectChip: { alignSelf: 'flex-start', marginTop: 6, height: 24, borderRadius: 12 },
    checklistPreview: { marginTop: 6, gap: 2 },
    noteFooter: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 8,
    },
    labelsRow: { flexDirection: 'row', gap: 4 },
    labelChip: { fontWeight: '600' },
    swipeAction: {
        justifyContent: 'center', alignItems: 'center',
        width: 72, borderRadius: 16, marginBottom: 8,
    },
    swipeActionText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
    emptyState: { alignItems: 'center', padding: 40, marginTop: 40 },
    emptyEmoji: { fontSize: 64, marginBottom: 16 },
    emptyTitle: { fontWeight: 'bold', marginBottom: 8 },
    emptySubtitle: { textAlign: 'center', opacity: 0.7 },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
    fabGradient: { borderRadius: 28, overflow: 'hidden' },
});

export default NotesHomeScreen;
