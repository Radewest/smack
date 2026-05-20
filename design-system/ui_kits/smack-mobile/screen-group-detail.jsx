// ─────────────────────────────────────────────────────────────
// Smack UI kit — Group detail screen (events feed for one group)
// ─────────────────────────────────────────────────────────────

function GroupDetailScreen({
  group, events, currentUserId,
  onBack, onSelectEvent, onCreateEvent, onUpdateAttendance, onAddReaction,
}) {
  const today = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

  const active = events.filter(e => e.liveStatus !== 'ended');
  const ended  = events.filter(e => e.liveStatus === 'ended');

  return (
    <div style={{ flex: 1, background: '#080b14', height: '100%',
                  display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Header
        title={group.name}
        emoji={group.emoji}
        onBack={onBack}
        trailing={<Icon name="users" size={22} color="#7a82a5" />}
      />

      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 120 }}>
        <SectionLabel style={{ paddingInline: 16, paddingTop: 14, paddingBottom: 10 }}>
          {today}
        </SectionLabel>

        {active.map(e => (
          <EventCard key={e.id} event={e} currentUserId={currentUserId}
                     onPress={() => onSelectEvent(e)}
                     onUpdateAttendance={onUpdateAttendance}
                     onAddReaction={onAddReaction} />
        ))}

        {ended.length > 0 && (
          <>
            <div style={{
              color: '#4a5278', fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 0.5,
              paddingInline: 16, paddingTop: 12, paddingBottom: 6,
            }}>Ended</div>
            {ended.map(e => (
              <EventCard key={e.id} event={e} currentUserId={currentUserId} dim
                         onPress={() => onSelectEvent(e)}
                         onAddReaction={onAddReaction} />
            ))}
          </>
        )}

        {active.length === 0 && ended.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <div style={{ color: '#f3f5ff', fontSize: 16, fontWeight: 600 }}>Nothing on today.</div>
            <div style={{ color: '#7a82a5', fontSize: 14, marginTop: 6 }}>Tap + to create a smack.</div>
          </div>
        )}
      </div>

      <FAB onClick={onCreateEvent} />
    </div>
  );
}

window.GroupDetailScreen = GroupDetailScreen;
