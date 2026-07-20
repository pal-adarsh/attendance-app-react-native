import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, FlatList, Alert, Share, Pressable, TextInput as RNTextInput } from 'react-native';
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
    const result = [];
    if (pinned.length) result.push({ title: 'Pinned', data: pinned, icon: 'pin' });
    const sections = { today: [], yesterday: [], week: [], older: [] };
    unpinned.forEach(n => {
        const label = getDateLabel(new Date(n.updatedAt));
        sections[label].push(n);
    });
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

    const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'todo'
    const [notes, setNotes] = useState([]);
    const [todos, setTodos] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMode, setFilterMode] = useState('all');
    const [todoFilter, setTodoFilter] = useState('all'); // 'all' | 'active' | 'completed'
    const [sortKey, setSortKey] = useState('updatedAt');
    const [sortMenuVisible, setSortMenuVisible] = useState(false);
    const [contextMenuNote, setContextMenuNote] = useState(null);
    const [newTodoText, setNewTodoText] = useState('');

    const listRef = useRef(null);
    const todoInputRef = useRef(null);

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
            const [allNotes, allTodos, allSubjects] = await Promise.all([
                StorageService.loadNotes(),
                StorageService.loadTodos(),
                StorageService.loadSubjects(),
            ]);
            setNotes(allNotes);
            setTodos(allTodos);
            setSubjects(allSubjects);
        } catch (e) {
            console.error('Failed to load notes & todos data', e);
        }
    };

    const getSubjectInfo = (subjectId) => {
        if (!subjectId) return null;
        const subj = subjects.find(s => s.id === subjectId);
        return subj ? { name: subj.name, color: subj.color || theme.colors.primary } : null;
    };

    const filteredNotes = useMemo(() => {
        let result = notes;
        if (filterMode === 'archived') {
            result = result.filter(n => n.archived);
        } else {
            result = result.filter(n => !n.archived);
            if (initialSubjectId) {
                result = result.filter(n => n.subjectId === initialSubjectId);
            } else if (filterMode === 'general') {
                result = result.filter(n => !n.subjectId);
            } else if (filterMode === 'subject') {
                result = result.filter(n => n.subjectId);
            }
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

    const noteSections = useMemo(() => groupNotesIntoSections(filteredNotes), [filteredNotes]);

    const allSubjectTodos = useMemo(() => {
        if (initialSubjectId) {
            return todos.filter(t => t.subjectId === initialSubjectId);
        }
        return todos;
    }, [todos, initialSubjectId]);

    const completedTodos = useMemo(() => allSubjectTodos.filter(t => t.completed), [allSubjectTodos]);
    const activeTodos = useMemo(() => allSubjectTodos.filter(t => !t.completed), [allSubjectTodos]);

    const filteredTodos = useMemo(() => {
        let result = allSubjectTodos;
        if (todoFilter === 'active') {
            result = result.filter(t => !t.completed);
        } else if (todoFilter === 'completed') {
            result = result.filter(t => t.completed);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(t => t.text.toLowerCase().includes(q));
        }
        return result;
    }, [allSubjectTodos, searchQuery, todoFilter]);

    const handlePin = async (note, value) => {
        try {
            const { notes: updatedNotes } = await StorageService.upsertNote({ ...note, pinned: value });
            setNotes(updatedNotes);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {
            console.error('Failed to pin note', e);
        }
    };

    const handleArchive = async (note, archiveValue = true) => {
        try {
            const updated = await StorageService.archiveNote(note.id, archiveValue);
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

    const handleAddTodo = useCallback(async () => {
        const text = newTodoText.trim();
        if (!text) return;
        try {
            const updated = await StorageService.addTodo(text, initialSubjectId || null);
            setTodos(updated);
            setNewTodoText('');
            todoInputRef.current?.blur();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            console.error('Failed to add todo', e);
            Alert.alert('Error', 'Failed to add task: ' + e.message);
        }
    }, [newTodoText, initialSubjectId]);

    const handleToggleTodo = async (id) => {
        try {
            const updated = await StorageService.toggleTodo(id);
            setTodos(updated);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {
            console.error('Failed to toggle todo', e);
        }
    };

    const handleDeleteTodo = async (id) => {
        try {
            const updated = await StorageService.deleteTodo(id);
            setTodos(updated);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {
            console.error('Failed to delete todo', e);
        }
    };

    const handleClearCompleted = async () => {
        try {
            const updated = await StorageService.clearCompletedTodos();
            setTodos(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            console.error('Failed to clear completed todos', e);
        }
    };

    const getRelativeTime = (isoString) => {
        const now = new Date();
        const date = new Date(isoString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;

    const renderSectionHeader = (section) => (
        <View style={styles.sectionHeader}>
            {section.icon && <Text style={styles.sectionPinIcon}>📌</Text>}
            <Text variant="labelMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                {section.title}
            </Text>
        </View>
    );

    const renderRightActions = (note) => {
        return (
            <Pressable
                onPress={() => handleDelete(note)}
                style={[styles.swipeAction, { backgroundColor: theme.colors.error }]}
            >
                <Text style={styles.swipeActionIcon}>🗑️</Text>
                <Text style={styles.swipeActionText}>Delete</Text>
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
                            borderLeftColor: theme.colors.primary,
                        }]}
                    >
                        <View style={styles.noteContent}>
                            <View style={styles.noteHeader}>
                                <Text variant="titleSmall" style={[styles.noteTitle, { color: theme.colors.text }]} numberOfLines={1}>
                                    {item.title || 'Untitled'}
                                </Text>
                                <Menu
                                    visible={contextMenuNote?.id === item.id}
                                    onDismiss={() => setContextMenuNote(null)}
                                    anchor={
                                        <IconButton
                                            icon="dots-vertical"
                                            size={18}
                                            onPress={() => setContextMenuNote(item)}
                                            iconColor={theme.colors.onSurfaceVariant}
                                        />
                                    }
                                >
                                    <Menu.Item leadingIcon={item.pinned ? 'pin-off' : 'pin'} onPress={() => { setContextMenuNote(null); handlePin(item, !item.pinned); }} title={item.pinned ? 'Unpin' : 'Pin'} />
                                    <Menu.Item leadingIcon="content-duplicate" onPress={() => { setContextMenuNote(null); handleDuplicate(item); }} title="Duplicate" />
                                    <Menu.Item leadingIcon={item.archived ? 'archive-arrow-up' : 'archive'} onPress={() => { setContextMenuNote(null); handleArchive(item, !item.archived); }} title={item.archived ? 'Unarchive' : 'Archive'} />
                                    <Menu.Item leadingIcon="share-variant" onPress={() => { setContextMenuNote(null); handleShare(item); }} title="Share" />
                                    <Menu.Item leadingIcon="delete" onPress={() => { setContextMenuNote(null); handleDelete(item); }} title="Delete" titleStyle={{ color: theme.colors.error }} />
                                </Menu>
                            </View>
                            <View style={styles.metaRow}>
                                {subjectInfo && (
                                    <View style={[styles.subjectBadge, { backgroundColor: subjectInfo.color + '20', borderColor: subjectInfo.color + '40' }]}>
                                        <Text style={[styles.subjectBadgeText, { color: subjectInfo.color }]} numberOfLines={1}>{subjectInfo.name}</Text>
                                    </View>
                                )}
                                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{getRelativeTime(item.updatedAt)}</Text>
                            </View>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }} numberOfLines={2}>{previewText}</Text>
                        </View>
                    </Pressable>
                </Animated.View>
            </Swipeable>
        );
    };

    const renderTodoItem = (item) => {
        const subjectInfo = getSubjectInfo(item.subjectId);
        return (
            <Pressable
                key={item.id}
                onPress={() => handleToggleTodo(item.id)}
                style={[
                    styles.todoCard,
                    {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        opacity: item.completed ? 0.6 : 1,
                    }
                ]}
            >
                <IconButton
                    icon={item.completed ? 'check-circle' : 'circle-outline'}
                    iconColor={item.completed ? '#10B981' : theme.colors.onSurfaceVariant}
                    size={22}
                    onPress={() => handleToggleTodo(item.id)}
                />
                <View style={{ flex: 1, paddingVertical: 10, paddingRight: 4 }}>
                    <Text style={[styles.todoText, { color: theme.colors.text }, item.completed && styles.todoCompletedText]}>{item.text}</Text>
                    {subjectInfo && (
                        <View style={[styles.subjectBadge, { backgroundColor: subjectInfo.color + '20', borderColor: subjectInfo.color + '40', alignSelf: 'flex-start', marginTop: 4 }]}>
                            <Text style={[styles.subjectBadgeText, { color: subjectInfo.color }]} numberOfLines={1}>{subjectInfo.name}</Text>
                        </View>
                    )}
                </View>
                <IconButton
                    icon="close-circle-outline"
                    iconColor={theme.colors.onSurfaceVariant}
                    size={20}
                    onPress={() => handleDeleteTodo(item.id)}
                />
            </Pressable>
        );
    };

    return (
        <LinearGradient colors={backgroundGradient} style={styles.container}>
            <View style={styles.topTabContainer}>
                <View style={[styles.topTabBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <Pressable
                        onPress={() => { setActiveTab('notes'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[styles.topTabBtn, activeTab === 'notes' && { backgroundColor: theme.colors.primary, ...shadows.small }]}
                    >
                        <Text style={[styles.topTabText, { color: activeTab === 'notes' ? '#FFF' : theme.colors.onSurfaceVariant, fontWeight: activeTab === 'notes' ? 'bold' : '600' }]}>📝 Notes</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => { setActiveTab('todo'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[styles.topTabBtn, activeTab === 'todo' && { backgroundColor: theme.colors.primary, ...shadows.small }]}
                    >
                        <Text style={[styles.topTabText, { color: activeTab === 'todo' ? '#FFF' : theme.colors.onSurfaceVariant, fontWeight: activeTab === 'todo' ? 'bold' : '600' }]}>☑️ To-Do</Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder={activeTab === 'notes' ? "Search notes..." : "Search tasks..."}
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                    inputStyle={{ color: theme.colors.text, fontSize: 14 }}
                    iconColor={theme.colors.onSurfaceVariant}
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                />
            </View>

            {activeTab === 'notes' ? (
                <>
                    <View style={styles.filterRow}>
                        <View style={styles.filterChips}>
                            {['all', 'general', 'subject', 'archived'].map(mode => (
                                <Chip
                                    key={mode}
                                    selected={filterMode === mode}
                                    onPress={() => { setFilterMode(mode); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                    style={[styles.filterChip, { backgroundColor: filterMode === mode ? theme.colors.primary + '20' : 'transparent', borderColor: theme.colors.cardBorder }]}
                                    textStyle={{ fontSize: 12, color: filterMode === mode ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: filterMode === mode ? 'bold' : 'normal' }}
                                    compact
                                    showSelectedCheck={false}
                                >
                                    {mode === 'all' ? 'All' : mode === 'general' ? 'General' : mode === 'subject' ? 'Subjects' : 'Archived'}
                                </Chip>
                            ))}
                        </View>
                        <Menu
                            visible={sortMenuVisible}
                            onDismiss={() => setSortMenuVisible(false)}
                            anchor={
                                <Pressable onPress={() => setSortMenuVisible(true)} style={styles.sortButton} accessibilityLabel="Sort notes">
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{SORT_OPTIONS.find(o => o.key === sortKey)?.label}</Text>
                                    <IconButton icon="unfold-more-variant" size={16} iconColor={theme.colors.onSurfaceVariant} />
                                </Pressable>
                            }
                        >
                            {SORT_OPTIONS.map(opt => (
                                <Menu.Item key={opt.key} onPress={() => { setSortKey(opt.key); setSortMenuVisible(false); }} title={opt.label} leadingIcon={sortKey === opt.key ? 'check' : undefined} titleStyle={{ fontWeight: sortKey === opt.key ? 'bold' : 'normal' }} />
                            ))}
                        </Menu>
                    </View>
                    {filteredNotes.length > 0 && (
                        <View style={styles.countRow}>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'} {filterMode === 'archived' ? 'archived' : ''}</Text>
                        </View>
                    )}
                    <FlatList
                        ref={listRef}
                        data={noteSections}
                        keyExtractor={s => s.title}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <Animated.View entering={FadeInDown.duration(500)} style={styles.emptyState}>
                                <Text style={styles.emptyEmoji}>{searchQuery ? '🔍' : filterMode === 'archived' ? '📦' : '📝'}</Text>
                                <Text variant="titleLarge" style={[styles.emptyTitle, { color: theme.colors.text }]}>{searchQuery ? 'No notes found' : filterMode === 'archived' ? 'No archived notes' : 'No notes yet'}</Text>
                                <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>{searchQuery ? 'Try a different search term' : filterMode === 'archived' ? 'Notes you archive will appear here' : 'Create your first note to get started'}</Text>
                                {!searchQuery && filterMode !== 'archived' && (
                                    <View style={styles.emptyActions}>
                                        <Pressable onPress={() => navigation.navigate('NoteEditor', { subjectId: initialSubjectId || null })} style={[styles.emptyBtn, { backgroundColor: theme.colors.primary }]}>
                                            <Text style={styles.emptyBtnText}>Create Note</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </Animated.View>
                        }
                        renderItem={({ item: section }) => (
                            <View style={styles.sectionWrapper}>
                                {renderSectionHeader(section)}
                                {section.data.map((note, nIdx) => <View key={note.id}>{renderNoteItem({ item: note, index: nIdx })}</View>)}
                            </View>
                        )}
                    />
                    <Pressable onPress={() => navigation.navigate('NoteEditor', { subjectId: initialSubjectId || null })} style={styles.fab} accessibilityLabel="Create new note">
                        <LinearGradient colors={gradients.primary} style={[styles.fabGradient, shadows.large]}>
                            <IconButton icon="plus" size={24} iconColor="#FFF" accessibilityLabel="Create note" />
                        </LinearGradient>
                    </Pressable>
                </>
            ) : (
                <View style={{ flex: 1 }}>
                    <View style={styles.addTodoContainer}>
                        <RNTextInput
                            ref={todoInputRef}
                            value={newTodoText}
                            onChangeText={setNewTodoText}
                            placeholder="Add a new task..."
                            placeholderTextColor={theme.colors.onSurfaceVariant}
                            onSubmitEditing={handleAddTodo}
                            returnKeyType="done"
                            blurOnSubmit={false}
                            style={[styles.addTodoInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.colors.text }]}
                        />
                        <Pressable
                            onPress={handleAddTodo}
                            style={[styles.addTodoBtn, { backgroundColor: newTodoText.trim() ? theme.colors.primary : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)') }]}
                        >
                            <Text style={[styles.addTodoBtnText, { color: newTodoText.trim() ? '#FFF' : theme.colors.onSurfaceVariant }]}>+ Add</Text>
                        </Pressable>
                    </View>

                    <View style={styles.filterRow}>
                        <View style={styles.filterChips}>
                            {[
                                { key: 'all', label: 'All' },
                                { key: 'active', label: 'Active' },
                                { key: 'completed', label: 'Completed' },
                            ].map(f => (
                                <Chip
                                    key={f.key}
                                    selected={todoFilter === f.key}
                                    onPress={() => {
                                        setTodoFilter(f.key);
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                    style={[
                                        styles.filterChip,
                                        {
                                            backgroundColor: todoFilter === f.key ? theme.colors.primary + '20' : 'transparent',
                                            borderColor: theme.colors.cardBorder
                                        }
                                    ]}
                                    textStyle={{
                                        fontSize: 12,
                                        color: todoFilter === f.key ? theme.colors.primary : theme.colors.onSurfaceVariant,
                                        fontWeight: todoFilter === f.key ? 'bold' : 'normal'
                                    }}
                                    compact
                                    showSelectedCheck={false}
                                >
                                    {f.label}
                                </Chip>
                            ))}
                        </View>
                        {completedTodos.length > 0 && (
                            <Pressable onPress={handleClearCompleted} style={styles.clearDoneBtn}>
                                <IconButton icon="broom" size={16} iconColor={theme.colors.error} style={{ margin: 0, padding: 0 }} />
                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.colors.error }}>Clear Done</Text>
                            </Pressable>
                        )}
                    </View>

                    {allSubjectTodos.length > 0 && (
                        <View style={styles.todoProgressRow}>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600' }}>
                                {completedTodos.length} of {allSubjectTodos.length} completed
                            </Text>
                        </View>
                    )}

                    <FlatList
                        data={filteredTodos}
                        keyExtractor={item => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <Animated.View entering={FadeInDown.duration(500)} style={styles.emptyState}>
                                <Text style={styles.emptyEmoji}>
                                    {searchQuery ? '🔍' : todoFilter === 'completed' ? '🎉' : todoFilter === 'active' ? '✨' : '☑️'}
                                </Text>
                                <Text variant="titleLarge" style={[styles.emptyTitle, { color: theme.colors.text }]}>
                                    {searchQuery ? 'No tasks found' : todoFilter === 'completed' ? 'No completed tasks' : todoFilter === 'active' ? 'No active tasks' : 'All clear!'}
                                </Text>
                                <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                                    {searchQuery ? 'Try a different search term' : todoFilter === 'completed' ? 'Tasks you complete will show up here.' : todoFilter === 'active' ? 'All your tasks are done! Add a new task above.' : 'Add your tasks above to keep track of your work.'}
                                </Text>
                            </Animated.View>
                        }
                        renderItem={({ item }) => renderTodoItem(item)}
                    />
                </View>
            )}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    topTabContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    topTabBox: { flexDirection: 'row', borderRadius: 14, padding: 3 },
    topTabBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    topTabText: { fontSize: 13 },
    searchContainer: { paddingHorizontal: 16, paddingVertical: 8 },
    searchBar: { borderRadius: 14, elevation: 0, height: 44 },
    filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 4 },
    filterChips: { flexDirection: 'row', gap: 6 },
    filterChip: { borderRadius: 16, borderWidth: 1, height: 32 },
    sortButton: { flexDirection: 'row', alignItems: 'center' },
    countRow: { paddingHorizontal: 16, paddingBottom: 4 },
    listContent: { paddingHorizontal: 16, paddingBottom: 80 },
    sectionWrapper: { marginBottom: 4 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, paddingBottom: 6 },
    sectionPinIcon: { fontSize: 12, marginRight: 4 },
    sectionTitle: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    noteCard: { borderRadius: 14, borderWidth: 1, marginBottom: 8, ...shadows.small },
    noteContent: { padding: 14 },
    noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    noteTitle: { fontWeight: 'bold', flex: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    subjectBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
    subjectBadgeText: { fontSize: 11, fontWeight: '600' },
    swipeAction: { justifyContent: 'center', alignItems: 'center', width: 76, borderRadius: 14, marginBottom: 8, gap: 2 },
    swipeActionIcon: { fontSize: 18 },
    swipeActionText: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
    addTodoContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
    addTodoInput: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, height: 44 },
    addTodoBtn: { borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', height: 44 },
    addTodoBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    todoProgressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
    todoCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, marginBottom: 8, paddingRight: 4 },
    todoText: { fontSize: 15, lineHeight: 20 },
    todoCompletedText: { textDecorationLine: 'line-through', opacity: 0.6 },
    clearDoneBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
    emptyState: { alignItems: 'center', padding: 40, marginTop: 30 },
    emptyEmoji: { fontSize: 60, marginBottom: 14 },
    emptyTitle: { fontWeight: 'bold', marginBottom: 8 },
    emptySubtitle: { textAlign: 'center', opacity: 0.7, marginBottom: 20 },
    emptyActions: { flexDirection: 'row' },
    emptyBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
    emptyBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
    fabGradient: { borderRadius: 28, overflow: 'hidden' },
});

export default NotesHomeScreen;
