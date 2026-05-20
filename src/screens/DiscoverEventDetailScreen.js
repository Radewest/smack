import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const RSVP_OPTIONS = [
  { status: 'going',  label: 'Going 🙋',   activeColor: '#30d158', activeBg: '#0a1f0f' },
  { status: 'keen',   label: 'Keen 👀',    activeColor: '#ff9f0a', activeBg: '#1f150a' },
  { status: 'maybe',  label: 'Maybe 🤔',   activeColor: '#636366', activeBg: '#1a1a1a' },
];

const STATUS_LABELS = { going: 'Going', keen: 'Keen', maybe: 'Maybe' };

function formatDateTime(dateStr, startsAt) {
  const d = new Date(dateStr);
  const weekday = d.toLocaleDateString('en-ZA', { weekday: 'long' });
  const day = d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' });
  if (!startsAt) return `${weekday}, ${day}`;
  const time = new Date(startsAt).toLocaleTimeString('en-ZA', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  return `${weekday}, ${day} at ${time}`;
}

function openMaps(venue) {
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue}, Cape Town`)}`);
}

function openTickets(name, venue, ticketUrl) {
  if (ticketUrl) {
    Linking.openURL(ticketUrl);
  } else {
    const q = encodeURIComponent(`${name} ${venue} Cape Town tickets`);
    Linking.openURL(`https://www.google.com/search?q=${q}`);
  }
}

export default function DiscoverEventDetailScreen({ route, navigation }) {
  const { event } = route.params;
  const [rsvps, setRsvps] = useState([]);
  const [myRsvp, setMyRsvp] = useState(null);
  const [userId, setUserId] = useState(null);
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        Promise.all([fetchRsvps(user.id), fetchMyGroups(user.id)]).then(() =>
          setLoading(false)
        );
      }
    });
  }, []);

  async function fetchRsvps(uid) {
    const { data } = await supabase
      .from('discovered_event_rsvps')
      .select('user_id, status, profiles!discovered_event_rsvps_user_id_fkey(display_name, username)')
      .eq('discovered_event_id', event.id);
    if (data) {
      setRsvps(data);
      const mine = data.find(r => r.user_id === uid);
      setMyRsvp(mine?.status ?? null);
    }
  }

  async function fetchMyGroups(uid) {
    const { data } = await supabase
      .rpc('get_my_groups');
    if (data) setMyGroups(data);
  }

  async function handleRsvp(status) {
    if (!userId) return;
    if (myRsvp === status) {
      // Toggle off
      setMyRsvp(null);
      setRsvps(prev => prev.filter(r => r.user_id !== userId));
      await supabase.from('discovered_event_rsvps')
        .delete()
        .eq('discovered_event_id', event.id)
        .eq('user_id', userId);
    } else {
      setMyRsvp(status);
      setRsvps(prev => {
        const without = prev.filter(r => r.user_id !== userId);
        return [...without, { user_id: userId, status }];
      });
      await supabase.from('discovered_event_rsvps').upsert(
        { discovered_event_id: event.id, user_id: userId, status },
        { onConflict: 'discovered_event_id,user_id' }
      );
    }
    fetchRsvps(userId);
  }

  function shareToWhatsApp() {
    const dateStr = formatDateTime(event.date, event.starts_at);
    const ticketLine = event.ticket_url ? `\nTickets: ${event.ticket_url}` : '';
    const text = `🎉 *${event.name}*\n📍 ${event.venue}, Cape Town\n🗓 ${dateStr}${event.price ? `\n💰 ${event.price}` : ''}${ticketLine}\n\nSent via Smack 👊`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`);
  }

  async function handleShareToGroup() {
    if (!myGroups.length) {
      Alert.alert('No groups', 'Join or create a group first.');
      return;
    }

    const options = myGroups.map(g => ({
      text: `${g.emoji || '👥'} ${g.name}`,
      onPress: () => postToGroup(g.id),
    }));
    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Share to group', 'Pick a group to post this event to:', options);
  }

  async function postToGroup(groupId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newEvent, error } = await supabase.from('events').insert({
      group_id: groupId,
      created_by: user.id,
      title: event.name,
      location: `${event.venue}, Cape Town`,
      starts_at: event.starts_at || null,
      type: 'proper',
      description: event.price ? `Price: ${event.price}` : null,
    }).select().single();

    if (error) {
      Alert.alert('Error', 'Could not share event. Try again.');
      return;
    }

    Alert.alert('Shared!', `Posted to group.`, [
      {
        text: 'View event',
        onPress: () => navigation.navigate('EventDetail', { eventId: newEvent.id }),
      },
      { text: 'OK' },
    ]);
  }

  const isFree = event.price === 'Free';
  const goingCount = rsvps.filter(r => r.status === 'going').length;
  const keenCount = rsvps.filter(r => r.status === 'keen').length;
  const maybeCount = rsvps.filter(r => r.status === 'maybe').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{event.name}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title + price */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{event.name}</Text>
          <View style={[styles.priceBadge, isFree ? styles.freeBadge : styles.paidBadge]}>
            <Text style={[styles.priceText, isFree ? styles.freeText : styles.paidText]}>
              {event.price || '—'}
            </Text>
          </View>
        </View>

        {/* Meta box */}
        <View style={styles.metaBox}>
          <TouchableOpacity style={styles.metaRow} onPress={() => openMaps(event.venue)} activeOpacity={0.7}>
            <Ionicons name="location" size={16} color="#2ee6d6" />
            <Text style={[styles.metaText, styles.locationText]}>{event.venue}, Cape Town</Text>
            <Ionicons name="chevron-forward" size={14} color="#555" />
          </TouchableOpacity>

          <View style={styles.metaRow}>
            <Ionicons name="calendar" size={16} color="#888" />
            <Text style={styles.metaText}>{formatDateTime(event.date, event.starts_at)}</Text>
          </View>
        </View>

        {/* Tickets */}
        <TouchableOpacity
          style={styles.ticketBtn}
          onPress={() => openTickets(event.name, event.venue, event.ticket_url)}
          activeOpacity={0.7}
        >
          <Ionicons name="ticket-outline" size={18} color="#2ee6d6" />
          <Text style={styles.ticketText}>Get Tickets</Text>
        </TouchableOpacity>

        {/* RSVP */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Are you going?</Text>
          <View style={styles.rsvpRow}>
            {RSVP_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.status}
                style={[
                  styles.rsvpBtn,
                  myRsvp === opt.status && { borderColor: opt.activeColor, backgroundColor: opt.activeBg },
                ]}
                onPress={() => handleRsvp(opt.status)}
                activeOpacity={0.7}
              >
                <Text style={[styles.rsvpText, myRsvp === opt.status && { color: opt.activeColor }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Counts */}
        {(goingCount > 0 || keenCount > 0 || maybeCount > 0) && (
          <View style={styles.counts}>
            {goingCount > 0 && <Text style={styles.countText}>🙋 {goingCount} going</Text>}
            {keenCount > 0 && <Text style={styles.countText}>👀 {keenCount} keen</Text>}
            {maybeCount > 0 && <Text style={styles.countText}>🤔 {maybeCount} maybe</Text>}
          </View>
        )}

        {/* Share */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Share with your crew</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShareToGroup} activeOpacity={0.7}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.shareText}>Post to a group</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.whatsappBtn} onPress={shareToWhatsApp} activeOpacity={0.7}>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={styles.whatsappText}>Share on WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { padding: 20, gap: 20 },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', flex: 1, letterSpacing: -0.5, lineHeight: 28 },
  priceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexShrink: 0, marginTop: 3 },
  freeBadge: { backgroundColor: '#0a1f0f' },
  paidBadge: { backgroundColor: '#1f1a0a' },
  priceText: { fontSize: 12, fontWeight: '700' },
  freeText: { color: '#30d158' },
  paidText: { color: '#ff9f0a' },

  metaBox: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    gap: 10, borderWidth: 1, borderColor: '#2a2a2a',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { color: '#ccc', fontSize: 14, flex: 1 },
  locationText: { color: '#fff', textDecorationLine: 'underline' },

  ticketBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#3a1a1a', backgroundColor: '#1f0a0a',
  },
  ticketText: { color: '#2ee6d6', fontSize: 15, fontWeight: '700' },

  section: { gap: 10 },
  sectionLabel: { color: '#555', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  rsvpRow: { flexDirection: 'row', gap: 8 },
  rsvpBtn: {
    flex: 1, borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center',
  },
  rsvpText: { color: '#888', fontSize: 13, fontWeight: '600' },

  counts: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  countText: { color: '#555', fontSize: 14 },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#1a1a2a', borderWidth: 1, borderColor: '#2a2a3a',
  },
  shareText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  whatsappBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#0a1f0f', borderWidth: 1, borderColor: '#1a3a1a',
  },
  whatsappText: { color: '#25D366', fontSize: 15, fontWeight: '700' },
});
