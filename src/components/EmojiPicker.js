import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  FlatList, TouchableWithoutFeedback,
} from 'react-native';

const EMOJIS = [
  '🔥','❤️','😂','🥹','👏','💯','😍','🤩',
  '🙌','🎉','💪','😭','🤣','😎','🥳','😱',
  '🤔','✨','🙏','🎯','🤯','😅','🤙','💥',
  '🥂','🍺','🫡','🤝','🥰','😏','🫶','⚡',
  '🌟','🎊','🫂','🤌','👋','💨','😬','🙃',
  '🫠','👍','💜','🏃','😤','🎈','🥴','🤪',
];

export default function EmojiPicker({ visible, onSelect, onClose, currentEmoji }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>React</Text>

        <FlatList
          data={EMOJIS}
          keyExtractor={item => item}
          numColumns={8}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.emojiBtn, currentEmoji === item && styles.emojiBtnActive]}
              onPress={() => onSelect(item)}
              activeOpacity={0.6}
            >
              <Text style={styles.emoji}>{item}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.grid}
          scrollEnabled={false}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#444', alignSelf: 'center', marginTop: 10, marginBottom: 14,
  },
  title: {
    color: '#555', fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
    textAlign: 'center', marginBottom: 12,
  },
  grid: { paddingHorizontal: 4 },
  emojiBtn: {
    flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, margin: 2,
  },
  emojiBtnActive: { backgroundColor: '#2a2a2a' },
  emoji: { fontSize: 28 },
});
