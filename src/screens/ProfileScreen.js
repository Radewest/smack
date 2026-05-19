import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  Alert, ScrollView, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [homeSafeLoading, setHomeSafeLoading] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [myGroups, setMyGroups] = useState([]);

  useEffect(() => {
    loadProfile();
    loadGroups();
  }, []);

  async function loadGroups() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name, emoji)')
      .eq('user_id', user.id);
    if (data) setMyGroups(data.map(m => m.groups).filter(Boolean));
  }

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || '');
      setUsername(data.username || '');
      setBio(data.bio || '');
      setAvatarUrl(data.avatar_url || null);
    }
  }

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    setUploadingAvatar(true);
    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop().toLowerCase();
    const path = `${user.id}/avatar.${ext}`;

    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

    if (error) {
      Alert.alert('Upload failed', error.message);
      setUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    const urlWithBust = `${publicUrl}?t=${Date.now()}`;
    setAvatarUrl(urlWithBust);
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
    setUploadingAvatar(false);
    setDirty(false);
  }

  async function saveProfile() {
    if (!displayName.trim()) {
      Alert.alert('Name required', 'Please enter a display name.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        username: username.trim() || null,
        bio: bio.trim() || null,
      })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setDirty(false);
      Alert.alert('Saved!', 'Your profile has been updated.');
    }
  }

  async function postHomeSafe(groupId) {
    setHomeSafeLoading(true);
    const { error } = await supabase.from('events').insert({
      group_id: groupId,
      created_by: user.id,
      title: '🏠 Home Safe',
      type: 'live',
      live_status: 'ended',
    });
    setHomeSafeLoading(false);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('🏠 Home Safe!', 'Your friends have been notified.');
  }

  function handleHomeSafe() {
    if (!user) return;
    if (myGroups.length === 0) {
      Alert.alert('No groups', 'Join or create a group first.');
      return;
    }
    if (myGroups.length === 1) {
      postHomeSafe(myGroups[0].id);
      return;
    }
    Alert.alert(
      '🏠 Home Safe',
      'Which group do you want to notify?',
      [
        ...myGroups.map(g => ({ text: `${g.emoji} ${g.name}`, onPress: () => postHomeSafe(g.id) })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  async function postFreeTonight(groupId) {
    setFreeLoading(true);
    const { error } = await supabase.from('events').insert({
      group_id: groupId,
      created_by: user.id,
      title: '🙋 Free tonight — anyone about?',
      type: 'live',
      live_status: 'live',
    });
    setFreeLoading(false);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('🙋 Posted!', "Your group can see you're free.");
  }

  function handleFreeTonight() {
    if (!user) return;
    if (myGroups.length === 0) {
      Alert.alert('No groups', 'Join or create a group first.');
      return;
    }
    if (myGroups.length === 1) {
      postFreeTonight(myGroups[0].id);
      return;
    }
    Alert.alert(
      '🙋 Free Tonight',
      'Post to which group?',
      [
        ...myGroups.map(g => ({ text: `${g.emoji} ${g.name}`, onPress: () => postFreeTonight(g.id) })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const initials = (displayName || username || user?.email || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Profile</Text>

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} disabled={uploadingAvatar}>
          {uploadingAvatar ? (
            <ActivityIndicator color="#fff" style={styles.avatar} />
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}
          <View style={styles.avatarEdit}>
            <Text style={styles.avatarEditText}>✏️</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.emailLabel}>{user?.email}</Text>

        {/* Fields */}
        <View style={styles.form}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={v => { setDisplayName(v); setDirty(true); }}
            placeholder="Your name"
            placeholderTextColor="#555"
          />

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={v => { setUsername(v); setDirty(true); }}
            placeholder="@username"
            placeholderTextColor="#555"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={v => { setBio(v); setDirty(true); }}
            placeholder="A short bio..."
            placeholderTextColor="#555"
            multiline
            numberOfLines={3}
          />
        </View>

        {dirty && (
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.disabled]}
            onPress={saveProfile}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Quick Actions</Text>
          <TouchableOpacity
            style={[styles.quickBtn, styles.quickBtnFree, freeLoading && styles.disabled]}
            onPress={handleFreeTonight}
            disabled={freeLoading}
          >
            <Text style={styles.quickIcon}>🙋</Text>
            <View>
              <Text style={styles.quickTitle}>Free Tonight</Text>
              <Text style={styles.quickSubtitle}>Let your group know you're about</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, styles.quickBtnHome, homeSafeLoading && styles.disabled]}
            onPress={handleHomeSafe}
            disabled={homeSafeLoading}
          >
            <Text style={styles.quickIcon}>🏠</Text>
            <View>
              <Text style={styles.quickTitle}>Home Safe</Text>
              <Text style={styles.quickSubtitle}>Let your friends know you're home</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  scroll: { padding: 20, paddingBottom: 60 },
  heading: {
    fontSize: 28, fontWeight: '900', color: '#fff',
    letterSpacing: -1, marginBottom: 24,
  },
  avatarWrap: { alignSelf: 'center', marginBottom: 10 },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#1a1a1a',
  },
  avatarPlaceholder: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  initials: { color: '#fff', fontSize: 30, fontWeight: '700' },
  avatarEdit: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#ff3b30', borderRadius: 12,
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
  },
  avatarEditText: { fontSize: 12 },
  emailLabel: { color: '#555', fontSize: 13, textAlign: 'center', marginBottom: 28 },
  form: { gap: 6, marginBottom: 20 },
  label: { color: '#555', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10 },
  input: {
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: '#fff',
  },
  bioInput: { height: 90, textAlignVertical: 'top', paddingTop: 12 },
  saveBtn: {
    backgroundColor: '#ff3b30', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 28,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.5 },
  section: { marginBottom: 20 },
  sectionLabel: { color: '#555', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  quickBtn: {
    borderRadius: 14, borderWidth: 1, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10,
  },
  quickBtnFree: { backgroundColor: '#0a1a2a', borderColor: '#1a3a4a' },
  quickBtnHome: { backgroundColor: '#0f1f17', borderColor: '#1a3a2a' },
  quickIcon: { fontSize: 28 },
  quickTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  quickSubtitle: { color: '#555', fontSize: 13, marginTop: 2 },
  signOutBtn: {
    borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  signOutText: { color: '#888', fontSize: 15 },
});
