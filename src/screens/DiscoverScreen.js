import { useEffect, useState } from 'react';
import {
  View, Text, SectionList, TouchableOpacity,
  StyleSheet, RefreshControl, Linking, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { color, fontSize, fontWeight, radius, space } from '../theme';

const DAY_FILTERS = ['All', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_ABBR = {
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

const CATEGORIES = [
  { key: 'all',     label: 'All',     emoji: '✨' },
  { key: 'jol',     label: 'Jol',     emoji: '🎉' },
  { key: 'music',   label: 'Music',   emoji: '🎵' },
  { key: 'arts',    label: 'Arts',    emoji: '🎨' },
  { key: 'markets', label: 'Markets', emoji: '🛍️' },
  { key: 'crafts',  label: 'Crafts',  emoji: '🪡' },
  { key: 'sport',   label: 'Sport',   emoji: '🏃' },
  { key: 'food',    label: 'Food',    emoji: '🍽️' },
];

function formatDayHeader(dateStr) {
  const d = new Date(dateStr);
  const weekday = d.toLocaleDateString('en-ZA', { weekday: 'long' });
  const day = d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' });
  return { weekday, day, abbr: DAY_ABBR[weekday] || weekday.slice(0, 3) };
}

function formatTime(startsAt) {
  if (!startsAt) return '';
  return new Date(startsAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function openMaps(venue) {
  const query = encodeURIComponent(`${venue}, Cape Town`);
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
}

function openTickets(name, venue) {
  const query = encodeURIComponent(`${name} ${venue} Cape Town tickets`);
  Linking.openURL(`https://www.google.com/search?q=${query}`);
}

export default function DiscoverScreen({ navigation }) {
  const [sections, setSections] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [goingEvents, setGoingEvents] = useState([]);
  const [activeDay, setActiveDay] = useState('All');
  const [activeCategory, setActiveCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchEvents(); fetchGoingEvents(); }, []);

  useEffect(() => {
    buildSections(allEvents, activeDay, activeCategory);
  }, [activeDay, activeCategory, allEvents]);

  async function fetchGoingEvents() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('discovered_event_rsvps')
      .select('status, discovered_events(*)')
      .eq('user_id', user.id)
      .eq('status', 'going');
    if (data) setGoingEvents(data.map(r => r.discovered_events).filter(Boolean));
  }

  async function fetchEvents() {
    const { data } = await supabase
      .from('discovered_events')
      .select('*')
      .eq('city', 'Cape Town')
      .order('starts_at', { ascending: true });

    if (data) setAllEvents(data);
    setRefreshing(false);
  }

  function buildSections(events, dayFilter, catFilter) {
    let filtered = events;

    if (dayFilter !== 'All') {
      filtered = filtered.filter(e => {
        const { abbr } = formatDayHeader(e.date);
        return abbr === dayFilter;
      });
    }

    if (catFilter !== 'all') {
      filtered = filtered.filter(e => e.category === catFilter);
    }

    const grouped = {};
    filtered.forEach(event => {
      const key = event.date;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(event);
    });

    const built = Object.keys(grouped)
      .sort()
      .map(date => ({ date, ...formatDayHeader(date), data: grouped[date] }));

    setSections(built);
  }

  function renderEvent({ item }) {
    const isFree = item.price === 'Free';
    const time = formatTime(item.starts_at);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DiscoverEventDetail', { event: item })}
        activeOpacity={0.85}
      >
        <View style={styles.cardTop}>
          <Text style={styles.eventName}>{item.name}</Text>
          <View style={[styles.priceBadge, isFree ? styles.freeBadge : styles.paidBadge]}>
            <Text style={[styles.priceText, isFree ? styles.freeText : styles.paidText]}>
              {item.price || '—'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.venueRow}
          onPress={() => openMaps(item.venue)}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={13} color="#555" />
          <Text style={styles.venue}>{item.venue}</Text>
          <Ionicons name="chevron-forward" size={12} color="#444" />
        </TouchableOpacity>

        <View style={styles.cardBottom}>
          {time ? (
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={13} color="#555" />
              <Text style={styles.time}>{time}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.ticketBtn}
            onPress={e => {
              e.stopPropagation();
              item.ticket_url
                ? Linking.openURL(item.ticket_url)
                : openTickets(item.name, item.venue);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="ticket-outline" size={13} color="#2ee6d6" />
            <Text style={styles.ticketText}>Tickets</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  function renderSectionHeader({ section }) {
    return (
      <View style={styles.dayHeader}>
        <Text style={styles.dayName}>{section.weekday}</Text>
        <Text style={styles.dayDate}>{section.day}</Text>
      </View>
    );
  }

  const eventCount = sections.reduce((acc, s) => acc + s.data.length, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.cityRow}>
          <Ionicons name="location" size={13} color="#2ee6d6" />
          <Text style={styles.city}>Cape Town</Text>
        </View>
      </View>

      {/* Going strip */}
      {goingEvents.length > 0 && (
        <View style={styles.goingSection}>
          <Text style={styles.goingSectionLabel}>You're going</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goingScroll}>
            {goingEvents.map(e => (
              <TouchableOpacity
                key={e.id}
                style={styles.goingCard}
                onPress={() => navigation.navigate('DiscoverEventDetail', { event: e })}
                activeOpacity={0.8}
              >
                <Text style={styles.goingCardName} numberOfLines={2}>{e.name}</Text>
                <Text style={styles.goingCardVenue} numberOfLines={1}>{e.venue}</Text>
                {e.price ? <Text style={styles.goingCardPrice}>{e.price}</Text> : null}
                {e.starts_at ? (
                  <Text style={styles.goingCardTime}>
                    {new Date(e.starts_at).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Category cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
        style={styles.categoryRow}
      >
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryCard, isActive && styles.categoryCardActive]}
              onPress={() => setActiveCategory(cat.key)}
              activeOpacity={0.75}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Day filter pills */}
      <View style={styles.filters}>
        {DAY_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, activeDay === f && styles.filterPillActive]}
            onPress={() => setActiveDay(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, activeDay === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.eventCount}>{eventCount} event{eventCount !== 1 ? 's' : ''}</Text>
      </View>

      <SectionList
        style={styles.list}
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderEvent}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchEvents(); }}
            tintColor="#fff"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No events found.</Text>
            <Text style={styles.emptySubText}>Try a different category or day.</Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.deep },

  header: { paddingHorizontal: space[7], paddingTop: space[2], paddingBottom: space[3] },
  title: { fontSize: fontSize.h1, fontWeight: fontWeight.black, color: color.fg, letterSpacing: -1 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  city: { color: color.glowCyan, fontSize: fontSize.meta, fontWeight: fontWeight.semi },

  categoryRow: { marginBottom: 4 },
  categoryScroll: { paddingHorizontal: space[6], gap: space[2] },
  categoryCard: {
    alignItems: 'center', justifyContent: 'center',
    width: 76, paddingVertical: 14,
    borderRadius: radius.xl, backgroundColor: color.ink,
    borderWidth: 1, borderColor: color.shore, gap: 6,
  },
  categoryCardActive: { backgroundColor: color.statusLiveBg, borderColor: color.glowCyan },
  categoryEmoji: { fontSize: 24 },
  categoryLabel: { color: color.fg4, fontSize: fontSize.label, fontWeight: fontWeight.semi },
  categoryLabelActive: { color: color.glowCyan },

  filters: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[6], paddingVertical: space[3] },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: color.ink, borderWidth: 1, borderColor: color.shore,
  },
  filterPillActive: { backgroundColor: color.glowCyan, borderColor: color.glowCyan },
  filterText: { color: color.fg3, fontSize: fontSize.meta, fontWeight: fontWeight.semi },
  filterTextActive: { color: color.deep },
  eventCount: { color: color.fg4, fontSize: fontSize.label, marginLeft: 'auto' },

  list: { flex: 1 },
  listContent: { paddingBottom: 100 },

  dayHeader: { paddingHorizontal: space[6], paddingTop: space[6], paddingBottom: space[2] },
  dayName: { color: color.fg, fontSize: 18, fontWeight: fontWeight.heavy, letterSpacing: -0.5 },
  dayDate: { color: color.fg4, fontSize: fontSize.meta, marginTop: 1 },

  card: {
    backgroundColor: color.ink, borderRadius: radius.xl, padding: space[5],
    marginHorizontal: space[6], marginBottom: space[2],
    borderWidth: 1, borderColor: color.shore,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: space[3] },
  eventName: { color: color.fg, fontSize: 15, fontWeight: fontWeight.bold, flex: 1, lineHeight: 20 },
  priceBadge: { paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.xs, flexShrink: 0 },
  freeBadge: { backgroundColor: color.statusLiveBg },
  paidBadge: { backgroundColor: color.statusOtwBg },
  priceText: { fontSize: fontSize.micro, fontWeight: fontWeight.bold },
  freeText: { color: color.statusLive },
  paidText: { color: color.statusOtw },

  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: space[2] },
  venue: { color: color.fg3, fontSize: fontSize.meta, flex: 1 },

  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: { color: color.fg4, fontSize: fontSize.meta },

  ticketBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: space[3], paddingVertical: 5,
    borderRadius: radius.sm, borderWidth: 1,
    borderColor: color.shore2, backgroundColor: color.ink2,
  },
  ticketText: { color: color.glowCyan, fontSize: 12, fontWeight: fontWeight.semi },

  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: color.fg, fontSize: fontSize.body, fontWeight: fontWeight.semi, marginBottom: 6 },
  emptySubText: { color: color.fg4, fontSize: fontSize.meta },

  goingSection: { marginBottom: 4 },
  goingSectionLabel: {
    color: color.fg4, fontSize: fontSize.label, fontWeight: fontWeight.semi,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: space[6], paddingBottom: space[2], paddingTop: 4,
  },
  goingScroll: { paddingHorizontal: space[6], gap: space[3] },
  goingCard: {
    width: 150, backgroundColor: color.statusLiveBg,
    borderRadius: radius.xl, borderWidth: 1, borderColor: '#1a3a3a',
    padding: space[4], gap: 4,
  },
  goingCardName: { color: color.fg, fontSize: fontSize.meta, fontWeight: fontWeight.bold, lineHeight: 18 },
  goingCardVenue: { color: color.fg4, fontSize: 12 },
  goingCardPrice: { color: color.glowCyan, fontSize: 12, fontWeight: fontWeight.semi },
  goingCardTime: { color: color.fg3, fontSize: fontSize.micro, marginTop: 4 },
});
