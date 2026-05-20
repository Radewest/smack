import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import ReactionBar from '../components/ReactionBar';

function openMaps(location) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  Linking.openURL(url);
}

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

// Per-user attendance statuses for proper events
const ATTEND_STATUSES = [
  { key: 'on_the_way', label: 'On the way 🚶', color: '#ff9f0a', bg: '#1f140a' },
  { key: 'here', label: "I'm here 🟢", color: '#30d158', bg: '#0a1f0f' },
  { key: 'heading_home', label: 'Heading home 🌙', color: '#636366', bg: '#1a1a1a' },
];
const ATTEND_LABELS = { on_the_way: '🚶 On the way', here: '🟢 Here', heading_home: '🌙 Heading home' };
const RSVP_OPTIONS = [
  { status: 'going', label: "I'm keen 🙋", activeColor: '#30d158', activeBg: '#0a1f0f' },
  { status: 'maybe', label: 'Maybe 🤔', activeColor: '#ff9f0a', activeBg: '#1f150a' },
  { status: 'not_going', label: "Can't make it 🙅", activeColor: '#636366', activeBg: '#1a1a1a' },
];

export default function EventDetailScreen({ route, navigation }) {
  const { eventId } = route.params;
  const [event, setEvent] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [myRsvp, setMyRsvp] = useState(null);
  const [myAttendance, setMyAttendance] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
      fetchAll(user?.id);
    });

    const channel = supabase
      .channel(`event_${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, fetchEvent)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps', filter: `event_id=eq.${eventId}` }, () => fetchRsvps(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions', filter: `event_id=eq.${eventId}` }, fetchReactions)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchAll(uid) {
    await Promise.all([fetchEvent(), fetchRsvps(uid), fetchReactions()]);
    setLoading(false);
  }

  async function fetchReactions() {
    const { data } = await supabase
      .from('reactions')
      .select('id, user_id, emoji')
      .eq('event_id', eventId);
    if (data) setReactions(data);
  }

  async function fetchEvent() {
    const { data } = await supabase
      .from('events')
      .select('*, profiles!events_created_by_fkey(display_name, username)')
      .eq('id', eventId)
      .single();
    if (data) setEvent(data);
  }

  async function fetchRsvps(uid) {
    const { data } = await supabase
      .from('rsvps')
      .select('*, profiles!rsvps_user_id_fkey(display_name, username)')
      .eq('event_id', eventId);
    if (data) {
      setRsvps(data);
      const mine = data.find(r => r.user_id === uid);
      setMyRsvp(mine?.status ?? null);
      setMyAttendance(mine?.attendance_status ?? null);
    }
  }

  async function handleRsvp(status) {
    if (!userId) return;
    if (myRsvp === status) {
      setMyRsvp(null);
      await supabase.from('rsvps').delete().eq('event_id', eventId).eq('user_id', userId);
    } else {
      setMyRsvp(status);
      await supabase.from('rsvps').upsert(
        { event_id: eventId, user_id: userId, status, updated_at: new Date().toISOString() },
        { onConflict: 'event_id,user_id' }
      );
    }
    fetchRsvps(userId);
  }

  async function updateLiveStatus(status) {
    await supabase.from('events').update({ live_status: status }).eq('id', eventId);
  }

  async function updateAttendanceStatus(status) {
    if (!userId) return;
    const newStatus = myAttendance === status ? null : status;
    setMyAttendance(newStatus);
    await supabase.from('rsvps').upsert(
      { event_id: eventId, user_id: userId, status: myRsvp || 'going', attendance_status: newStatus, updated_at: new Date().toISOString() },
      { onConflict: 'event_id,user_id' }
    );
    fetchRsvps(userId);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#2ee6d6" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!event) return null;

  const isOwner = event.created_by === userId;
  const isLive = event.type === 'live';
  const isProper = event.type === 'proper';
  const isHomeSafe = event.title === '🏠 Home Safe';
  const userName = event.profiles?.display_name || event.profiles?.username || 'Someone';
  const nextStatuses = isOwner && isLive ? (NEXT_STATUSES[event.live_status] || []) : [];
  const canSetAttendance = isProper && myRsvp && myRsvp !== 'not_going' && event.live_status !== 'ended';

  const going = rsvps.filter(r => r.status === 'going');
  const maybe = rsvps.filter(r => r.status === 'maybe');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{event.title}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title + badge */}
        <View style={styles.titleRow}>
          {isLive && event.live_status !== 'ended' && (
            <View style={[styles.dot, { backgroundColor: STATUS_COLORS[event.live_status] }]} />
          )}
          <Text style={styles.title}>{event.title}</Text>
          {!isHomeSafe && (
            <View style={[styles.badge, isLive ? styles.liveBadge : styles.properBadge]}>
              <Text style={styles.badgeText}>{isLive ? '⚡ Live' : '📅 Event'}</Text>
            </View>
          )}
        </View>

        {/* Meta */}
        <View style={styles.metaBox}>
          {event.location ? (
            <TouchableOpacity style={styles.metaRow} onPress={() => openMaps(event.location)} activeOpacity={0.7}>
              <Ionicons name="location" size={16} color="#2ee6d6" />
              <Text style={[styles.metaText, styles.locationText]}>{event.location}</Text>
              <Ionicons name="chevron-forward" size={14} color="#555" />
            </TouchableOpacity>
          ) : null}
          {event.starts_at && !isLive ? (
            <View style={styles.metaRow}>
              <Ionicons name="time" size={16} color="#888" />
              <Text style={styles.metaText}>
                {new Date(event.starts_at).toLocaleString([], {
                  weekday: 'long', day: 'numeric', month: 'long',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Ionicons name="person" size={16} color="#888" />
            <Text style={styles.metaText}>Posted by {userName}</Text>
          </View>
          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}
        </View>

        {/* Reactions */}
        <ReactionBar
          eventId={eventId}
          reactions={reactions}
          userId={userId}
          onUpdate={setReactions}
        />

        {/* Live status */}
        {isLive && event.live_status && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Status</Text>
            <Text style={[styles.statusText, { color: STATUS_COLORS[event.live_status] }]}>
              {STATUS_LABELS[event.live_status]}
            </Text>
            {nextStatuses.length > 0 && (
              <View style={styles.statusBtns}>
                {nextStatuses.map(s => (
                  <TouchableOpacity key={s} style={styles.statusBtn} onPress={() => updateLiveStatus(s)}>
                    <Text style={styles.statusBtnText}>{STATUS_LABELS[s]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* RSVP — not for home safe or ended events */}
        {!isHomeSafe && event.live_status !== 'ended' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Are you keen?</Text>
            <View style={styles.rsvpRow}>
              {RSVP_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.status}
                  style={[
                    styles.rsvpBtn,
                    myRsvp === opt.status && { borderColor: opt.activeColor, backgroundColor: opt.activeBg },
                  ]}
                  onPress={() => handleRsvp(opt.status)}
                >
                  <Text style={[styles.rsvpText, myRsvp === opt.status && { color: opt.activeColor }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Attendance status buttons for proper events */}
        {canSetAttendance && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Where are you?</Text>
            <View style={styles.attendRow}>
              {ATTEND_STATUSES.map(s => {
                const isActive = myAttendance === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.attendBtn, isActive && { borderColor: s.color, backgroundColor: s.bg }]}
                    onPress={() => updateAttendanceStatus(s.key)}
                  >
                    <Text style={[styles.attendBtnText, isActive && { color: s.color }]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Who's going */}
        {(going.length > 0 || maybe.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {going.length > 0 ? `${going.length} keen` : ''}
              {going.length > 0 && maybe.length > 0 ? '  ·  ' : ''}
              {maybe.length > 0 ? `${maybe.length} maybe` : ''}
            </Text>
            {going.map(r => (
              <View key={r.user_id} style={styles.attendeeRow}>
                <View style={styles.attendeeDot} />
                <Text style={styles.attendeeName}>
                  {r.profiles?.display_name || r.profiles?.username || 'Someone'}
                </Text>
                <Text style={styles.attendeeStatus}>
                  {r.attendance_status ? ATTEND_LABELS[r.attendance_status] : '🙋 Keen'}
                </Text>
              </View>
            ))}
            {maybe.map(r => (
              <View key={r.user_id} style={styles.attendeeRow}>
                <View style={[styles.attendeeDot, { backgroundColor: '#ff9f0a' }]} />
                <Text style={styles.attendeeName}>
                  {r.profiles?.display_name || r.profiles?.username || 'Someone'}
                </Text>
                <Text style={styles.attendeeStatus}>
                  {r.attendance_status ? ATTEND_LABELS[r.attendance_status] : '🤔 Maybe'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  back: { width: 32 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { padding: 20, gap: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', flex: 1, letterSpacing: -0.5 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  liveBadge: { backgroundColor: '#1a2a0a' },
  properBadge: { backgroundColor: '#0a1a2a' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#aaa' },
  metaBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { color: '#ccc', fontSize: 14, flex: 1 },
  locationText: { color: '#fff', textDecorationLine: 'underline' },
  description: { color: '#888', fontSize: 14, marginTop: 4, lineHeight: 20 },
  section: { gap: 10 },
  sectionLabel: { color: '#555', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusText: { fontSize: 16, fontWeight: '700' },
  statusBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBtnText: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  rsvpRow: { gap: 8 },
  rsvpBtn: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  rsvpText: { color: '#888', fontSize: 15, fontWeight: '600' },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  attendeeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#30d158' },
  attendeeName: { color: '#fff', fontSize: 14, flex: 1 },
  attendeeStatus: { color: '#555', fontSize: 13 },
  attendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attendBtn: {
    borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  attendBtnText: { color: '#888', fontSize: 13, fontWeight: '600' },
});
