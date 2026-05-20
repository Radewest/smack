// ─────────────────────────────────────────────────────────────
// Smack UI kit — Groups screen (the home tab)
// Lists all the user's groups; FAB to create/join.
// ─────────────────────────────────────────────────────────────

function GroupsScreen({ groups, onSelectGroup }) {
  return (
    <div style={{ flex: 1, background: '#080b14', height: '100%', overflow: 'auto',
                  paddingBottom: 120 }}>
      <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between' }}>
        <div style={{
          fontSize: 28, fontWeight: 900, letterSpacing: -1, color: '#f3f5ff',
          textShadow: '0 0 16px #2ee6d633',
        }}>smack</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="refresh" size={18} color="#7a82a5" />
        </div>
      </div>

      <SectionLabel style={{ paddingInline: 16, paddingBottom: 10 }}>Your Groups</SectionLabel>

      {groups.map(g => (
        <GroupCard key={g.id} group={g} onPress={() => onSelectGroup(g)} />
      ))}

      <div style={{ paddingInline: 16, paddingTop: 14 }}>
        <SectionLabel style={{ marginBottom: 10 }}>Discover</SectionLabel>
        <div style={{
          background: '#0d1220', border: '1px solid #2a3354', borderRadius: 16,
          padding: 14, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: '#1c2440',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><span style={{ fontSize: 22 }}>🔑</span></div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#f3f5ff', fontWeight: 700, fontSize: 14 }}>Got an invite code?</div>
            <div style={{ color: '#7a82a5', fontSize: 12, marginTop: 2 }}>Join a friend's group.</div>
          </div>
          <Icon name="chevronRight" size={18} color="#4a5278" />
        </div>
      </div>
    </div>
  );
}

window.GroupsScreen = GroupsScreen;
