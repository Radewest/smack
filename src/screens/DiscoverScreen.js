import { useEffect, useState } from 'react';
import {
  View, Text, SectionList, TouchableOpacity,
  StyleSheet, RefreshControl, Linking, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

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
  const [activeDay, setActiveDay] = useState('All');
  const [activeCategory, setActiveCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchEvents(); }, []);

  useEffect(() => {
    buildSections(allEvents, activeDay, activeCategory);
  }, [activeDay, activeCategory, allEvents]);

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
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderEvent}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.list}
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
  container: { flex: 1, backgroundColor: '#0d0d0d' },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  city: { color: '#2ee6d6', fontSize: 13, fontWeight: '600' },

  categoryRow: { marginBottom: 4 },
  categoryScroll: { paddingHorizontal: 16, gap: 8 },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 6,
  },
  categoryCardActive: {
    backgroundColor: '#1f0a0a',
    borderColor: '#2ee6d6',
  },
  categoryEmoji: { fontSize: 24 },
  categoryLabel: { color: '#666', fontSize: 12, fontWeight: '600' },
  categoryLabelActive: { color: '#2ee6d6' },

  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  filterPillActive: { backgroundColor: '#2ee6d6', borderColor: '#2ee6d6' },
  filterText: { color: '#888', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  eventCount: { color: '#444', fontSize: 12, marginLeft: 'auto' },

  list: { paddingBottom: 100 },

  dayHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  dayName: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  dayDate: { color: '#555', fontSize: 13, marginTop: 1 },

  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 10,
  },
  eventName: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1, lineHeight: 20 },
  priceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexShrink: 0 },
  freeBadge: { backgroundColor: '#0a1f0f' },
  paidBadge: { backgroundColor: '#1f1a0a' },
  priceText: { fontSize: 11, fontWeight: '700' },
  freeText: { color: '#30d158' },
  paidText: { color: '#ff9f0a' },

  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  venue: { color: '#888', fontSize: 13, flex: 1 },

  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: { color: '#555', fontSize: 13 },

  ticketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a1a1a',
    backgroundColor: '#1f0a0a',
  },
  ticketText: { color: '#2ee6d6', fontSize: 12, fontWeight: '600' },

  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySubText: { color: '#555', fontSize: 14 },
});
