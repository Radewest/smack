import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { color, fontSize, fontWeight, radius, space } from '../theme';

export default function CreateEventScreen({ route, navigation }) {
  const groupId = route.params?.groupId;
  const [type, setType] = useState(route.params?.defaultType || 'proper');
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

    if (!groupId) {
      Alert.alert('No group', 'Open a group first, then tap + to create an event.');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      group_id: groupId,
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
          placeholderTextColor={color.fg4}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        <TextInput
          style={styles.input}
          placeholder="Location (optional)"
          placeholderTextColor={color.fg4}
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
              placeholderTextColor={color.fg4}
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
  container: { flex: 1, backgroundColor: color.deep },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[7],
    paddingVertical: space[5],
    borderBottomWidth: 1,
    borderBottomColor: color.shore,
  },
  heading: { color: color.fg, fontSize: fontSize.body, fontWeight: fontWeight.bold },
  cancel: { color: color.fg3, fontSize: fontSize.body },
  done: { color: color.glowCyan, fontSize: fontSize.body, fontWeight: fontWeight.bold },
  disabled: { opacity: 0.4 },
  form: { padding: space[7], gap: space[4] },
  typeRow: { flexDirection: 'row', gap: space[3], marginBottom: 4 },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: radius.md,
    backgroundColor: color.ink, alignItems: 'center',
    borderWidth: 1, borderColor: color.shore,
  },
  typeBtnActive: { borderColor: color.glowCyan, backgroundColor: '#081820' },
  typeBtnActiveLive: { borderColor: color.glowAmber, backgroundColor: '#1f1200' },
  typeBtnText: { color: color.fg4, fontWeight: fontWeight.semi },
  typeBtnTextActive: { color: color.fg },
  input: {
    backgroundColor: color.ink,
    borderWidth: 1,
    borderColor: color.shore,
    borderRadius: radius.lg,
    paddingHorizontal: space[6],
    paddingVertical: space[5],
    fontSize: fontSize.body,
    color: color.fg,
  },
  inputText: { color: color.fg, fontSize: fontSize.body },
  textArea: { height: 90, textAlignVertical: 'top' },
  section: { marginTop: 4 },
  sectionLabel: { color: color.fg3, fontSize: fontSize.meta, marginBottom: space[3] },
  statusOptions: { flexDirection: 'row', gap: space[3] },
  statusOpt: {
    flex: 1, paddingVertical: 12, borderRadius: radius.md,
    backgroundColor: color.ink, alignItems: 'center',
    borderWidth: 1, borderColor: color.shore,
  },
  statusOptActive: { borderColor: color.statusLive, backgroundColor: color.statusLiveBg },
  statusOptText: { color: color.fg4, fontWeight: fontWeight.semi },
  statusOptTextActive: { color: color.statusLive },
});
