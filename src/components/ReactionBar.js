import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import EmojiPicker from './EmojiPicker';
import { supabase } from '../lib/supabase';

export default function ReactionBar({ eventId, reactions = [], userId, onUpdate }) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // Group reactions by emoji: { '🔥': [{ user_id, ... }], ... }
  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {});

  const myReaction = reactions.find(r => r.user_id === userId);

  async function handleSelect(emoji) {
    setPickerOpen(false);
    if (!userId) return;

    // Optimistic update
    const wasMyEmoji = myReaction?.emoji === emoji;

    if (wasMyEmoji) {
      // Remove reaction
      onUpdate(reactions.filter(r => r.user_id !== userId));
      await supabase.from('reactions').delete()
        .eq('event_id', eventId).eq('user_id', userId);
    } else if (myReaction) {
      // Replace reaction
      onUpdate(reactions.map(r => r.user_id === userId ? { ...r, emoji } : r));
      await supabase.from('reactions').update({ emoji })
        .eq('event_id', eventId).eq('user_id', userId);
    } else {
      // New reaction
      const newReaction = { event_id: eventId, user_id: userId, emoji };
      onUpdate([...reactions, newReaction]);
      await supabase.from('reactions').insert(newReaction);
    }
  }

  async function handleTapExisting(emoji) {
    if (!userId) return;
    if (myReaction?.emoji === emoji) {
      // Remove
      onUpdate(reactions.filter(r => r.user_id !== userId));
      await supabase.from('reactions').delete()
        .eq('event_id', eventId).eq('user_id', userId);
    } else {
      // Set this emoji as my reaction
      handleSelect(emoji);
    }
  }

  const emojiList = Object.entries(grouped);

  return (
    <View style={styles.row}>
      {emojiList.map(([emoji, reacters]) => {
        const isMe = reacters.some(r => r.user_id === userId);
        return (
          <TouchableOpacity
            key={emoji}
            style={[styles.pill, isMe && styles.pillActive]}
            onPress={() => handleTapExisting(emoji)}
            activeOpacity={0.7}
          >
            <Text style={styles.pillEmoji}>{emoji}</Text>
            {reacters.length > 1 && (
              <Text style={[styles.pillCount, isMe && styles.pillCountActive]}>
                {reacters.length}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.pill, styles.pillAdd]}
        onPress={() => setPickerOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.pillAddText}>{myReaction ? myReaction.emoji : '+'}</Text>
      </TouchableOpacity>

      <EmojiPicker
        visible={pickerOpen}
        onSelect={handleSelect}
        onClose={() => setPickerOpen(false)}
        currentEmoji={myReaction?.emoji}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 6, marginTop: 10, alignItems: 'center',
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#242424', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  pillActive: { backgroundColor: '#2a1f0a', borderColor: '#ff9f0a' },
  pillEmoji: { fontSize: 15 },
  pillCount: { color: '#888', fontSize: 12, fontWeight: '600' },
  pillCountActive: { color: '#ff9f0a' },
  pillAdd: { paddingHorizontal: 10 },
  pillAddText: { color: '#555', fontSize: 16, fontWeight: '300' },
});
