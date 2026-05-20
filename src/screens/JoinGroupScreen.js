import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function JoinGroupScreen({ navigation }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      Alert.alert('Invalid code', 'Invite codes are 6 characters long.');
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.rpc('join_group_by_code', { code: trimmed });

    setLoading(false);

    if (error || data?.error) {
      Alert.alert('Not found', data?.error || error?.message || 'No group found with that code.');
      return;
    }

    // Navigate into the group — getParent() pushes onto the main stack
    // so the modal dismisses and GroupsScreen refreshes behind it
    navigation.getParent()?.navigate('GroupDetail', {
      groupId: data.group_id,
      groupName: data.name,
      groupEmoji: data.emoji,
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Join a Group</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.icon}>🔑</Text>
        <Text style={styles.title}>Enter invite code</Text>
        <Text style={styles.sub}>Ask a friend for their 6-letter group code.</Text>

        <TextInput
          ref={inputRef}
          style={styles.codeInput}
          value={code}
          onChangeText={v => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          placeholder="A B C D E F"
          placeholderTextColor="#333"
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          keyboardType="default"
        />

        <TouchableOpacity
          style={[styles.joinBtn, (loading || code.length < 6) && styles.disabled]}
          onPress={handleJoin}
          disabled={loading || code.length < 6}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.joinBtnText}>Join Group</Text>
          }
        </TouchableOpacity>
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
  body: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 60 },
  icon: { fontSize: 52, marginBottom: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  sub: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 40 },
  codeInput: {
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 16, paddingHorizontal: 24, paddingVertical: 20,
    fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 12,
    textAlign: 'center', width: '100%', marginBottom: 20,
  },
  joinBtn: {
    backgroundColor: '#2ee6d6', borderRadius: 12,
    paddingVertical: 16, width: '100%', alignItems: 'center',
  },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.4 },
});
