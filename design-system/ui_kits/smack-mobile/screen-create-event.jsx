// ─────────────────────────────────────────────────────────────
// Smack UI kit — Create event screen (modal)
// ─────────────────────────────────────────────────────────────

function CreateEventScreen({ onCancel, onCreate }) {
  const [type, setType] = React.useState('proper');
  const [title, setTitle] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [liveStatus, setLiveStatus] = React.useState('live');
  const date = 'Sat 23 May · 16:00';

  return (
    <div style={{ flex: 1, background: '#080b14', height: '100%',
                  display: 'flex', flexDirection: 'column' }}>
      {/* Modal header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid #1c2440',
      }}>
        <div onClick={onCancel} style={{ cursor: 'pointer' }}>
          <span style={{ color: '#7a82a5', fontSize: 16 }}>Cancel</span>
        </div>
        <div style={{ color: '#f3f5ff', fontSize: 16, fontWeight: 700 }}>New Smack</div>
        <div onClick={() => onCreate?.({ type, title, location, description, liveStatus })}
             style={{ cursor: 'pointer' }}>
          <span style={{
            color: title.trim() ? '#2ee6d6' : '#4a5278',
            fontSize: 16, fontWeight: 700,
          }}>
            {type === 'live' ? '⚡ Go Live' : 'Create'}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20,
                    display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Type selector */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
          <div onClick={() => setType('proper')} style={{
            flex: 1, padding: 12, borderRadius: 10,
            background: type === 'proper' ? '#0a1f3a' : '#0d1220',
            border: `1px solid ${type === 'proper' ? '#0a4a8a' : '#2a3354'}`,
            textAlign: 'center', cursor: 'pointer',
          }}>
            <span style={{ color: type === 'proper' ? '#f3f5ff' : '#7a82a5',
                           fontWeight: 600 }}>📅 Event</span>
          </div>
          <div onClick={() => setType('live')} style={{
            flex: 1, padding: 12, borderRadius: 10,
            background: type === 'live' ? '#2a1000' : '#0d1220',
            border: `1px solid ${type === 'live' ? '#4a2a0a' : '#2a3354'}`,
            textAlign: 'center', cursor: 'pointer',
          }}>
            <span style={{ color: type === 'live' ? '#f3f5ff' : '#7a82a5',
                           fontWeight: 600 }}>⚡ Live</span>
          </div>
        </div>

        <Input value={title} onChange={setTitle} autoFocus
               placeholder={type === 'live' ? "I'm at… (e.g. The Crown, Shoreditch)"
                                            : "What's the smack?"} />

        <Input value={location} onChange={setLocation} placeholder="Location (optional)" />

        {type === 'proper' && (
          <>
            <div style={{
              background: '#0d1220', border: '1px solid #2a3354',
              borderRadius: 12, padding: '13px 16px', color: '#f3f5ff', fontSize: 16,
            }}>📅  {date.split(' · ')[0]}, 2026</div>
            <div style={{
              background: '#0d1220', border: '1px solid #2a3354',
              borderRadius: 12, padding: '13px 16px', color: '#f3f5ff', fontSize: 16,
            }}>🕐  {date.split(' · ')[1]}</div>
            <Input value={description} onChange={setDescription}
                   placeholder="Description (optional)" multiline />
          </>
        )}

        {type === 'live' && (
          <div style={{ marginTop: 4 }}>
            <div style={{ color: '#b8bedb', fontSize: 13, marginBottom: 10 }}>
              I am currently…
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[['on_the_way', '🚶 On the way'], ['live', '🟢 Already here']].map(([s, l]) => {
                const active = liveStatus === s;
                return (
                  <div key={s} onClick={() => setLiveStatus(s)} style={{
                    flex: 1, padding: 12, borderRadius: 10,
                    background: active ? '#0e2a1d' : '#0d1220',
                    border: `1px solid ${active ? '#1f5a3b' : '#2a3354'}`,
                    textAlign: 'center', cursor: 'pointer',
                  }}>
                    <span style={{ color: active ? '#3ff09a' : '#7a82a5',
                                   fontWeight: 600 }}>{l}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.CreateEventScreen = CreateEventScreen;
