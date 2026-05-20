import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../lib/supabase';

export default function CalendarScreen() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    const { data } = await supabase
      .from('events')
      .select('*')
      .not('starts_at', 'is', null)
      .order('starts_at');

    if (data) {
      setEvents(data);
      const marks = {};
      data.forEach(e => {
        const d = e.starts_at.split('T')[0];
        marks[d] = { marked: true, dotColor: '#2ee6d6' };
      });
      setMarkedDates(marks);
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const dayEvents = selectedDate
    ? events.filter(e => e.starts_at?.startsWith(selectedDate))
    : [];

  const combined = {
    ...markedDates,
    ...(selectedDate
      ? { [selectedDate]: { ...(markedDates[selectedDate] || {}), selected: true, selectedColor: '#2ee6d6' } }
      : {}),
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Calendar</Text>

      <Calendar
        current={todayStr}
        markedDates={combined}
        onDayPress={day => setSelectedDate(day.dateString)}
        theme={{
          backgroundColor: '#0d0d0d',
          calendarBackground: '#0d0d0d',
          textSectionTitleColor: '#555',
          selectedDayBackgroundColor: '#2ee6d6',
          selectedDayTextColor: '#fff',
          todayTextColor: '#2ee6d6',
          dayTextColor: '#fff',
          textDisabledColor: '#333',
          dotColor: '#2ee6d6',
          selectedDotColor: '#fff',
          arrowColor: '#2ee6d6',
          monthTextColor: '#fff',
          textDayFontWeight: '500',
          textMonthFontWeight: '700',
          textDayHeaderFontWeight: '600',
        }}
      />

      <View style={styles.listHeader}>
        <Text style={styles.listHeading}>
          {selectedDate
            ? new Date(selectedDate + 'T12:00:00').toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })
            : 'Tap a date to see events'}
        </Text>
      </View>

      <FlatList
        data={dayEvents}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.location ? <Text style={styles.cardMeta}>📍 {item.location}</Text> : null}
            <Text style={styles.cardMeta}>
              🕐 {new Date(item.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          selectedDate ? (
            <Text style={styles.empty}>No events on this day.</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  heading: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  listHeader: { paddingHorizontal: 20, paddingVertical: 12 },
  listHeading: { color: '#888', fontSize: 14, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardMeta: { color: '#888', fontSize: 13 },
  empty: { color: '#555', textAlign: 'center', marginTop: 24, fontSize: 14 },
});
