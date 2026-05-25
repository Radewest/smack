import { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { color, status as statusMap, fontSize, fontWeight, radius, space, shadow } from '../theme';

// ─── Helpers ────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

// ─── Pulsing ring ────────────────────────────────────────────────
function PulsingRing({ ringColor }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.25, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[
      StyleSheet.absoluteFill, styles.pulsingRing,
      {
        borderColor: ringColor,
        transform: [{ scale: anim }],
        opacity: anim.interpolate({ inputRange: [1, 1.25], outputRange: [0.7, 0] }),
      },
    ]} />
  );
}

// ─── Live bubble ────────────────────────────────────────────────
function LiveBubble({ member, onPress }) {
  const st = statusMap[member.live_status] || statusMap.ended;
  const name = member.profiles?.display_name || member.profiles?.username || '?';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <TouchableOpacity style={styles.bubble} onPress={() => onPress(member.id)} activeOpacity={0.8}>
      <View style={[styles.bubbleRing, { borderColor: st.color }]}>
        {member.live_status === 'live' && <PulsingRing ringColor={st.color} />}
        {member.profiles?.avatar_url ? (
          <Image source={{ uri: member.profiles.avatar_url }} style={styles.bubbleAvatar} />
        ) : (
          <View style={[styles.bubbleAvatar, styles.bubblePlaceholder]}>
            <Text style={styles.bubbleInitials}>{initials}</Text>
          </View>
        )}
      </View>
      <Text style={styles.bubbleName} numberOfLines={1}>{name}</Text>
      <Text style={[styles.bubbleStatus, { color: st.color }]}>
        {member.live_status === 'live' ? 'Live' : member.live_status === 'on_the_way' ? 'OTW' : 'Home'}
      </Text>
      <Text style={styles.bubbleGroup} numberOfLines={1}>
        {member.groups?.emoji} {member.groups?.name}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Upcoming card ───────────────────────────────────────────────
function UpcomingCard({ event, onPress }) {
  const going = (event.rsvps || []).filter(r => r.status === 'going').length;
  const dateStr = new Date(event.starts_at).toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
  const timeStr = new Date(event.starts_at).toLocaleTimeString('en-ZA', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  return (
    <TouchableOpacity style={styles.upcomingCard} onPress={() => onPress(event.id)} activeOpacity={0.75}>
      <View style={styles.upcomingLeft}>
        <Text style={styles.upcomingGroup}>{event.groups?.emoji} {event.groups?.name}</Text>
        <Text style={styles.upcomingTitle} numberOfLines={1}>{event.title}</Text>
        {event.location ? (
          <Text style={styles.upcomingMeta} numberOfLines={1}>📍 {event.location}</Text>
        ) : null}
        <Text style={styles.upcomingMeta}>🕐 {dateStr} · {timeStr}</Text>
      </View>
      {going > 0 && (
        <View style={styles.upcomingRsvp}>
          <Text style={styles.upcomingRsvpCount}>{going}</Text>
          <Text style={styles.upcomingRsvpLabel}>keen</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={14} color={color.fg4} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

// ─── Activity row ────────────────────────────────────────────────
function ActivityRow({ item, currentUserId, onPress }) {
  const isOwn = item.createdBy === currentUserId;
  const actorName = isOwn ? 'You' : (item.actor?.display_name || item.actor?.username || 'Someone');
  const groupLabel = item.group ? `${item.group.emoji || ''} ${item.group.name}`.trim() : '';

  let icon = '📅';
  let text = '';

  if (item.kind === 'new_event') {
    if (item.eventType === 'live') {
      icon = '⚡';
      text = `${actorName} ${isOwn ? 'are' : 'is'} out tonight`;
    } else {
      icon = '📅';
      text = `${actorName} posted ${item.title}`;
    }
  } else if (item.kind === 'rsvp') {
    if (item.status === 'going') {
      icon = '🙋'; text = `${actorName} ${isOwn ? 'are' : 'is'} keen for ${item.title}`;
    } else if (item.status === 'maybe') {
      icon = '🤔'; text = `${actorName} might make ${item.title}`;
    } else {
      icon = '🙅'; text = `${actorName} can't make ${item.title}`;
    }
  }

  return (
    <TouchableOpacity style={styles.activityRow} onPress={() => onPress(item.eventId)} activeOpacity={0.7}>
      <Text style={styles.activityIcon}>{icon}</Text>
      <View style={styles.activityBody}>
        <Text style={styles.activityText} numberOfLines={2}>{text}</Text>
        <View style={styles.activityMeta}>
          {groupLabel ? <Text style={styles.activityGroup}>{groupLabel}</Text> : null}
          <Text style={styles.activityTime}>{timeAgo(item.time)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={13} color={color.fg4} />
    </TouchableOpacity>
  );
}

// ─── Section header ──────────────────────────────────────────────
function SectionHeader({ title, live }) {
  return (
    <View style={styles.sectionHeader}>
      {live && <View style={styles.liveDot} />}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [myGroups, setMyGroups] = useState([]);
  const [liveMembers, setLiveMembers] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const userIdRef = useRef(null);
  const groupIdsRef = useRef([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      userIdRef.current = user?.id;
      setUserId(user?.id);
      if (user?.id) loadAll(user.id);
    });

    const channel = supabase
      .channel('home_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        if (!groupIdsRef.current.length) return;
        fetchLiveMembers(groupIdsRef.current);
        fetchUpcoming(groupIdsRef.current);
        fetchActivity(groupIdsRef.current, userIdRef.current);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps' }, () => {
        if (!groupIdsRef.current.length) return;
        fetchActivity(groupIdsRef.current, userIdRef.current);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function loadAll(uid) {
    const { data: groups } = await supabase.rpc('get_my_groups');
    if (!groups?.length) { setRefreshing(false); return; }
    setMyGroups(groups);
    const groupIds = groups.map(g => g.id);
    groupIdsRef.current = groupIds;

    await Promise.all([
      fetchLiveMembers(groupIds),
      fetchUpcoming(groupIds),
      fetchActivity(groupIds, uid),
    ]);
    setRefreshing(false);
  }

  async function fetchLiveMembers(groupIds) {
    const { data } = await supabase
      .from('events')
      .select('id, live_status, group_id, profiles!events_created_by_fkey(id, display_name, username, avatar_url), groups(name, emoji)')
      .eq('type', 'live')
      .in('live_status', ['live', 'on_the_way', 'heading_home'])
      .in('group_id', groupIds);
    setLiveMembers(data || []);
  }

  async function fetchUpcoming(groupIds) {
    const { data } = await supabase
      .from('events')
      .select('id, title, starts_at, location, group_id, groups(name, emoji), rsvps(user_id, status)')
      .eq('type', 'proper')
      .gt('starts_at', new Date().toISOString())
      .in('group_id', groupIds)
      .order('starts_at')
      .limit(8);
    setUpcomingEvents(data || []);
  }

  async function fetchActivity(groupIds, uid) {
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, title, type, created_at, created_by, group_id, groups(name, emoji), profiles!events_created_by_fkey(display_name, username)')
      .in('group_id', groupIds)
      .order('created_at', { ascending: false })
      .limit(15);

    const events = eventsData || [];
    let rsvps = [];

    if (events.length > 0) {
      let q = supabase
        .from('rsvps')
        .select('id, event_id, user_id, status, updated_at, profiles!rsvps_user_id_fkey(display_name, username)')
        .in('event_id', events.map(e => e.id))
        .order('updated_at', { ascending: false })
        .limit(20);
      if (uid) q = q.neq('user_id', uid);
      const { data: rsvpData } = await q;
      rsvps = rsvpData || [];
    }

    const items = [];

    events.forEach(e => {
      items.push({
        id: `event_${e.id}`,
        kind: 'new_event',
        time: e.created_at,
        eventId: e.id,
        title: e.title,
        group: e.groups,
        actor: e.profiles,
        createdBy: e.created_by,
        eventType: e.type,
      });
    });

    rsvps.forEach(r => {
      const event = events.find(e => e.id === r.event_id);
      if (!event) return;
      items.push({
        id: `rsvp_${r.id}`,
        kind: 'rsvp',
        time: r.updated_at,
        eventId: r.event_id,
        title: event.title,
        group: event.groups,
        actor: r.profiles,
        createdBy: r.user_id,
        status: r.status,
      });
    });

    items.sort((a, b) => new Date(b.time) - new Date(a.time));
    setActivityFeed(items.slice(0, 18));
  }

  // ── Quick actions ─────────────────────────────────────────────
  function pickGroup(onPick) {
    if (!myGroups.length) {
      Alert.alert('No groups', 'Join or create a group first.');
      return;
    }
    if (myGroups.length === 1) { onPick(myGroups[0]); return; }
    const options = myGroups.map(g => ({
      text: `${g.emoji || '👥'} ${g.name}`,
      onPress: () => onPick(g),
    }));
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Which group?', '', options);
  }

  function handleFreeTonightPress() {
    pickGroup(g => navigation.navigate('CreateEvent', { groupId: g.id, defaultType: 'live' }));
  }

  function handleHomeSafePress() {
    pickGroup(async g => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('events').insert({
        group_id: g.id,
        created_by: user.id,
        title: '🏠 Home Safe',
        type: 'live',
        live_status: 'live',
      });
      if (!error) Alert.alert('Posted 🏠', `${g.name} knows you're home safe.`);
    });
  }

  function handleFab() {
    Alert.alert('What\'s the move?', '', [
      {
        text: '📅  New event',
        onPress: () => pickGroup(g => navigation.navigate('CreateEvent', { groupId: g.id })),
      },
      {
        text: '🎉  Free tonight',
        onPress: handleFreeTonightPress,
      },
      {
        text: '🏠  Home Safe',
        onPress: handleHomeSafePress,
      },
      {
        text: '👥  New group',
        onPress: () => navigation.navigate('CreateGroup'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const hasActivity = liveMembers.length > 0 || upcomingEvents.length > 0 || activityFeed.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>Smack</Text>
        <TouchableOpacity style={styles.groupsBtn} onPress={() => navigation.navigate('Groups')} activeOpacity={0.7}>
          <Ionicons name="people" size={15} color={color.glowCyan} />
          <Text style={styles.groupsBtnText}>Groups</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); if (userId) loadAll(userId); }}
            tintColor={color.fg}
          />
        }
      >
        {/* No groups */}
        {!refreshing && myGroups.length === 0 && (
          <View style={styles.welcome}>
            <Text style={styles.welcomeEmoji}>👊</Text>
            <Text style={styles.welcomeTitle}>Welcome to Smack</Text>
            <Text style={styles.welcomeSub}>Get your crew together. Join a group or start one.</Text>
            <TouchableOpacity style={styles.welcomeBtn} onPress={() => navigation.navigate('CreateGroup')} activeOpacity={0.85}>
              <Text style={styles.welcomeBtnText}>Create a group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.welcomeBtnOutline} onPress={() => navigation.navigate('JoinGroup')} activeOpacity={0.85}>
              <Text style={styles.welcomeBtnOutlineText}>Join with a code</Text>
            </TouchableOpacity>
          </View>
        )}

        {myGroups.length > 0 && (
          <>
            {/* Quick actions */}
            <View style={styles.quickRow}>
              <TouchableOpacity style={styles.quickBtn} onPress={handleFreeTonightPress} activeOpacity={0.8}>
                <Text style={styles.quickEmoji}>🎉</Text>
                <Text style={styles.quickLabel}>Free tonight</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickBtn, styles.quickBtnHome]} onPress={handleHomeSafePress} activeOpacity={0.8}>
                <Text style={styles.quickEmoji}>🏠</Text>
                <Text style={styles.quickLabel}>Home Safe</Text>
              </TouchableOpacity>
            </View>

            {/* Live strip */}
            {liveMembers.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Live now" live />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bubblesScroll}>
                  {liveMembers.map(m => (
                    <LiveBubble key={m.id} member={m} onPress={id => navigation.navigate('EventDetail', { eventId: id })} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Upcoming */}
            {upcomingEvents.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Upcoming" />
                {upcomingEvents.map(e => (
                  <UpcomingCard key={e.id} event={e} onPress={id => navigation.navigate('EventDetail', { eventId: id })} />
                ))}
              </View>
            )}

            {/* Recent activity */}
            {activityFeed.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Recent" />
                <View style={styles.activityList}>
                  {activityFeed.map(item => (
                    <ActivityRow
                      key={item.id}
                      item={item}
                      currentUserId={userId}
                      onPress={id => navigation.navigate('EventDetail', { eventId: id })}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* All quiet */}
            {!hasActivity && !refreshing && (
              <View style={styles.quiet}>
                <Text style={styles.quietEmoji}>🌙</Text>
                <Text style={styles.quietTitle}>All quiet</Text>
                <Text style={styles.quietSub}>Nothing happening right now across your groups.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleFab} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.deep },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[7], paddingTop: space[2], paddingBottom: space[4],
  },
  wordmark: { fontSize: fontSize.h1, fontWeight: fontWeight.black, color: color.fg, letterSpacing: -1 },
  groupsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radius.full, borderWidth: 1, borderColor: color.shore,
    backgroundColor: color.ink,
  },
  groupsBtnText: { color: color.glowCyan, fontSize: fontSize.meta, fontWeight: fontWeight.semi },

  scroll: { paddingBottom: 40 },

  // Welcome
  welcome: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 60, gap: space[3] },
  welcomeEmoji: { fontSize: 56, marginBottom: space[2] },
  welcomeTitle: { color: color.fg, fontSize: 22, fontWeight: fontWeight.heavy, textAlign: 'center' },
  welcomeSub: { color: color.fg4, fontSize: fontSize.meta, textAlign: 'center', lineHeight: 20, marginBottom: space[4] },
  welcomeBtn: {
    backgroundColor: color.glowCyan, borderRadius: radius.lg,
    paddingVertical: 14, width: '100%', alignItems: 'center',
  },
  welcomeBtnText: { color: color.deep, fontSize: fontSize.body, fontWeight: fontWeight.bold },
  welcomeBtnOutline: {
    borderWidth: 1, borderColor: color.shore, borderRadius: radius.lg,
    paddingVertical: 14, width: '100%', alignItems: 'center',
  },
  welcomeBtnOutlineText: { color: color.fg3, fontSize: fontSize.body },

  // Quick actions
  quickRow: { flexDirection: 'row', gap: space[3], paddingHorizontal: space[6], paddingBottom: space[2] },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: radius.lg,
    backgroundColor: color.ink2, borderWidth: 1, borderColor: color.shore,
  },
  quickBtnHome: { backgroundColor: color.statusLiveBg, borderColor: color.statusLiveBorder },
  quickEmoji: { fontSize: 18 },
  quickLabel: { color: color.fg, fontSize: fontSize.meta, fontWeight: fontWeight.bold },

  // Section
  section: { paddingTop: space[6], paddingBottom: space[2] },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: space[6], marginBottom: space[4],
  },
  sectionTitle: {
    color: color.fg3, fontSize: fontSize.label, fontWeight: fontWeight.semi,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.statusLive },

  // Live bubbles
  bubblesScroll: { paddingHorizontal: space[6], gap: space[5] },
  bubble: { alignItems: 'center', width: 66 },
  bubbleRing: {
    width: 54, height: 54, borderRadius: 27, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  pulsingRing: { borderRadius: 27, borderWidth: 2 },
  bubbleAvatar: { width: 46, height: 46, borderRadius: 23 },
  bubblePlaceholder: { backgroundColor: color.ink2, alignItems: 'center', justifyContent: 'center' },
  bubbleInitials: { color: color.fg, fontSize: 15, fontWeight: fontWeight.bold },
  bubbleName: { color: color.fg2, fontSize: 10, fontWeight: fontWeight.semi, marginTop: 5, textAlign: 'center' },
  bubbleStatus: { fontSize: 9, fontWeight: fontWeight.bold, marginTop: 1 },
  bubbleGroup: { color: color.fg4, fontSize: 9, marginTop: 1, textAlign: 'center' },

  // Upcoming
  upcomingCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: color.ink, borderRadius: radius.xl, padding: space[5],
    marginHorizontal: space[6], marginBottom: space[2],
    borderWidth: 1, borderColor: color.shore, ...shadow.card,
  },
  upcomingLeft: { flex: 1 },
  upcomingGroup: { color: color.fg4, fontSize: fontSize.micro, fontWeight: fontWeight.semi, marginBottom: 4 },
  upcomingTitle: { color: color.fg, fontSize: fontSize.body, fontWeight: fontWeight.bold, marginBottom: 4 },
  upcomingMeta: { color: color.fg3, fontSize: fontSize.meta, marginTop: 1 },
  upcomingRsvp: { alignItems: 'center', marginHorizontal: space[4] },
  upcomingRsvpCount: { color: color.glowCyan, fontSize: 18, fontWeight: fontWeight.black },
  upcomingRsvpLabel: { color: color.fg4, fontSize: fontSize.micro, marginTop: 1 },

  // Activity
  activityList: {
    marginHorizontal: space[6],
    backgroundColor: color.ink, borderRadius: radius.xl,
    borderWidth: 1, borderColor: color.shore, overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space[5], paddingVertical: space[5],
    borderBottomWidth: 1, borderBottomColor: color.shore,
  },
  activityIcon: { fontSize: 18, marginRight: space[4], width: 26, textAlign: 'center' },
  activityBody: { flex: 1 },
  activityText: { color: color.fg, fontSize: fontSize.meta, lineHeight: 19 },
  activityMeta: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: 3 },
  activityGroup: { color: color.fg4, fontSize: fontSize.micro, fontWeight: fontWeight.semi },
  activityTime: { color: color.fg4, fontSize: fontSize.micro },

  // All quiet
  quiet: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  quietEmoji: { fontSize: 40, marginBottom: space[4] },
  quietTitle: { color: color.fg, fontSize: 18, fontWeight: fontWeight.heavy, marginBottom: space[2] },
  quietSub: { color: color.fg4, fontSize: fontSize.meta, textAlign: 'center', lineHeight: 20 },

  // FAB
  fab: {
    position: 'absolute', bottom: 30, right: 24,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: color.glowCyan,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.fab,
  },
  fabIcon: { color: color.deep, fontSize: 30, fontWeight: fontWeight.light, lineHeight: 34 },
});
