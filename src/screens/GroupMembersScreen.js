import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function GroupMembersScreen({ route, navigation }) {
  const { groupId, groupName, groupEmoji } = route.params;
  const [members, setMembers] = useState([]);
  const [inviteCode, setInviteCode] = useState('');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id));
    fetchMembers();
    fetchInviteCode();
  }, []);

  async function fetchMembers() {
    const { data } = await supabase
      .from('group_members')
      .select('user_id, role, joined_at, profiles!group_members_user_id_fkey(display_name, username, avatar_url)')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });
    if (data) setMembers(data);
  }

  async function fetchInviteCode() {
    const { data } = await supabase
      .from('groups')
      .select('invite_code')
      .eq('id', groupId)
      .single();
    if (data) setInviteCode(data.invite_code);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Join ${groupEmoji} ${groupName} on Smack!\nUse code: ${inviteCode}`,
      });
    } catch (e) {}
  }

  function renderMember({ item }) {
    const name = item.profiles?.display_name || item.profiles?.username || 'Unknown';
    const isMe = item.user_id === userId;
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
      <View style={styles.memberRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{name}{isMe ? ' (you)' : ''}</Text>
          {item.profiles?.username ? (
            <Text style={styles.memberUsername}>@{item.profiles.username}</Text>
          ) : null}
        </View>
        {item.role === 'admin' && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminText}>Admin</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>{groupEmoji} {groupName}</Text>
        <View style={{ width: 32 }} />
      </View>

      {inviteCode ? (
        <TouchableOpacity style={styles.inviteCard} onPress={handleShare} activeOpacity={0.8}>
          <View>
            <Text style={styles.inviteLabel}>Invite Code</Text>
            <Text style={styles.inviteCode}>{inviteCode}</Text>
          </View>
          <View style={styles.shareBtn}>
            <Ionicons name="share-outline" size={18} color="#ff3b30" />
            <Text style={styles.shareText}>Share</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      <FlatList
        data={members}
        keyExtractor={item => item.user_id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.sectionLabel}>{members.length} Member{members.length !== 1 ? 's' : ''}</Text>
        }
        renderItem={renderMember}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1f1f1f',
  },
  back: { width: 32 },
  heading: { color: '#fff', fontSize: 16, fontWeight: '700' },
  inviteCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
    marginHorizontal: 16, marginTop: 16,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  inviteLabel: { color: '#555', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  inviteCode: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 6 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shareText: { color: '#ff3b30', fontWeight: '700', fontSize: 14 },
  list: { padding: 16, paddingTop: 8 },
  sectionLabel: {
    color: '#555', fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  memberInfo: { flex: 1 },
  memberName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  memberUsername: { color: '#555', fontSize: 12, marginTop: 1 },
  adminBadge: {
    backgroundColor: '#2a1a00', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  adminText: { color: '#ff9f0a', fontSize: 11, fontWeight: '700' },
});
