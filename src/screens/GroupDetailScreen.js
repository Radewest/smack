import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { supabase } from '../lib/supabase';
import ReactionBar from '../components/ReactionBar';

const STATUS_LABELS = {
  on_the_way: 'On the way 🚶',
  live: 'Live now 🟢',
  heading_home: 'Heading home 🌙',
  ended: 'Ended',
};
const STATUS_COLORS = {
  on_the_way: '#ff9f0a',
  live: '#30d158',
  heading_home: '#636366',
  ended: '#3a3a3c',
};
const NEXT_STATUSES = {
  on_the_way: ['live', 'heading_home', 'ended'],
  live: ['heading_home', 'ended'],
  heading_home: ['ended'],
};
const ATTEND_STATUSES = [
  { key: 'on_the_way', label: 'On the way 🚶', color: '#ff9f0a', bg: '#1f140a' },
  { key: 'here', label: "I'm here 🟢", color: '#30d158', bg: '#0a1f0f' },
  { key: 'heading_home', label: 'Heading home 🌙', color: '#636366', bg: '#1a1a1a' },
];

function openMaps(location) {
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`);
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId, groupName, groupEmoji } = route.params;

  const [events, setEvents] = useState([]);
  const [endedEvents, setEndedEvents] = useState([]);
  const [futureCount, setFutureCount] = useState(0);
  const [pastCount, setPastCount] = useState(0);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [userId, setUserId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const swipeableRefs = useRef({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
      // Run both fetches in parallel after we have the uid
      Promise.all([fetchEvents(), fetchDismissals(user?.id)]);
    });

    const channel = supabase
      .channel(`group_${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `group_id=eq.${groupId}` }, fetchEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps' }, fetchEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, fetchEvents)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchDismissals(uid) {
    if (!uid) return;
    const { data } = await supabase
      .from('event_dismissals')
      .select('event_id')
      .eq('user_id', uid);
    if (data) {
      const ids = new Set(data.map(d => d.event_id));
      setDismissedIds(ids);
      setPastCount(ids.size);
    }
  }

  async function handleDismiss(eventId) {
    if (!userId) return;
    swipeableRefs.current[eventId]?.close();
    await supabase.from('event_dismissals').upsert(
      { event_id: eventId, user_id: userId },
      { onConflict: 'event_id,user_id', ignoreDuplicates: true }
    );
    setDismissedIds(prev => new Set([...prev, eventId]));
    setPastCount(prev => prev + 1);
    setEndedEvents(prev => prev.filter(e => e.id !== eventId));
  }

  async function fetchEvents() {
    const { data } = await supabase
      .from('events')
      .select('*, profiles!events_created_by_fkey(display_name, username), rsvps(user_id, status, attendance_status, profiles!rsvps_user_id_fkey(display_name, username)), reactions(id, user_id, emoji)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(60);

    if (data) {
      const now = new Date();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const todayActive = data.filter(e =>
        (e.type === 'live' && e.live_status !== 'ended') ||
        (e.type === 'proper' && isToday(e.starts_at) && new Date(e.starts_at) >= now)
      ).sort((a, b) => {
        if (a.type === 'live' && b.type !== 'live') return -1;
        if (a.type !== 'live' && b.type === 'live') return 1;
        if (a.starts_at && b.starts_at) return new Date(a.starts_at) - new Date(b.starts_at);
        return new Date(b.created_at) - new Date(a.created_at);
      });

      const todayEnded = data.filter(e =>
        (e.type === 'live' && e.live_status === 'ended' && isToday(e.created_at)) ||
        (e.type === 'proper' && isToday(e.starts_at) && new Date(e.starts_at) < now)
      ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const future = data.filter(e =>
        e.type === 'proper' && e.starts_at && new Date(e.starts_at) > todayEnd
      );

      setEvents(todayActive);
      setEndedEvents(todayEnded);
      setFutureCount(future.length);
    }
    setRefreshing(false);
  }

  async function updateStatus(eventId, status) {
    await supabase.from('events').update({ live_status: status }).eq('id', eventId);
  }

  function updateEventReactions(eventId, newReactions) {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, reactions: newReactions } : e));
  }

  async function updateAttendanceStatus(eventId, uid, status) {
    if (!uid) return;
    // Optimistic update — reflect change immediately, then sync
    setEvents(prev => prev.map(e => {
      if (e.id !== eventId) return e;
      return { ...e, rsvps: e.rsvps.map(r => r.user_id === uid ? { ...r, attendance_status: status } : r) };
    }));
    await supabase.from('rsvps').upsert(
      { event_id: eventId, user_id: uid, status: 'going', attendance_status: status, updated_at: new Date().toISOString() },
      { onConflict: 'event_id,user_id' }
    );
  }

  function renderRightActions() {
    return (
      <View style={styles.dismissAction}>
        <Ionicons name="archive" size={22} color="#fff" />
        <Text style={styles.dismissText}>Archive</Text>
      </View>
    );
  }

  function renderEvent({ item }) {
    if (item._isFutureCard) {
      return (
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => navigation.navigate('FutureEvents', { groupId })}
          activeOpacity={0.8}
        >
          <View style={styles.linkCardLeft}>
            <Text style={styles.linkCardTitle}>Upcoming Smacks</Text>
            <Text style={styles.linkCardSub}>{item.count} event{item.count !== 1 ? 's' : ''} planned</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </TouchableOpacity>
      );
    }

    if (item._isPastCard) {
      return (
        <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('PastEvents')} activeOpacity={0.8}>
          <View style={styles.linkCardLeft}>
            <Text style={styles.linkCardTitle}>Past Events</Text>
            <Text style={styles.linkCardSub}>{item.count} archived</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </TouchableOpacity>
      );
    }

    if (item._isSectionHeader) {
      return <Text style={styles.sectionDivider}>{item.label}</Text>;
    }

    const isOwner = item.created_by === userId;
    const isLive = item.type === 'live';
    const isProper = item.type === 'proper';
    const isHomeSafe = item.title === '🏠 Home Safe';
    const userName = item.profiles?.display_name || item.profiles?.username || 'Someone';
    const nextStatuses = isOwner && isLive ? (NEXT_STATUSES[item.live_status] || []) : [];
    const rsvps = item.rsvps || [];
    const going = rsvps.filter(r => r.status === 'going');
    const maybe = rsvps.filter(r => r.status === 'maybe');
    const myRsvp = rsvps.find(r => r.user_id === userId);
    const goingNames = going.map(r => r.profiles?.display_name || r.profiles?.username || 'Someone');
    const hereNames = going
      .filter(r => r.attendance_status === 'here')
      .map(r => r.profiles?.display_name || r.profiles?.username || 'Someone');

    const card = (
      <TouchableOpacity
        style={[styles.card, isHomeSafe && styles.homeSafeCard, item._ended && styles.cardEnded]}
        onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <View style={styles.titleRow}>
            {isLive && item.live_status !== 'ended' && (
              <View style={[styles.dot, { backgroundColor: STATUS_COLORS[item.live_status] }]} />
            )}
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>
          {!isHomeSafe && (
            <View style={[styles.badge, isLive ? styles.liveBadge : styles.properBadge]}>
              <Text style={styles.badgeText}>{isLive ? '⚡ Live' : '📅 Today'}</Text>
            </View>
          )}
        </View>

        {item.location ? (
          <TouchableOpacity onPress={() => openMaps(item.location)} activeOpacity={0.7} style={styles.locationRow}>
            <Text style={styles.meta}>📍 <Text style={styles.locationLink}>{item.location}</Text></Text>
            <Ionicons name="chevron-forward" size={12} color="#555" />
          </TouchableOpacity>
        ) : null}

        {item.starts_at && !isLive && (
          <Text style={styles.meta}>
            🕐 {new Date(item.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
        {isLive && item.live_status && (
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.live_status] }]}>
            {STATUS_LABELS[item.live_status]}
          </Text>
        )}

        {!isHomeSafe && (going.length > 0 || maybe.length > 0 || myRsvp) && (
          <View style={styles.rsvpSummary}>
            {hereNames.length > 0 && (
              <Text style={[styles.rsvpText, { color: '#30d158' }]}>
                🟢 {hereNames.slice(0, 2).join(', ')}{hereNames.length > 2 ? ` +${hereNames.length - 2}` : ''} here
              </Text>
            )}
            {going.length > 0 && hereNames.length === 0 && (
              <Text style={styles.rsvpText}>
                🙋 {goingNames.slice(0, 2).join(', ')}{going.length > 2 ? ` +${going.length - 2}` : ''}
              </Text>
            )}
            {maybe.length > 0 && <Text style={styles.rsvpText}>🤔 {maybe.length} maybe</Text>}
            {myRsvp && (
              <View style={styles.myRsvpBadge}>
                <Text style={styles.myRsvpText}>
                  {myRsvp.status === 'going' ? "You're keen" : myRsvp.status === 'maybe' ? 'You: maybe' : "You can't go"}
                </Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.author}>{isOwner ? 'You' : userName}</Text>

        <ReactionBar
          eventId={item.id}
          reactions={item.reactions || []}
          userId={userId}
          onUpdate={newReactions => updateEventReactions(item.id, newReactions)}
        />

        {nextStatuses.length > 0 && (
          <View style={styles.statusBtns}>
            {nextStatuses.map(s => (
              <TouchableOpacity key={s} style={styles.statusBtn} onPress={() => updateStatus(item.id, s)}>
                <Text style={styles.statusBtnText}>{STATUS_LABELS[s]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isProper && !item._ended && myRsvp && myRsvp.status !== 'not_going' && (
          <View style={styles.attendBtns}>
            {ATTEND_STATUSES.map(s => {
              const isActive = myRsvp.attendance_status === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.attendBtn, isActive && { borderColor: s.color, backgroundColor: s.bg }]}
                  onPress={() => updateAttendanceStatus(item.id, userId, isActive ? null : s.key)}
                >
                  <Text style={[styles.attendBtnText, isActive && { color: s.color }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </TouchableOpacity>
    );

    if (item._ended) {
      return (
        <Swipeable
          ref={ref => { swipeableRefs.current[item.id] = ref; }}
          renderRightActions={renderRightActions}
          onSwipeableOpen={dir => { if (dir === 'right') handleDismiss(item.id); }}
          rightThreshold={60}
        >
          {card}
        </Swipeable>
      );
    }

    return card;
  }

  const today = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  const visibleEnded = endedEvents.filter(e => !dismissedIds.has(e.id)).map(e => ({ ...e, _ended: true }));

  const listData = [
    ...events,
    ...(visibleEnded.length > 0 ? [{ _isSectionHeader: true, id: '_endedHeader', label: 'Ended' }, ...visibleEnded] : []),
    ...(futureCount > 0 ? [{ _isFutureCard: true, id: '_future', count: futureCount }] : []),
    ...(pastCount > 0 ? [{ _isPastCard: true, id: '_past', count: pastCount }] : []),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>{groupEmoji}</Text>
          <Text style={styles.headerName}>{groupName}</Text>
        </View>
        <TouchableOpacity
          style={styles.membersBtn}
          onPress={() => navigation.navigate('GroupMembers', { groupId, groupName, groupEmoji })}
        >
          <Ionicons name="people" size={22} color="#888" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={listData}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvents(); }} tintColor="#fff" />
        }
        renderItem={renderEvent}
        ListHeaderComponent={<Text style={styles.sectionLabel}>{today}</Text>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nothing on today.</Text>
            <Text style={styles.emptySubText}>Tap + to create a smack.</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateEvent', { groupId })}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1f1f1f',
  },
  back: { width: 36 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  headerEmoji: { fontSize: 20 },
  headerName: { color: '#fff', fontSize: 17, fontWeight: '800' },
  membersBtn: { width: 36, alignItems: 'flex-end' },
  sectionLabel: {
    color: '#555', fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 16, paddingBottom: 10,
  },
  list: { paddingBottom: 120 },
  card: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
    marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: '#2a2a2a',
  },
  homeSafeCard: { borderColor: '#1a3a2a', backgroundColor: '#0f1f17' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  liveBadge: { backgroundColor: '#1a2a0a' },
  properBadge: { backgroundColor: '#0a1a2a' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#aaa' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  meta: { color: '#888', fontSize: 13, marginBottom: 3 },
  locationLink: { textDecorationLine: 'underline', color: '#aaa' },
  statusText: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  rsvpSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  rsvpText: { color: '#888', fontSize: 12 },
  myRsvpBadge: { backgroundColor: '#2a1a00', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  myRsvpText: { color: '#ff9f0a', fontSize: 12, fontWeight: '600' },
  author: { color: '#444', fontSize: 11, marginTop: 8 },
  statusBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  statusBtn: { backgroundColor: '#2a2a2a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  statusBtnText: { color: '#ccc', fontSize: 12, fontWeight: '600' },
  attendBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  attendBtn: { borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  attendBtnText: { color: '#888', fontSize: 12, fontWeight: '600' },
  cardEnded: { opacity: 0.5 },
  sectionDivider: {
    color: '#444', fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
  },
  dismissAction: {
    backgroundColor: '#3a3a3c', justifyContent: 'center', alignItems: 'center',
    width: 80, borderRadius: 14, marginLeft: 8, marginBottom: 10, gap: 4,
  },
  dismissText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  linkCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
    marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: '#2a2a2a', marginTop: 6,
  },
  linkCardLeft: { gap: 2 },
  linkCardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  linkCardSub: { color: '#555', fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySubText: { color: '#555', fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 30, right: 24,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#2ee6d6', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2ee6d6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  fabIcon: { color: '#fff', fontSize: 30, fontWeight: '300', lineHeight: 34 },
});
