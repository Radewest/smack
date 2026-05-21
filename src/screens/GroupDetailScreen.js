import { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, RefreshControl, Linking, ScrollView,
  Animated, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import ReactionBar from '../components/ReactionBar';
import { color, status as statusMap, fontSize, fontWeight, radius, space, shadow } from '../theme';

// ─── helpers ────────────────────────────────────────────────────
const NEXT_STATUSES = {
  on_the_way: ['live', 'heading_home', 'ended'],
  live: ['heading_home', 'ended'],
  heading_home: ['ended'],
};

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

// ─── Pulsing ring ───────────────────────────────────────────────
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
      StyleSheet.absoluteFill,
      styles.pulsingRing,
      { borderColor: ringColor, transform: [{ scale: anim }], opacity: anim.interpolate({ inputRange: [1, 1.25], outputRange: [0.7, 0] }) },
    ]} />
  );
}

// ─── Stories strip ──────────────────────────────────────────────
function StoriesStrip({ members, userId, onPress }) {
  if (!members.length) return null;
  return (
    <View style={styles.storiesSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
        {members.map(m => {
          const st = statusMap[m.liveStatus] || statusMap.ended;
          const isMe = m.id === userId;
          const initials = (m.display_name || m.username || '?')
            .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
          return (
            <TouchableOpacity key={m.eventId} style={styles.storyWrap} onPress={() => onPress(m.eventId)} activeOpacity={0.8}>
              <View style={[styles.storyRing, { borderColor: st.color }]}>
                {m.liveStatus === 'live' && <PulsingRing ringColor={st.color} />}
                {m.avatar_url ? (
                  <Image source={{ uri: m.avatar_url }} style={styles.storyAvatar} />
                ) : (
                  <View style={[styles.storyAvatar, styles.storyAvatarPlaceholder]}>
                    <Text style={styles.storyInitials}>{initials}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.storyName} numberOfLines={1}>{isMe ? 'You' : (m.display_name || m.username || '?')}</Text>
              <Text style={[styles.storyStatus, { color: st.color }]}>
                {m.liveStatus === 'live' ? 'Live' : m.liveStatus === 'on_the_way' ? 'OTW' : 'Heading home'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Main tab bar ────────────────────────────────────────────────
function TabBar({ activeTab, setActiveTab, counts }) {
  const tabs = [
    { key: 'now',      label: 'Now' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'history',  label: 'History' },
  ];
  return (
    <View style={styles.tabBar}>
      {tabs.map(t => (
        <TouchableOpacity
          key={t.key}
          style={[styles.tab, activeTab === t.key && styles.tabActive]}
          onPress={() => setActiveTab(t.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          {counts[t.key] > 0 && (
            <View style={[styles.tabBadge, activeTab === t.key && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === t.key && styles.tabBadgeTextActive]}>
                {counts[t.key]}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── History sub-tab bar ─────────────────────────────────────────
function HistorySubTabs({ active, setActive, archivedCount }) {
  return (
    <View style={styles.subTabBar}>
      {[
        { key: 'ended',    label: 'Ended' },
        { key: 'archived', label: 'Archived' },
      ].map(t => (
        <TouchableOpacity
          key={t.key}
          style={[styles.subTab, active === t.key && styles.subTabActive]}
          onPress={() => setActive(t.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.subTabText, active === t.key && styles.subTabTextActive]}>{t.label}</Text>
          {t.key === 'archived' && archivedCount > 0 && (
            <View style={styles.subTabBadge}>
              <Text style={styles.subTabBadgeText}>{archivedCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Main screen ────────────────────────────────────────────────
export default function GroupDetailScreen({ route, navigation }) {
  const { groupId, groupName, groupEmoji } = route.params;

  const [activeTab, setActiveTab] = useState('now');
  const [historySubTab, setHistorySubTab] = useState('ended');
  const [liveMembers, setLiveMembers] = useState([]);
  const [nowEvents, setNowEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [endedEvents, setEndedEvents] = useState([]);
  const [archivedEventsList, setArchivedEventsList] = useState([]);
  const [archivedIds, setArchivedIds] = useState(new Set());
  const [userId, setUserId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Keep raw events so we can re-bucket without re-fetching when archives change
  const rawEventsRef = useRef([]);

  // ── Initial load ──────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const uid = user?.id;
      setUserId(uid);
      Promise.all([fetchEvents(uid), fetchLiveMembers()]);
    });

    const channel = supabase
      .channel(`group_${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `group_id=eq.${groupId}` }, () => {
        fetchEvents();
        fetchLiveMembers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps' }, () => fetchEvents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => fetchEvents())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Re-fetch archived IDs when screen comes back into focus
  // (e.g. user archived from EventDetailScreen then navigated back)
  useEffect(() => {
    if (!userId) return;
    const unsub = navigation.addListener('focus', () => fetchArchivedIds(userId));
    return unsub;
  }, [navigation, userId]);

  // ── Data fetching ─────────────────────────────────────────────
  async function fetchArchivedIds(uid) {
    if (!uid) return new Set();
    const { data } = await supabase
      .from('user_archived_events')
      .select('event_id')
      .eq('user_id', uid);
    const ids = new Set((data || []).map(r => r.event_id));
    setArchivedIds(ids);
    bucketEvents(rawEventsRef.current, ids);
    return ids;
  }

  async function fetchLiveMembers() {
    const { data } = await supabase
      .from('events')
      .select('id, live_status, profiles!events_created_by_fkey(id, display_name, username, avatar_url)')
      .eq('group_id', groupId)
      .eq('type', 'live')
      .in('live_status', ['live', 'on_the_way', 'heading_home']);
    if (data) {
      setLiveMembers(data.map(e => ({
        eventId: e.id,
        liveStatus: e.live_status,
        ...e.profiles,
      })));
    }
  }

  async function fetchEvents(uid) {
    const activeUid = uid || userId;
    const [eventsRes, archivedRes] = await Promise.all([
      supabase
        .from('events')
        .select('*, profiles!events_created_by_fkey(display_name, username, avatar_url), rsvps(user_id, status, attendance_status, profiles!rsvps_user_id_fkey(display_name, username)), reactions(id, user_id, emoji)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(100),
      activeUid
        ? supabase.from('user_archived_events').select('event_id').eq('user_id', activeUid)
        : Promise.resolve({ data: [] }),
    ]);

    const eventsData = eventsRes.data || [];
    const ids = new Set((archivedRes.data || []).map(r => r.event_id));

    rawEventsRef.current = eventsData;
    setArchivedIds(ids);
    bucketEvents(eventsData, ids);
    setRefreshing(false);
  }

  // ── Bucketing ─────────────────────────────────────────────────
  function bucketEvents(data, archivedSet) {
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const nowEvts = data.filter(e =>
      !archivedSet.has(e.id) && (
        (e.type === 'live' && e.live_status !== 'ended') ||
        (e.type === 'proper' && isToday(e.starts_at) && new Date(e.starts_at) >= now)
      )
    ).sort((a, b) => {
      if (a.type === 'live' && b.type !== 'live') return -1;
      if (a.type !== 'live' && b.type === 'live') return 1;
      if (a.starts_at && b.starts_at) return new Date(a.starts_at) - new Date(b.starts_at);
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const upcomingEvts = data.filter(e =>
      !archivedSet.has(e.id) &&
      e.type === 'proper' && e.starts_at && new Date(e.starts_at) > todayEnd
    ).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

    const endedEvts = data.filter(e =>
      !archivedSet.has(e.id) && (
        (e.type === 'live' && e.live_status === 'ended') ||
        (e.type === 'proper' && e.starts_at && new Date(e.starts_at) < now)
      )
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const archivedEvts = data
      .filter(e => archivedSet.has(e.id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setNowEvents(nowEvts);
    setUpcomingEvents(upcomingEvts);
    setEndedEvents(endedEvts);
    setArchivedEventsList(archivedEvts);
  }

  // ── Archive / unarchive ───────────────────────────────────────
  async function archiveEvent(eventId) {
    if (!userId) return;
    const newIds = new Set([...archivedIds, eventId]);
    setArchivedIds(newIds);
    bucketEvents(rawEventsRef.current, newIds);
    await supabase.from('user_archived_events').upsert(
      { user_id: userId, event_id: eventId },
      { onConflict: 'user_id,event_id' }
    );
  }

  async function unarchiveEvent(eventId) {
    if (!userId) return;
    const newIds = new Set([...archivedIds].filter(id => id !== eventId));
    setArchivedIds(newIds);
    bucketEvents(rawEventsRef.current, newIds);
    await supabase.from('user_archived_events')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId);
  }

  // ── Other actions ─────────────────────────────────────────────
  async function updateStatus(eventId, status) {
    await supabase.from('events').update({ live_status: status }).eq('id', eventId);
  }

  function updateEventReactions(eventId, newReactions) {
    const update = list => list.map(e => e.id === eventId ? { ...e, reactions: newReactions } : e);
    setNowEvents(update);
    setUpcomingEvents(update);
    setEndedEvents(update);
    setArchivedEventsList(update);
  }

  async function updateAttendanceStatus(eventId, uid, status) {
    if (!uid) return;
    const update = list => list.map(e => {
      if (e.id !== eventId) return e;
      return { ...e, rsvps: e.rsvps.map(r => r.user_id === uid ? { ...r, attendance_status: status } : r) };
    });
    setNowEvents(update);
    await supabase.from('rsvps').upsert(
      { event_id: eventId, user_id: uid, status: 'going', attendance_status: status, updated_at: new Date().toISOString() },
      { onConflict: 'event_id,user_id' }
    );
  }

  // ── Long press → archive/unarchive ───────────────────────────
  function handleLongPress(item) {
    const isArchived = archivedIds.has(item.id);
    Alert.alert(
      isArchived ? 'Unarchive event?' : 'Archive event?',
      isArchived
        ? 'Move this event back to your feed?'
        : 'Hide this event from your feed. You can find it under History → Archived.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isArchived ? 'Unarchive' : 'Archive',
          onPress: () => isArchived ? unarchiveEvent(item.id) : archiveEvent(item.id),
        },
      ]
    );
  }

  // ── Render event card ─────────────────────────────────────────
  function renderEvent({ item }) {
    const isOwner = item.created_by === userId;
    const isLive = item.type === 'live';
    const isProper = item.type === 'proper';
    const isHomeSafe = item.title === '🏠 Home Safe';
    const isHistory = activeTab === 'history';
    const isArchived = archivedIds.has(item.id);
    const userName = item.profiles?.display_name || item.profiles?.username || 'Someone';
    const nextStatuses = isOwner && isLive && !isHistory ? (NEXT_STATUSES[item.live_status] || []) : [];
    const rsvps = item.rsvps || [];
    const going = rsvps.filter(r => r.status === 'going');
    const maybe = rsvps.filter(r => r.status === 'maybe');
    const myRsvp = rsvps.find(r => r.user_id === userId);
    const goingNames = going.map(r => r.profiles?.display_name || r.profiles?.username || 'Someone');
    const hereNames = going
      .filter(r => r.attendance_status === 'here')
      .map(r => r.profiles?.display_name || r.profiles?.username || 'Someone');
    const liveStatus = isLive ? (statusMap[item.live_status] || statusMap.ended) : null;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isHomeSafe && styles.homeSafeCard,
          isHistory && styles.cardPast,
          isArchived && styles.cardArchived,
        ]}
        onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
        activeOpacity={0.75}
      >
        {/* Archived label */}
        {isArchived && (
          <Text style={styles.archivedLabel}>📦 Archived</Text>
        )}

        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={styles.titleRow}>
            {isLive && item.live_status !== 'ended' && (
              <View style={[styles.dot, { backgroundColor: liveStatus.color }]} />
            )}
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>
          {!isHomeSafe && (
            <View style={[styles.badge, isLive ? styles.liveBadge : styles.properBadge]}>
              <Text style={styles.badgeText}>
                {isLive ? '⚡ Live' : isProper && activeTab === 'upcoming' ? '📅 Upcoming' : '📅 Today'}
              </Text>
            </View>
          )}
        </View>

        {/* Location */}
        {item.location ? (
          <TouchableOpacity onPress={() => openMaps(item.location)} activeOpacity={0.7} style={styles.locationRow}>
            <Text style={styles.meta}>📍 <Text style={styles.locationLink}>{item.location}</Text></Text>
            <Ionicons name="chevron-forward" size={12} color={color.fg4} />
          </TouchableOpacity>
        ) : null}

        {/* Time */}
        {item.starts_at && !isLive && (
          <Text style={styles.meta}>
            🕐 {new Date(item.starts_at).toLocaleString([], {
              weekday: activeTab === 'upcoming' ? 'short' : undefined,
              month: activeTab === 'upcoming' ? 'short' : undefined,
              day: activeTab === 'upcoming' ? 'numeric' : undefined,
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        )}

        {/* Live status label */}
        {isLive && item.live_status && item.live_status !== 'ended' && (
          <Text style={[styles.statusText, { color: liveStatus.color }]}>{liveStatus.label}</Text>
        )}

        {/* RSVP summary */}
        {!isHomeSafe && (going.length > 0 || maybe.length > 0 || myRsvp) && (
          <View style={styles.rsvpSummary}>
            {hereNames.length > 0 && (
              <Text style={[styles.rsvpText, { color: color.statusLive }]}>
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
                  {myRsvp.status === 'going' ? "You're keen" : myRsvp.status === 'maybe' ? 'You: maybe' : "Can't go"}
                </Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.author}>{isOwner ? 'You' : userName}</Text>

        {/* Reactions */}
        <ReactionBar
          eventId={item.id}
          reactions={item.reactions || []}
          userId={userId}
          onUpdate={newReactions => updateEventReactions(item.id, newReactions)}
        />

        {/* Live status controls (owner only, now tab) */}
        {nextStatuses.length > 0 && (
          <View style={styles.statusBtns}>
            {nextStatuses.map(s => (
              <TouchableOpacity key={s} style={styles.statusBtn} onPress={() => updateStatus(item.id, s)}>
                <Text style={styles.statusBtnText}>{(statusMap[s] || statusMap.ended).label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Attendance status (proper events, now tab, if RSVPed) */}
        {isProper && !isHistory && myRsvp && myRsvp.status !== 'not_going' && (
          <View style={styles.attendBtns}>
            {[
              { key: 'on_the_way', label: 'On the way 🚶' },
              { key: 'here', label: "I'm here 🟢" },
              { key: 'heading_home', label: 'Heading home 🌙' },
            ].map(s => {
              const st = statusMap[s.key];
              const isActive = myRsvp.attendance_status === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.attendBtn, isActive && { borderColor: st.color, backgroundColor: st.bg }]}
                  onPress={() => updateAttendanceStatus(item.id, userId, isActive ? null : s.key)}
                >
                  <Text style={[styles.attendBtnText, isActive && { color: st.color }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  const listData = activeTab === 'now' ? nowEvents
    : activeTab === 'upcoming' ? upcomingEvents
    : historySubTab === 'ended' ? endedEvents
    : archivedEventsList;

  const counts = {
    now: nowEvents.length,
    upcoming: upcomingEvents.length,
    history: endedEvents.length + archivedEventsList.length,
  };

  const today = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

  const emptyMessages = {
    now:      { title: 'Nothing on right now',   sub: 'Tap + to start a smack.' },
    upcoming: { title: 'Nothing planned yet',    sub: 'Tap + to create an event.' },
    ended:    { title: 'No ended events yet',    sub: "Past events will appear here." },
    archived: { title: 'Nothing archived',       sub: 'Long-press any event to archive it.' },
  };

  const emptyKey = activeTab === 'history' ? historySubTab : activeTab;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={color.fg} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>{groupEmoji}</Text>
          <Text style={styles.headerName}>{groupName}</Text>
        </View>
        <TouchableOpacity
          style={styles.membersBtn}
          onPress={() => navigation.navigate('GroupMembers', { groupId, groupName, groupEmoji })}
        >
          <Ionicons name="people" size={22} color={color.fg3} />
        </TouchableOpacity>
      </View>

      {/* Stories strip */}
      <StoriesStrip
        members={liveMembers}
        userId={userId}
        onPress={eventId => navigation.navigate('EventDetail', { eventId })}
      />

      {/* Main tabs */}
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} counts={counts} />

      {/* History sub-tabs */}
      {activeTab === 'history' && (
        <HistorySubTabs
          active={historySubTab}
          setActive={setHistorySubTab}
          archivedCount={archivedEventsList.length}
        />
      )}

      {/* Date label for Now tab */}
      {activeTab === 'now' && (
        <Text style={styles.dateLabel}>{today}</Text>
      )}

      {/* Event list */}
      <FlatList
        data={listData}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchEvents(); fetchLiveMembers(); }}
            tintColor={color.fg}
          />
        }
        renderItem={renderEvent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{emptyMessages[emptyKey]?.title}</Text>
            <Text style={styles.emptySubText}>{emptyMessages[emptyKey]?.sub}</Text>
          </View>
        }
      />

      {/* FAB */}
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
  container: { flex: 1, backgroundColor: color.deep },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[6], paddingVertical: space[3],
    borderBottomWidth: 1, borderBottomColor: color.shore,
  },
  back: { width: 36 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1, justifyContent: 'center' },
  headerEmoji: { fontSize: 20 },
  headerName: { color: color.fg, fontSize: fontSize.h3, fontWeight: fontWeight.heavy },
  membersBtn: { width: 36, alignItems: 'flex-end' },

  // Stories
  storiesSection: { borderBottomWidth: 1, borderBottomColor: color.shore, paddingVertical: space[4] },
  storiesScroll: { paddingHorizontal: space[6], gap: space[5] },
  storyWrap: { alignItems: 'center', width: 58 },
  storyRing: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2, padding: 2,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  pulsingRing: { borderRadius: 26, borderWidth: 2 },
  storyAvatar: { width: 44, height: 44, borderRadius: 22 },
  storyAvatarPlaceholder: { backgroundColor: color.ink2, alignItems: 'center', justifyContent: 'center' },
  storyInitials: { color: color.fg, fontSize: 15, fontWeight: fontWeight.bold },
  storyName: { color: color.fg2, fontSize: 10, fontWeight: fontWeight.semi, marginTop: 4, textAlign: 'center' },
  storyStatus: { fontSize: 9, fontWeight: fontWeight.bold, marginTop: 1 },

  // Main tabs
  tabBar: {
    flexDirection: 'row', paddingHorizontal: space[6],
    paddingTop: space[4], paddingBottom: space[2],
    gap: space[2], borderBottomWidth: 1, borderBottomColor: color.shore,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: space[2], borderRadius: radius.sm, gap: 5 },
  tabActive: { backgroundColor: color.ink2 },
  tabText: { color: color.fg4, fontSize: fontSize.meta, fontWeight: fontWeight.semi },
  tabTextActive: { color: color.fg },
  tabBadge: { backgroundColor: color.shore, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeActive: { backgroundColor: color.glowCyan },
  tabBadgeText: { color: color.fg3, fontSize: 10, fontWeight: fontWeight.bold },
  tabBadgeTextActive: { color: color.deep },

  // History sub-tabs
  subTabBar: {
    flexDirection: 'row', paddingHorizontal: space[6], paddingVertical: space[3],
    gap: space[2], borderBottomWidth: 1, borderBottomColor: color.shore,
    backgroundColor: color.abyss,
  },
  subTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1, borderColor: color.shore,
  },
  subTabActive: { borderColor: color.glowCyan, backgroundColor: color.ink2 },
  subTabText: { color: color.fg4, fontSize: fontSize.meta, fontWeight: fontWeight.semi },
  subTabTextActive: { color: color.glowCyan },
  subTabBadge: { backgroundColor: color.shore2, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  subTabBadgeText: { color: color.fg2, fontSize: 10, fontWeight: fontWeight.bold },

  // Date label
  dateLabel: {
    color: color.fg4, fontSize: fontSize.label, fontWeight: fontWeight.semi,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: space[6], paddingTop: space[4], paddingBottom: space[2],
  },

  // List
  list: { paddingBottom: 120, paddingTop: space[2] },

  // Event card
  card: {
    backgroundColor: color.ink, borderRadius: radius.xl, padding: space[6],
    marginHorizontal: space[6], marginBottom: space[3],
    borderWidth: 1, borderColor: color.shore, ...shadow.card,
  },
  homeSafeCard: { borderColor: color.statusLiveBorder, backgroundColor: color.statusLiveBg },
  cardPast: { opacity: 0.7 },
  cardArchived: { opacity: 0.5, borderStyle: 'dashed' },
  archivedLabel: { color: color.fg4, fontSize: fontSize.micro, fontWeight: fontWeight.semi, marginBottom: 6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: space[2] },
  cardTitle: { color: color.fg, fontSize: fontSize.body, fontWeight: fontWeight.bold, flex: 1 },
  badge: { paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.xs },
  liveBadge: { backgroundColor: '#1a2a0a' },
  properBadge: { backgroundColor: color.ink2 },
  badgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.semi, color: color.fg3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  meta: { color: color.fg3, fontSize: fontSize.meta, marginBottom: 3 },
  locationLink: { textDecorationLine: 'underline', color: color.fg2 },
  statusText: { fontSize: fontSize.meta, fontWeight: fontWeight.semi, marginTop: 2 },
  rsvpSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] },
  rsvpText: { color: color.fg3, fontSize: 12 },
  myRsvpBadge: { backgroundColor: color.statusOtwBg, borderRadius: radius.xs, paddingHorizontal: space[2], paddingVertical: 2 },
  myRsvpText: { color: color.statusOtw, fontSize: 12, fontWeight: fontWeight.semi },
  author: { color: color.fg4, fontSize: fontSize.micro, marginTop: space[2] },
  statusBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space[3] },
  statusBtn: { backgroundColor: color.ink2, borderRadius: radius.sm, paddingHorizontal: space[3], paddingVertical: 6 },
  statusBtnText: { color: color.fg2, fontSize: 12, fontWeight: fontWeight.semi },
  attendBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space[3] },
  attendBtn: { borderWidth: 1, borderColor: color.shore, borderRadius: radius.sm, paddingHorizontal: space[3], paddingVertical: 6 },
  attendBtnText: { color: color.fg3, fontSize: 12, fontWeight: fontWeight.semi },

  // Empty state
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: color.fg, fontSize: fontSize.body, fontWeight: fontWeight.semi, marginBottom: 6 },
  emptySubText: { color: color.fg4, fontSize: fontSize.meta },

  // FAB
  fab: {
    position: 'absolute', bottom: 30, right: 24,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: color.glowCyan, alignItems: 'center', justifyContent: 'center',
    ...shadow.fab,
  },
  fabIcon: { color: color.deep, fontSize: 30, fontWeight: fontWeight.light, lineHeight: 34 },
});
