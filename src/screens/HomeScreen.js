import { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { supabase } from '../lib/supabase';

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

// Attendance statuses for proper events (per-user)
const ATTEND_STATUSES = [
  { key: 'on_the_way', label: 'On the way 🚶', color: '#ff9f0a', bg: '#1f140a' },
  { key: 'here', label: "I'm here 🟢", color: '#30d158', bg: '#0a1f0f' },
  { key: 'heading_home', label: 'Heading home 🌙', color: '#636366', bg: '#1a1a1a' },
];

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export default function HomeScreen({ navigation }) {
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
      fetchDismissals(user?.id);
    });
    fetchEvents();

    const channel = supabase
      .channel('events_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps' }, fetchEvents)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchDismissals(uid) {
    if (!uid) return;
    const { data } = await supabase.from('event_dismissals').select('event_id').eq('user_id', uid);
    if (data) {
      const ids = new Set(data.map(d => d.event_id));
      setDismissedIds(ids);
      setPastCount(ids.size);
    }
  }

  async function handleDismiss(eventId) {
    if (!userId) return;
    swipeableRefs.current[eventId]?.close();
    await supabase.from('event_dismissals').upsert({ event_id: eventId, user_id: userId }, { onConflict: 'event_id,user_id', ignoreDuplicates: true });
    setDismissedIds(prev => new Set([...prev, eventId]));
    setPastCount(prev => prev + 1);
    setEndedEvents(prev => prev.filter(e => e.id !== eventId));
  }

  async function fetchEvents() {
    const { data } = await supabase
      .from('events')
      .select('*, profiles!events_created_by_fkey(display_name, username), rsvps(user_id, status, attendance_status, profiles!rsvps_user_id_fkey(display_name, username))')
      .order('created_at', { ascending: false });

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

  async function updateAttendanceStatus(eventId, uid, status) {
    if (!uid) return;
    await supabase.from('rsvps').upsert(
      { event_id: eventId, user_id: uid, status: 'going', attendance_status: status, updated_at: new Date().toISOString() },
      { onConflict: 'event_id,user_id' }
    );
    fetchEvents();
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
        <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('FutureEvents')} activeOpacity={0.8}>
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

    // Who's already at the event (has attendance_status = 'here')
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

        {item.location ? <Text style={styles.meta}>📍 {item.location}</Text> : null}
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

        {/* Live event status buttons (owner only) */}
        {nextStatuses.length > 0 && (
          <View style={styles.statusBtns}>
            {nextStatuses.map(s => (
              <TouchableOpacity key={s} style={styles.statusBtn} onPress={() => updateStatus(item.id, s)}>
                <Text style={styles.statusBtnText}>{STATUS_LABELS[s]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Proper event attendance status (anyone who RSVPed going/maybe) */}
        {isProper && !item._ended && myRsvp && myRsvp.status !== 'not_going' && (
          <View style={styles.attendBtns}>
            {ATTEND_STATUSES.map(s => {
              const isActive = myRsvp.attendance_status === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.attendBtn, isActive && { borderColor: s.color, backgroundColor: s.bg }]}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    updateAttendanceStatus(item.id, userId, isActive ? null : s.key);
                  }}
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
        <Text style={styles.logo}>Smack</Text>
        <Text style={styles.date}>{today}</Text>
      </View>
      <FlatList
        data={listData}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvents(); }} tintColor="#fff" />
        }
        renderItem={renderEvent}
        ListHeaderComponent={
          <Text style={styles.sectionLabel}>Today</Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nothing on today.</Text>
            <Text style={styles.emptySubText}>Tap + to create a smack.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  logo: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  date: { color: '#555', fontSize: 13, marginTop: 2, marginBottom: 8 },
  sectionLabel: {
    color: '#555', fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 16, paddingBottom: 10,
  },
  list: { paddingBottom: 100 },
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
  meta: { color: '#888', fontSize: 13, marginBottom: 3 },
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
  attendBtn: {
    borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
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
    marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: '#2a2a2a',
    marginTop: 6,
  },
  linkCardLeft: { gap: 2 },
  linkCardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  linkCardSub: { color: '#555', fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySubText: { color: '#555', fontSize: 14 },
});
