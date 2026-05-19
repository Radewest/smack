import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function GroupsScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id));
  }, []);

  useFocusEffect(
    useCallback(() => { fetchGroups(); }, [])
  );

  async function fetchGroups() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id, role, groups(id, name, emoji, invite_code, created_by)')
      .eq('user_id', user.id);

    if (!memberships) return;

    const groupIds = memberships.map(m => m.group_id);
    const { data: allMembers } = await supabase
      .from('group_members')
      .select('group_id')
      .in('group_id', groupIds);

    const counts = {};
    if (allMembers) {
      allMembers.forEach(m => { counts[m.group_id] = (counts[m.group_id] || 0) + 1; });
    }

    setGroups(
      memberships.map(m => ({
        ...m.groups,
        role: m.role,
        memberCount: counts[m.group_id] || 1,
      }))
    );
  }

  function handleFab() {
    Alert.alert('Groups', 'What would you like to do?', [
      { text: '✨ Create a Group', onPress: () => navigation.navigate('CreateGroup') },
      { text: '🔑 Join with Code', onPress: () => navigation.navigate('JoinGroup') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function renderGroup({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('GroupDetail', {
          groupId: item.id,
          groupName: item.name,
          groupEmoji: item.emoji,
        })}
        activeOpacity={0.75}
      >
        <View style={styles.emojiWrap}>
          <Text style={styles.emoji}>{item.emoji}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.groupName}>{item.name}</Text>
          <Text style={styles.groupMeta}>
            {item.memberCount} member{item.memberCount !== 1 ? 's' : ''}
            {item.role === 'admin' ? '  ·  Admin' : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#333" />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Smack</Text>
      </View>

      <FlatList
        data={groups}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, groups.length === 0 && styles.listEmpty]}
        renderItem={renderGroup}
        ListHeaderComponent={
          groups.length > 0 ? <Text style={styles.sectionLabel}>Your Groups</Text> : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptySub}>Create a group for your crew, or join one with an invite code.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreateGroup')}>
              <Text style={styles.emptyBtnText}>Create a Group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emptyBtnOutline} onPress={() => navigation.navigate('JoinGroup')}>
              <Text style={styles.emptyBtnOutlineText}>Join with Code</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleFab} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  logo: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  sectionLabel: {
    color: '#555', fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 16, paddingBottom: 10,
  },
  list: { paddingBottom: 120 },
  listEmpty: { flex: 1 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  emojiWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#242424', alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  emoji: { fontSize: 24 },
  cardBody: { flex: 1 },
  groupName: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 3 },
  groupMeta: { color: '#555', fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptySub: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  emptyBtn: {
    backgroundColor: '#ff3b30', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32, marginBottom: 10, width: '100%', alignItems: 'center',
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyBtnOutline: {
    borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center',
  },
  emptyBtnOutlineText: { color: '#888', fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 30, right: 24,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#ff3b30', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#ff3b30', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  fabIcon: { color: '#fff', fontSize: 30, fontWeight: '300', lineHeight: 34 },
});
