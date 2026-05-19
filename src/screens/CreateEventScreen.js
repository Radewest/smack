import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';

const DEFAULT_GROUP_ID = '00000000-0000-0000-0000-000000000001';

export default function CreateEventScreen({ navigation }) {
  const [type, setType] = useState('proper');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [liveStatus, setLiveStatus] = useState('live');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your smack a name.');
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      group_id: DEFAULT_GROUP_ID,
      created_by: user.id,
      title: title.trim(),
      location: location.trim() || null,
      type,
      ...(type === 'proper' && {
        starts_at: date.toISOString(),
        description: description.trim() || null,
      }),
      ...(type === 'live' && { live_status: liveStatus }),
    };

    const { error } = await supabase.from('events').insert(payload);
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      navigation.goBack();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>New Smack</Text>
        <TouchableOpacity onPress={handleCreate} disabled={loading}>
          <Text style={[styles.done, loading && styles.disabled]}>
            {type === 'live' ? '⚡ Go Live' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'proper' && styles.typeBtnActive]}
            onPress={() => setType('proper')}
          >
            <Text style={[styles.typeBtnText, type === 'proper' && styles.typeBtnTextActive]}>
              📅 Event
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'live' && styles.typeBtnActiveLive]}
            onPress={() => setType('live')}
          >
            <Text style={[styles.typeBtnText, type === 'live' && styles.typeBtnTextActive]}>
              ⚡ Live
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder={type === 'live' ? "I'm at… (e.g. The Crown, Shoreditch)" : "What's the smack?"}
          placeholderTextColor="#555"
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        <TextInput
          style={styles.input}
          placeholder="Location (optional)"
          placeholderTextColor="#555"
          value={location}
          onChangeText={setLocation}
        />

        {type === 'proper' && (
          <>
            <TouchableOpacity style={styles.input} onPress={() => setShowDate(true)}>
              <Text style={styles.inputText}>
                📅  {date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.input} onPress={() => setShowTime(true)}>
              <Text style={styles.inputText}>
                🕐  {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor="#555"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </>
        )}

        {type === 'live' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>I am currently…</Text>
            <View style={styles.statusOptions}>
              {[
                ['on_the_way', '🚶 On the way'],
                ['live', '🟢 Already here'],
              ].map(([s, label]) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusOpt, liveStatus === s && styles.statusOptActive]}
                  onPress={() => setLiveStatus(s)}
                >
                  <Text style={[styles.statusOptText, liveStatus === s && styles.statusOptTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {showDate && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(_, d) => { setShowDate(false); if (d) setDate(prev => { const n = new Date(prev); n.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); return n; }); }}
        />
      )}
      {showTime && (
        <DateTimePicker
          value={date}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowTime(false); if (d) setDate(prev => { const n = new Date(prev); n.setHours(d.getHours(), d.getMinutes()); return n; }); }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  heading: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancel: { color: '#888', fontSize: 16 },
  done: { color: '#ff3b30', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  form: { padding: 20, gap: 12 },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  typeBtnActive: { borderColor: '#0a4a8a', backgroundColor: '#0a1f3a' },
  typeBtnActiveLive: { borderColor: '#4a2a0a', backgroundColor: '#2a1000' },
  typeBtnText: { color: '#666', fontWeight: '600' },
  typeBtnTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
  },
  inputText: { color: '#fff', fontSize: 16 },
  textArea: { height: 90, textAlignVertical: 'top' },
  section: { marginTop: 4 },
  sectionLabel: { color: '#888', fontSize: 13, marginBottom: 10 },
  statusOptions: { flexDirection: 'row', gap: 10 },
  statusOpt: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statusOptActive: { borderColor: '#30d158', backgroundColor: '#0a1f0f' },
  statusOptText: { color: '#666', fontWeight: '600' },
  statusOptTextActive: { color: '#30d158' },
});
