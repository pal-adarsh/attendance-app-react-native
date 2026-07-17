import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, FlatList, Alert, Share, Pressable } from 'react-native';
import { Text, useTheme, IconButton, Searchbar, Menu, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown, Layout, FadeIn } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import * as Haptics from 'expo-haptics';
import { gradients, shadows } from '../constants/theme';

const SORT_OPTIONS = [
    { key: 'updatedAt', label: 'Updated' },
    { key: 'createdAt', label: 'Created' },
    { key: 'title', label: 'Title A-Z' },
];

const SECTION_ORDER = ['pinned', 'today', 'yesterday', 'week', 'older'];

const getDateLabel = (date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today - target) / 86400000);
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return 'week';
    return 'older';
};

const groupNotesIntoSections = (notes) => {
    const pinned = notes.filter(n => n.pinned);
    const unpinned = notes.filter(n => !n.pinned);
    const groups = { pinned: pinned.length ? [{ title: 'Pinned', data: pinned }] : [] };
    const sections = { today: [], yesterday: [], week: [], older: [] };
    unpinned.forEach(n => {
        const label = getDateLabel(new Date(n.updatedAt));
        sections[label].push(n);
    });
    const result = [];
    if (pinned.length) result.push({ title: 'Pinned', data: pinned, icon: 'pin' });
    const labels = { today: 'Today', yesterday: 'Yesterday', week: 'This Week', older: 'Older' };
    Object.keys(labels).forEach(key => {
        if (sections[key].length) result.push({ title: labels[key], data: sections[key] });
    });
    return result;
};

const NotesHomeScreen = ({ route }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { isDark } = useThemeContext();
    const [notes, setNotes] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMode, setFilterMode] = useState('all');
    const [sortKey, setSortKey] = useState('updatedAt');
    const [sortMenuVisible, setSortMenuVisible] = useState(false);
    const [contextMenuNote, setContextMenuNote] = useState(null);
    const listRef = useRef(null);

    const initialFilter = route?.params?.filter;
    const initialSubjectId = route?.params?.subjectId;

    useFocusEffect(
        useCallback(() => {
            loadData();
            if (initialFilter) setFilterMode(initialFilter);
        }, [initialFilter, initialSubjectId])
    );

    const loadData = async () => {
        try {
            const [allNotes, allSubjects] = await Promise.all([
                StorageService.loadNotes(),
                StorageService.loadSubjects(),
            ]);
            setNotes(allNotes);
            setSubjects(allSubjects);
        } catch (e) {
            console.error('Failed to load notes data', e);
        }
    };

    const getSubjectInfo = (subjectId) => {
        if (!subjectId) return null;
        const subj = subjects.find(s => s.id === subjectId);
        return subj ? { name: subj.name, color: subj.color || theme.colors.primary } : null;
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
            if (sortKey === 'title') return a.title.localeCompare(b.title);
            const aTime = new Date(a[sortKey]).getTime();
            const bTime = new Date(b[sortKey]).getTime();
            return bTime - aTime;
        });
        return result;
    }, [notes, filterMode, searchQuery, sortKey, initialSubjectId]);

    const sections = useMemo(() => groupNotesIntoSections(filteredNotes), [filteredNotes]);

    const handlePin = async (note, value) => {
        try {
            const { notes: updatedNotes } = await StorageService.upsertNote({ ...note, pinned: value });
            setNotes(updatedNotes);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {
            console.error('Failed to pin note', e);
        }
    };

    const handleArchive = async (note) => {
        try {
            const updated = await StorageService.archiveNote(note.id, true);
            setNotes(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            console.error('Failed to archive note', e);
        }
    };

    const handleDelete = (note) => {
        Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        const updated = await StorageService.deleteNote(note.id);
                        setNotes(updated);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (e) {
                        console.error('Failed to delete note', e);
                    }
                },
            },
        ]);
    };

    const handleDuplicate = async (note) => {
        try {
            const updated = await StorageService.duplicateNote(note.id);
            setNotes(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            console.error('Failed to duplicate note', e);
        }
    };

    const handleShare = async (note) => {
        try {
            await Share.share({
                title: note.title,
                message: `${note.title}\n\n${note.body}`,
            });
        } catch (e) {}
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

    const totalActive = notes.filter(n => !n.archived).length;

    const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;

    const renderSectionHeader = (section) => {
        if (section.title === 'Pinned' && section.data.length === 0) return null;
        return (
            <Animated.View entering={FadeIn.duration(300)} style={styles.sectionHeader}>
                {section.icon === 'pin' && (
                    <Text style={styles.sectionPinIcon}>📌</Text>
                )}
                <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                    {section.title}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>
                    {section.data.length}
                </Text>
            </Animated.View>
        );
    };

    const renderRightActions = (note) => {
        return (
            <Pressable
                onPress={() => handleArchive(note)}
                style={[styles.swipeAction, { backgroundColor: theme.colors.attendanceYellow }]}
            >
                <Text style={styles.swipeActionIcon}>📁</Text>
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
                <Text style={styles.swipeActionIcon}>{note.pinned ? '📌' : '📍'}</Text>
                <Text style={styles.swipeActionText}>{note.pinned ? 'Unpin' : 'Pin'}</Text>
            </Pressable>
        );
    };

    const renderNoteItem = ({ item, index }) => {
        const subjectInfo = getSubjectInfo(item.subjectId);
        const bodyPreview = item.body.replace(/\n/g, ' ').substring(0, 120);
        const firstLine = item.body.split('\n')[0]?.trim();
        const previewText = firstLine || bodyPreview || 'No content';

        return (
            <Swipeable
                renderRightActions={() => renderRightActions(item)}
                renderLeftActions={() => renderLeftActions(item)}
                overshootRight={false}
                overshootLeft={false}
            >
                <Animated.View entering={FadeInDown.delay(index * 40).duration(350)} layout={Layout.springify()}>
                    <Pressable
                        onPress={() => navigation.navigate('NoteEditor', { noteId: item.id, subjectId: item.subjectId })}
                        onLongPress={() => setContextMenuNote(item.id === contextMenuNote?.id ? null : item)}
                        style={[styles.noteCard, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            borderLeftWidth: item.pinned ? 3 : 0,
                            borderLeftColor: theme.colors.attendanceYellow,
                        }]}
                        android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
                    >
                        <View style={styles.noteContent}>
                            <View style={styles.noteHeader}>
                                <View style={styles.noteTitleRow}>
                                    {item.pinned && (
                                        <Text style={styles.pinIconSmall}>📌</Text>
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

                            <View style={styles.metaRow}>
                                {subjectInfo && (
                                    <View style={[styles.subjectBadge, { backgroundColor: subjectInfo.color + '20', borderColor: subjectInfo.color + '40' }]}>
                                        <Text style={[styles.subjectBadgeText, { color: subjectInfo.color }]} numberOfLines={1}>
                                            {subjectInfo.name}
                                        </Text>
                                    </View>
                                )}
                                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {getRelativeTime(item.updatedAt)}
                                </Text>
                            </View>

                            {item.checklist ? (
                                <View style={styles.checklistPreview}>
                                    {item.checklist.slice(0, 3).map((c, i) => (
                                        <Text key={c._key || i} variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
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
                                    {previewText}
                                </Text>
                            )}

                            {item.labels.length > 0 && (
                                <View style={styles.labelsRow}>
                                    {item.labels.slice(0, 3).map((label, i) => (
                                        <View key={i} style={[styles.labelPill, { backgroundColor: theme.colors.primary + '15' }]}>
                                            <Text variant="labelSmall" style={{ color: theme.colors.primary }}>#{label}</Text>
                                        </View>
                                    ))}
                                    {item.labels.length > 3 && (
                                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                            +{item.labels.length - 3}
                                        </Text>
                                    )}
                                </View>
                            )}
                        </View>
                    </Pressable>
                </Animated.View>
            </Swipeable>
        );
    };

    return (
        <LinearGradient colors={backgroundGradient} style={styles.container}>
            {/* Search bar */}
            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder="Search notes..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                    inputStyle={{ color: theme.colors.text, fontSize: 14 }}
                    iconColor={theme.colors.onSurfaceVariant}
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                />
            </View>

            {/* Filter + Sort row */}
            <View style={styles.filterRow}>
                <View style={styles.filterChips}>
                    {['all', 'general', 'subject'].map(mode => (
                        <Chip
                            key={mode}
                            selected={filterMode === mode}
                            onPress={() => setFilterMode(mode)}
                            style={[styles.filterChip, { backgroundColor: filterMode === mode ? theme.colors.primary + '20' : 'transparent', borderColor: theme.colors.cardBorder }]}
                            textStyle={{ fontSize: 12, color: filterMode === mode ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: filterMode === mode ? 'bold' : 'normal' }}
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
                        <Pressable onPress={() => setSortMenuVisible(true)} style={styles.sortButton} accessibilityLabel="Sort notes">
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                {SORT_OPTIONS.find(o => o.key === sortKey)?.label}
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
                            titleStyle={{ fontWeight: sortKey === opt.key ? 'bold' : 'normal' }}
                        />
                    ))}
                </Menu>
            </View>

            {/* Note count badge */}
            {totalActive > 0 && (
                <View style={styles.countRow}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {totalActive} {totalActive === 1 ? 'note' : 'notes'}
                    </Text>
                </View>
            )}

            {/* Note list with sections */}
            <FlatList
                ref={listRef}
                data={sections}
                keyExtractor={s => s.title}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Animated.View entering={FadeInDown.duration(500)} style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>{searchQuery ? '🔍' : '📝'}</Text>
                        <Text variant="titleLarge" style={[styles.emptyTitle, { color: theme.colors.text }]}>
                            {searchQuery ? 'No notes found' : 'No notes yet'}
                        </Text>
                        <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                            {searchQuery ? 'Try a different search term' : 'Create your first note to get started'}
                        </Text>
                        {!searchQuery && (
                            <View style={styles.emptyActions}>
                                <Pressable
                                    onPress={() => navigation.navigate('NoteEditor', { subjectId: initialSubjectId || null })}
                                    style={[styles.emptyBtn, { backgroundColor: theme.colors.primary }]}
                                >
                                    <Text style={styles.emptyBtnText}>Create Note</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => navigation.navigate('HowToUse')}
                                    style={[styles.emptyBtn, { backgroundColor: theme.colors.surfaceVariant, marginLeft: 8 }]}
                                >
                                    <Text style={[styles.emptyBtnText, { color: theme.colors.text }]}>Learn More</Text>
                                </Pressable>
                            </View>
                        )}
                    </Animated.View>
                }
                renderItem={({ item: section, index: sIdx }) => (
                    <View style={styles.sectionWrapper}>
                        {renderSectionHeader(section)}
                        {section.data.map((note, nIdx) => (
                            <View key={note.id}>
                                {renderNoteItem({ item: note, index: nIdx })}
                            </View>
                        ))}
                    </View>
                )}
            />

            {/* FAB */}
            <Pressable
                onPress={() => navigation.navigate('NoteEditor', { subjectId: initialSubjectId || null })}
                style={styles.fab}
                accessibilityLabel="Create new note"
            >
                <LinearGradient colors={gradients.primary} style={[styles.fabGradient, shadows.large]}>
                    <IconButton icon="plus" size={24} iconColor="#FFF" accessibilityLabel="Create note" />
                </LinearGradient>
            </Pressable>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    searchContainer: { padding: 16, paddingBottom: 8 },
    searchBar: { borderRadius: 14, elevation: 0, height: 44 },
    filterRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 4,
    },
    filterChips: { flexDirection: 'row', gap: 6 },
    filterChip: { borderRadius: 16, borderWidth: 1, height: 32 },
    sortButton: { flexDirection: 'row', alignItems: 'center' },
    countRow: { paddingHorizontal: 16, paddingBottom: 4 },
    listContent: { paddingHorizontal: 16, paddingBottom: 80 },
    sectionWrapper: { marginBottom: 4 },
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingTop: 16, paddingBottom: 8,
    },
    sectionPinIcon: { fontSize: 12, marginRight: 4 },
    sectionTitle: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    noteCard: {
        borderRadius: 14, borderWidth: 1, marginBottom: 8,
        ...shadows.small,
    },
    noteContent: { padding: 14 },
    noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    noteTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
    noteTitle: { fontWeight: 'bold', flex: 1 },
    pinIconSmall: { fontSize: 13 },
    metaRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginTop: 6,
    },
    subjectBadge: {
        borderRadius: 8, borderWidth: 1,
        paddingHorizontal: 8, paddingVertical: 2,
    },
    subjectBadgeText: { fontSize: 11, fontWeight: '600' },
    checklistPreview: { marginTop: 6, gap: 2 },
    labelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
    labelPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    swipeAction: {
        justifyContent: 'center', alignItems: 'center',
        width: 76, borderRadius: 14, marginBottom: 8, gap: 2,
    },
    swipeActionIcon: { fontSize: 18 },
    swipeActionText: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
    emptyState: { alignItems: 'center', padding: 40, marginTop: 40 },
    emptyEmoji: { fontSize: 64, marginBottom: 16 },
    emptyTitle: { fontWeight: 'bold', marginBottom: 8 },
    emptySubtitle: { textAlign: 'center', opacity: 0.7, marginBottom: 20 },
    emptyActions: { flexDirection: 'row' },
    emptyBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
    emptyBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
    fabGradient: { borderRadius: 28, overflow: 'hidden' },
});

export default NotesHomeScreen;
