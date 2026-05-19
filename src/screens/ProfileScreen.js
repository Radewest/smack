import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const DEFAULT_GROUP_ID = '00000000-0000-0000-0000-000000000001';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  async function handleHomeSafe() {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('events').insert({
      group_id: DEFAULT_GROUP_ID,
      created_by: user.id,
      title: '🏠 Home Safe',
      type: 'live',
      live_status: 'ended',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('🏠 Home Safe!', 'Your friends have been notified.');
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Profile</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quick Actions</Text>

        <TouchableOpacity
          style={[styles.homeSafeBtn, loading && styles.disabled]}
          onPress={handleHomeSafe}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.homeSafeIcon}>🏠</Text>
          <View>
            <Text style={styles.homeSafeTitle}>Home Safe</Text>
            <Text style={styles.homeSafeSubtitle}>Let your friends know you're home</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d', paddingHorizontal: 20 },
  heading: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    paddingTop: 8,
    marginBottom: 4,
  },
  email: { color: '#555', fontSize: 14, marginBottom: 32 },
  section: { marginBottom: 24 },
  sectionLabel: { color: '#555', fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  homeSafeBtn: {
    backgroundColor: '#0f1f17',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1a3a2a',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  homeSafeIcon: { fontSize: 28 },
  homeSafeTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  homeSafeSubtitle: { color: '#555', fontSize: 13, marginTop: 2 },
  disabled: { opacity: 0.5 },
  footer: { position: 'absolute', bottom: 40, left: 20, right: 20 },
  signOutBtn: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#888', fontSize: 15 },
});
