import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import ReactionBar from '../components/ReactionBar';
import { color, status as statusMap, fontSize, fontWeight, radius, space, shadow } from '../theme';

function openMaps(location) {
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`);
}

const NEXT_STATUSES = {
  on_the_way: ['live', 'heading_home', 'ended'],
  live: ['heading_home', 'ended'],
  heading_home: ['ended'],
};

const ATTEND_STATUSES = [
  { key: 'on_the_way', label: 'On the way 🚶' },
  { key: 'here', label: "I'm here 🟢" },
  { key: 'heading_home', label: 'Heading home 🌙' },
];
const ATTEND_LABELS = { on_the_way: '🚶 On the way', here: '🟢 Here', heading_home: '🌙 Heading home' };
const RSVP_OPTIONS = [
  { status: 'going', label: "I'm keen 🙋" },
  { status: 'maybe', label: 'Maybe 🤔' },
  { status: 'not_going', label: "Can't make it 🙅" },
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
    const { data } = await supabase.from('reactions').select('id, user_id, emoji').eq('event_id', eventId);
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
      // Can't go → offer to hide from feed
      if (status === 'not_going') {
        Alert.alert(
          'Also hide this event?',
          "Since you can't make it, we can tuck it away. You'll find it under History → Archived.",
          [
            { text: 'Keep visible', style: 'cancel' },
            {
              text: 'Hide it',
              onPress: () => supabase.from('user_archived_events').upsert(
                { user_id: userId, event_id: eventId },
                { onConflict: 'user_id,event_id' }
              ),
            },
          ]
        );
      }
    }
    fetchRsvps(userId);
  }

  async function updateLiveStatus(s) {
    await supabase.from('events').update({ live_status: s }).eq('id', eventId);
  }

  async function updateAttendanceStatus(s) {
    if (!userId) return;
    const newStatus = myAttendance === s ? null : s;
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
        <ActivityIndicator color={color.glowCyan} style={{ marginTop: 40 }} />
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
  const liveStatus = statusMap[event.live_status] || statusMap.ended;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={color.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{event.title}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          {isLive && event.live_status !== 'ended' && (
            <View style={[styles.dot, { backgroundColor: liveStatus.color }]} />
          )}
          <Text style={styles.title}>{event.title}</Text>
          {!isHomeSafe && (
            <View style={[styles.badge, isLive ? styles.liveBadge : styles.properBadge]}>
              <Text style={styles.badgeText}>{isLive ? '⚡ Live' : '📅 Event'}</Text>
            </View>
          )}
        </View>

        <View style={styles.metaBox}>
          {event.location ? (
            <TouchableOpacity style={styles.metaRow} onPress={() => openMaps(event.location)} activeOpacity={0.7}>
              <Ionicons name="location" size={16} color={color.glowCyan} />
              <Text style={[styles.metaText, styles.locationText]}>{event.location}</Text>
              <Ionicons name="chevron-forward" size={14} color={color.fg4} />
            </TouchableOpacity>
          ) : null}
          {event.starts_at && !isLive ? (
            <View style={styles.metaRow}>
              <Ionicons name="time" size={16} color={color.fg3} />
              <Text style={styles.metaText}>
                {new Date(event.starts_at).toLocaleString([], {
                  weekday: 'long', day: 'numeric', month: 'long',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Ionicons name="person" size={16} color={color.fg3} />
            <Text style={styles.metaText}>Posted by {userName}</Text>
          </View>
          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}
        </View>

        <ReactionBar eventId={eventId} reactions={reactions} userId={userId} onUpdate={setReactions} />

        {isLive && event.live_status && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Status</Text>
            <Text style={[styles.statusText, { color: liveStatus.color }]}>
              {liveStatus.label}
            </Text>
            {nextStatuses.length > 0 && (
              <View style={styles.statusBtns}>
                {nextStatuses.map(s => (
                  <TouchableOpacity key={s} style={styles.statusBtn} onPress={() => updateLiveStatus(s)}>
                    <Text style={styles.statusBtnText}>{statusMap[s]?.label || s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {!isHomeSafe && event.live_status !== 'ended' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Are you keen?</Text>
            <View style={styles.rsvpRow}>
              {RSVP_OPTIONS.map(opt => {
                const isActive = myRsvp === opt.status;
                const activeStyle = opt.status === 'going'
                  ? { borderColor: color.statusLive, backgroundColor: color.statusLiveBg }
                  : opt.status === 'maybe'
                    ? { borderColor: color.statusOtw, backgroundColor: color.statusOtwBg }
                    : { borderColor: color.shore2, backgroundColor: color.ink2 };
                const activeTextColor = opt.status === 'going' ? color.statusLive
                  : opt.status === 'maybe' ? color.statusOtw : color.fg3;
                return (
                  <TouchableOpacity
                    key={opt.status}
                    style={[styles.rsvpBtn, isActive && activeStyle]}
                    onPress={() => handleRsvp(opt.status)}
                  >
                    <Text style={[styles.rsvpText, isActive && { color: activeTextColor }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {canSetAttendance && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Where are you?</Text>
            <View style={styles.attendRow}>
              {ATTEND_STATUSES.map(s => {
                const st = statusMap[s.key];
                const isActive = myAttendance === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.attendBtn, isActive && { borderColor: st.color, backgroundColor: st.bg }]}
                    onPress={() => updateAttendanceStatus(s.key)}
                  >
                    <Text style={[styles.attendBtnText, isActive && { color: st.color }]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

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
                <View style={[styles.attendeeDot, { backgroundColor: color.statusOtw }]} />
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
  container: { flex: 1, backgroundColor: color.deep },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[6], paddingVertical: space[3],
    borderBottomWidth: 1, borderBottomColor: color.shore,
  },
  back: { width: 32 },
  headerTitle: { color: color.fg, fontSize: fontSize.body, fontWeight: fontWeight.bold, flex: 1, textAlign: 'center' },
  content: { padding: space[7], gap: space[7] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { color: color.fg, fontSize: fontSize.h2, fontWeight: fontWeight.black, flex: 1, letterSpacing: -0.5 },
  badge: { paddingHorizontal: space[2], paddingVertical: 4, borderRadius: radius.xs },
  liveBadge: { backgroundColor: '#1a2a0a' },
  properBadge: { backgroundColor: color.ink2 },
  badgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.semi, color: color.fg3 },
  metaBox: {
    backgroundColor: color.ink, borderRadius: radius.lg, padding: space[5],
    gap: space[3], borderWidth: 1, borderColor: color.shore, ...shadow.card,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  metaText: { color: color.fg2, fontSize: fontSize.meta, flex: 1 },
  locationText: { color: color.fg, textDecorationLine: 'underline' },
  description: { color: color.fg3, fontSize: fontSize.meta, marginTop: 4, lineHeight: 20 },
  section: { gap: space[3] },
  sectionLabel: { color: color.fg4, fontSize: fontSize.label, fontWeight: fontWeight.semi, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusText: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
  statusBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  statusBtn: { backgroundColor: color.ink2, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: space[2] },
  statusBtnText: { color: color.fg2, fontSize: fontSize.meta, fontWeight: fontWeight.semi },
  rsvpRow: { gap: space[2] },
  rsvpBtn: {
    borderWidth: 1, borderColor: color.shore, borderRadius: radius.lg,
    paddingVertical: 14, paddingHorizontal: space[6], alignItems: 'center',
  },
  rsvpText: { color: color.fg3, fontSize: 15, fontWeight: fontWeight.semi },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: 6 },
  attendeeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.statusLive },
  attendeeName: { color: color.fg, fontSize: fontSize.meta, flex: 1 },
  attendeeStatus: { color: color.fg4, fontSize: fontSize.meta },
  attendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  attendBtn: { borderWidth: 1, borderColor: color.shore, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: space[2] },
  attendBtnText: { color: color.fg3, fontSize: fontSize.meta, fontWeight: fontWeight.semi },
});
