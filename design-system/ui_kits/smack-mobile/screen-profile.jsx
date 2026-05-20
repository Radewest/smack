// ─────────────────────────────────────────────────────────────
// Smack UI kit — Profile screen
// ─────────────────────────────────────────────────────────────

function ProfileScreen({ profile, onSignOut }) {
  const [displayName, setDisplayName] = React.useState(profile.displayName);
  const [username, setUsername] = React.useState(profile.username);
  const [bio, setBio] = React.useState(profile.bio);

  return (
    <div style={{ flex: 1, background: '#080b14', height: '100%', overflow: 'auto',
                  padding: 20, paddingBottom: 100 }}>
      <ScreenTitle>Profile</ScreenTitle>

      {/* Avatar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 90, height: 90, borderRadius: 45,
            background: 'linear-gradient(135deg, #2ee6d6 0%, #a06bff 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px #2ee6d655',
          }}>
            <span style={{ color: '#04060c', fontSize: 32, fontWeight: 800 }}>TR</span>
          </div>
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            background: '#2ee6d6', borderRadius: 12,
            width: 26, height: 26, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="edit" size={13} color="#04060c" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      <div style={{ color: '#7a82a5', fontSize: 13, textAlign: 'center', marginBottom: 28 }}>
        {profile.email}
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
        <SectionLabel style={{ marginTop: 4 }}>Display Name</SectionLabel>
        <Input value={displayName} onChange={setDisplayName} />
        <SectionLabel style={{ marginTop: 10 }}>Username</SectionLabel>
        <Input value={username} onChange={setUsername} />
        <SectionLabel style={{ marginTop: 10 }}>Bio</SectionLabel>
        <Input value={bio} onChange={setBio} multiline />
      </div>

      {/* Quick Actions */}
      <SectionLabel style={{ marginBottom: 10 }}>Quick Actions</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <div style={{
          borderRadius: 14, border: '1px solid #1a3a4a', background: '#0a1a2a',
          padding: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
        }}>
          <span style={{ fontSize: 28 }}>🙋</span>
          <div>
            <div style={{ color: '#f3f5ff', fontSize: 16, fontWeight: 700 }}>Free Tonight</div>
            <div style={{ color: '#7a82a5', fontSize: 13, marginTop: 2 }}>
              Let your group know you're about
            </div>
          </div>
        </div>
        <div style={{
          borderRadius: 14, border: '1px solid #1a3a2a', background: '#0f1f17',
          padding: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
        }}>
          <span style={{ fontSize: 28 }}>🏠</span>
          <div>
            <div style={{ color: '#f3f5ff', fontSize: 16, fontWeight: 700 }}>Home Safe</div>
            <div style={{ color: '#7a82a5', fontSize: 13, marginTop: 2 }}>
              Let your friends know you're home
            </div>
          </div>
        </div>
      </div>

      <Button variant="outline" onClick={onSignOut}>Sign Out</Button>
    </div>
  );
}

window.ProfileScreen = ProfileScreen;
