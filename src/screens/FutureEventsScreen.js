import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, Linking } from 'react-native';

function openMaps(location) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  Linking.openURL(url);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function FutureEventsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [userId, setUserId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id));
    fetchEvents();
  }, []);

  async function fetchEvents() {
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const { data } = await supabase
      .from('events')
      .select('*, profiles!events_created_by_fkey(display_name, username), rsvps(user_id, status)')
      .eq('type', 'proper')
      .gte('starts_at', todayEnd)
      .order('starts_at', { ascending: true });
    if (data) setEvents(data);
    setRefreshing(false);
  }

  function renderEvent({ item }) {
    const isOwner = item.created_by === userId;
    const userName = item.profiles?.display_name || item.profiles?.username || 'Someone';
    const rsvps = item.rsvps || [];
    const going = rsvps.filter(r => r.status === 'going').length;
    const maybe = rsvps.filter(r => r.status === 'maybe').length;
    const myRsvp = rsvps.find(r => r.user_id === userId);

    const d = new Date(item.starts_at);
    const isThisWeek = (d - new Date()) < 7 * 24 * 60 * 60 * 1000;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
        activeOpacity={0.75}
      >
        <View style={styles.dateStrip}>
          <Text style={styles.dateDay}>{d.toLocaleDateString([], { weekday: 'short' }).toUpperCase()}</Text>
          <Text style={styles.dateNum}>{d.getDate()}</Text>
          <Text style={styles.dateMon}>{d.toLocaleDateString([], { month: 'short' }).toUpperCase()}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.location ? (
            <TouchableOpacity onPress={() => openMaps(item.location)} activeOpacity={0.7} style={styles.locationRow}>
              <Text style={styles.meta}>📍 <Text style={styles.locationLink}>{item.location}</Text></Text>
              <Ionicons name="chevron-forward" size={12} color="#555" />
            </TouchableOpacity>
          ) : null}
          <Text style={styles.meta}>🕐 {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          <View style={styles.footer}>
            <Text style={styles.author}>{isOwner ? 'You' : userName}</Text>
            <View style={styles.rsvpRow}>
              {going > 0 && <Text style={styles.rsvpChip}>🙋 {going}</Text>}
              {maybe > 0 && <Text style={styles.rsvpChip}>🤔 {maybe}</Text>}
              {myRsvp && (
                <View style={[styles.myBadge, myRsvp.status === 'going' && styles.myBadgeGoing]}>
                  <Text style={styles.myBadgeText}>{myRsvp.status === 'going' ? "Keen" : "Maybe"}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>Upcoming Smacks</Text>
        <View style={{ width: 32 }} />
      </View>
      <FlatList
        data={events}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvents(); }} tintColor="#fff" />}
        renderItem={renderEvent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nothing planned yet.</Text>
            <Text style={styles.emptySubText}>Tap + to create an event.</Text>
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
    flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#2a2a2a', overflow: 'hidden',
  },
  dateStrip: {
    width: 52, backgroundColor: '#ff3b30', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 14, gap: 2,
  },
  dateDay: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700' },
  dateNum: { color: '#fff', fontSize: 22, fontWeight: '900', lineHeight: 24 },
  dateMon: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700' },
  cardBody: { flex: 1, padding: 12 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  meta: { color: '#888', fontSize: 12, marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  locationLink: { textDecorationLine: 'underline', color: '#aaa' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  author: { color: '#444', fontSize: 11 },
  rsvpRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  rsvpChip: { color: '#888', fontSize: 12 },
  myBadge: { backgroundColor: '#1f1f0a', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  myBadgeGoing: { backgroundColor: '#0a1f0f' },
  myBadgeText: { color: '#30d158', fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySubText: { color: '#555', fontSize: 14 },
});
