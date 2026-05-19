import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

function sortEvents(events) {
  const now = new Date();
  const activeLive = events
    .filter(e => e.type === 'live' && e.live_status !== 'ended')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const upcoming = events
    .filter(e => e.type === 'proper' && e.starts_at && new Date(e.starts_at) >= now)
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  const past = events
    .filter(e =>
      (e.type === 'live' && e.live_status === 'ended') ||
      (e.type === 'proper' && (!e.starts_at || new Date(e.starts_at) < now))
    )
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return [...activeLive, ...upcoming, ...past];
}

export default function HomeScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [userId, setUserId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id));
    fetchEvents();

    const channel = supabase
      .channel('events_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps' }, fetchEvents)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchEvents() {
    const { data } = await supabase
      .from('events')
      .select('*, profiles!events_created_by_fkey(display_name, username), rsvps(user_id, status, profiles!rsvps_user_id_fkey(display_name, username))')
      .order('created_at', { ascending: false });
    if (data) setEvents(sortEvents(data));
    setRefreshing(false);
  }

  async function updateStatus(eventId, status) {
    await supabase.from('events').update({ live_status: status }).eq('id', eventId);
  }

  function renderEvent({ item }) {
    const isOwner = item.created_by === userId;
    const isLive = item.type === 'live';
    const isHomeSafe = item.title === '🏠 Home Safe';
    const userName = item.profiles?.display_name || item.profiles?.username || 'Someone';
    const nextStatuses = isOwner && isLive ? (NEXT_STATUSES[item.live_status] || []) : [];

    const rsvps = item.rsvps || [];
    const going = rsvps.filter(r => r.status === 'going');
    const maybe = rsvps.filter(r => r.status === 'maybe');
    const myRsvp = rsvps.find(r => r.user_id === userId);

    const goingNames = going.map(r =>
      r.profiles?.display_name || r.profiles?.username || 'Someone'
    );

    return (
      <TouchableOpacity
        style={[styles.card, isHomeSafe && styles.homeSafeCard]}
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
              <Text style={styles.badgeText}>{isLive ? '⚡ Live' : '📅 Event'}</Text>
            </View>
          )}
        </View>

        {item.location ? <Text style={styles.meta}>📍 {item.location}</Text> : null}
        {item.starts_at && !isLive && (
          <Text style={styles.meta}>
            🕐 {new Date(item.starts_at).toLocaleString([], {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        )}
        {isLive && item.live_status && (
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.live_status] }]}>
            {STATUS_LABELS[item.live_status]}
          </Text>
        )}

        {/* RSVP summary */}
        {!isHomeSafe && (going.length > 0 || maybe.length > 0 || myRsvp) && (
          <View style={styles.rsvpSummary}>
            {going.length > 0 && (
              <Text style={styles.rsvpSummaryText}>
                🙋 {goingNames.slice(0, 2).join(', ')}{going.length > 2 ? ` +${going.length - 2}` : ''}
              </Text>
            )}
            {maybe.length > 0 && (
              <Text style={styles.rsvpSummaryText}>🤔 {maybe.length} maybe</Text>
            )}
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

        {nextStatuses.length > 0 && (
          <View style={styles.statusBtns}>
            {nextStatuses.map(s => (
              <TouchableOpacity
                key={s}
                style={styles.statusBtn}
                onPress={e => { e.stopPropagation?.(); updateStatus(item.id, s); }}
              >
                <Text style={styles.statusBtnText}>{STATUS_LABELS[s]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Smack</Text>
      </View>
      <FlatList
        data={events}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvents(); }} tintColor="#fff" />
        }
        renderItem={renderEvent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No smacks yet.</Text>
            <Text style={styles.emptySubText}>Tap + to create one.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  logo: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#2a2a2a',
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
  rsvpSummaryText: { color: '#888', fontSize: 12 },
  myRsvpBadge: { backgroundColor: '#2a1a00', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  myRsvpText: { color: '#ff9f0a', fontSize: 12, fontWeight: '600' },
  author: { color: '#444', fontSize: 11, marginTop: 8 },
  statusBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  statusBtn: { backgroundColor: '#2a2a2a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  statusBtnText: { color: '#ccc', fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySubText: { color: '#555', fontSize: 14 },
});
