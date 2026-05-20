import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

// Pull the first emoji from a string (if any), otherwise return default
function extractEmoji(str) {
  const segs = [...str.trim()];
  if (segs.length > 0 && segs[0].codePointAt(0) > 127) return segs[0];
  return '👥';
}

export default function CreateGroupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your group a name.');
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const emoji = extractEmoji(name);

    let group = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = generateInviteCode();
      const { data, error } = await supabase
        .from('groups')
        .insert({ name: name.trim(), emoji, created_by: user.id, invite_code: code })
        .select()
        .single();
      if (!error) { group = data; break; }
      if (!error?.message?.includes('unique')) {
        Alert.alert('Error', error.message);
        setLoading(false);
        return;
      }
    }

    if (!group) {
      Alert.alert('Error', 'Could not create group. Try again.');
      setLoading(false);
      return;
    }

    await supabase.from('group_members').insert({
      group_id: group.id, user_id: user.id, role: 'admin',
    });

    setLoading(false);
    navigation.getParent()?.navigate('GroupDetail', {
      groupId: group.id,
      groupName: group.name,
      groupEmoji: group.emoji,
    });
  }

  const previewEmoji = extractEmoji(name);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>New Group</Text>
        <TouchableOpacity onPress={handleCreate} disabled={loading || !name.trim()}>
          {loading
            ? <ActivityIndicator color="#2ee6d6" />
            : <Text style={[styles.create, !name.trim() && styles.disabled]}>Create</Text>
          }
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Live emoji preview */}
        <View style={styles.emojiPreview}>
          <Text style={styles.emojiPreviewText}>{previewEmoji}</Text>
        </View>

        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 🍺 The Lads, 🎉 Party crew..."
          placeholderTextColor="#555"
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={40}
        />

        <Text style={styles.hint}>
          Start with an emoji and it'll be used as your group's icon. Otherwise one will be picked for you.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1f1f1f',
  },
  heading: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancel: { color: '#888', fontSize: 16 },
  create: { color: '#2ee6d6', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  body: { padding: 24, gap: 16 },
  emojiPreview: {
    alignSelf: 'center',
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emojiPreviewText: { fontSize: 40 },
  label: { color: '#555', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, color: '#fff',
  },
  hint: { color: '#444', fontSize: 13, lineHeight: 18 },
});
