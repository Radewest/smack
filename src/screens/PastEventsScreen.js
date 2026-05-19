import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function PastEventsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [userId, setUserId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
      fetchEvents(user?.id);
    });
  }, []);

  async function fetchEvents(uid) {
    if (!uid) return;

    // Step 1: get dismissed event IDs + timestamps for this user
    const { data: dismissals, error: dErr } = await supabase
      .from('event_dismissals')
      .select('event_id, dismissed_at')
      .eq('user_id', uid)
      .order('dismissed_at', { ascending: false });

    if (dErr || !dismissals || dismissals.length === 0) {
      setEvents([]);
      setRefreshing(false);
      return;
    }

    const ids = dismissals.map(d => d.event_id);

    // Step 2: fetch the actual events
    const { data: eventsData } = await supabase
      .from('events')
      .select('*, profiles!events_created_by_fkey(display_name, username)')
      .in('id', ids);

    if (eventsData) {
      // Re-order to match dismissal order and attach dismissed_at
      const dismissalMap = Object.fromEntries(dismissals.map(d => [d.event_id, d.dismissed_at]));
      const sorted = ids
        .map(id => eventsData.find(e => e.id === id))
        .filter(Boolean)
        .map(e => ({ ...e, dismissed_at: dismissalMap[e.id] }));
      setEvents(sorted);
    }

    setRefreshing(false);
  }

  async function handleRestore(eventId) {
    await supabase.from('event_dismissals').delete().eq('event_id', eventId).eq('user_id', userId);
    setEvents(prev => prev.filter(e => e.id !== eventId));
  }

  function renderEvent({ item }) {
    const isLive = item.type === 'live';
    const userName = item.profiles?.display_name || item.profiles?.username || 'Someone';
    const isOwner = item.created_by === userId;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <TouchableOpacity style={styles.restoreBtn} onPress={() => handleRestore(item.id)}>
            <Ionicons name="arrow-undo" size={16} color="#555" />
          </TouchableOpacity>
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
        <Text style={styles.author}>{isOwner ? 'You' : userName}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>Past Events</Text>
        <View style={{ width: 32 }} />
      </View>
      <FlatList
        data={events}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchEvents(userId); }}
            tintColor="#fff"
          />
        }
        renderItem={renderEvent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No past events yet.</Text>
            <Text style={styles.emptySubText}>Swipe events away to archive them here.</Text>
          </View>
        }
      />
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
  back: { width: 32 },
  heading: { color: '#fff', fontSize: 16, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 60 },
  card: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#2a2a2a',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { color: '#888', fontSize: 15, fontWeight: '600', flex: 1 },
  restoreBtn: { padding: 4 },
  meta: { color: '#555', fontSize: 12, marginBottom: 2 },
  author: { color: '#333', fontSize: 11, marginTop: 6 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySubText: { color: '#555', fontSize: 14, textAlign: 'center' },
});
