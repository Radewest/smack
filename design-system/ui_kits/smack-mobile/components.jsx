// ─────────────────────────────────────────────────────────────
// Smack UI kit — small components
// Re-usable primitives that screens compose.
// ─────────────────────────────────────────────────────────────

// ---- StatusPill ---------------------------------------------------
function StatusPill({ status, size = 'sm' }) {
  const map = {
    live:         { color: '#3ff09a', bg: '#0e2a1d', border: '#1f5a3b', label: 'Live now 🟢', pulse: true },
    on_the_way:   { color: '#ffb547', bg: '#2a1f0a', border: '#5a4019', label: 'On the way 🚶' },
    here:         { color: '#3ff09a', bg: '#0e2a1d', border: '#1f5a3b', label: "I'm here 🟢", pulse: true },
    heading_home: { color: '#8a92b8', bg: '#181d2e', border: '#2f3550', label: 'Heading home 🌙' },
    ended:        { color: '#4a5278', bg: '#0d1220', border: '#2a3354', label: 'Ended' },
  };
  const s = map[status] || map.ended;
  const fs = size === 'lg' ? 14 : 13;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: 999,
      padding: size === 'lg' ? '8px 14px' : '5px 11px',
    }}>
      {s.pulse && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: s.color,
          boxShadow: `0 0 10px ${s.color}cc`, animation: 'smack-pulse 1800ms ease-in-out infinite',
        }} />
      )}
      <span style={{ color: s.color, fontSize: fs, fontWeight: 600 }}>{s.label}</span>
    </div>
  );
}

// ---- TypeBadge (the small "📅 Today" / "⚡ Live" event-type chip) ----
function TypeBadge({ type, label }) {
  const isLive = type === 'live';
  return (
    <div style={{
      background: isLive ? '#1a2a0a' : '#0a1a2a',
      padding: '4px 10px', borderRadius: 6,
    }}>
      <span style={{ color: 'var(--c-fg-2)', fontSize: 11, fontWeight: 600 }}>
        {label || (isLive ? '⚡ Live' : '📅 Today')}
      </span>
    </div>
  );
}

// ---- Avatar -------------------------------------------------------
function Avatar({ name = '?', size = 32, color = '#1c2440' }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid #2a3354',
      flexShrink: 0,
    }}>
      <span style={{ color: '#f3f5ff', fontWeight: 700, fontSize: size * 0.36 }}>{initials}</span>
    </div>
  );
}

// ---- Button (primary cyan) ----------------------------------------
function Button({ children, onClick, variant = 'primary', disabled, style = {} }) {
  const base = {
    borderRadius: 12, padding: '13px 16px',
    fontSize: 15, fontWeight: 700, textAlign: 'center',
    cursor: 'pointer', userSelect: 'none', transition: 'opacity 120ms',
    opacity: disabled ? 0.5 : 1, ...style,
  };
  const variants = {
    primary: { background: '#2ee6d6', color: '#04060c', boxShadow: '0 4px 12px #2ee6d640' },
    outline: { background: 'transparent', color: '#b8bedb', border: '1px solid #2a3354' },
    ghost:   { background: 'transparent', color: '#7a82a5', fontWeight: 500 },
    danger:  { background: 'transparent', color: '#ff5e62', border: '1px solid #2a3354' },
  };
  return (
    <div onClick={!disabled ? onClick : undefined} style={{ ...base, ...variants[variant] }}>
      {children}
    </div>
  );
}

// ---- Input --------------------------------------------------------
function Input({ value, onChange, placeholder, type = 'text', autoFocus, multiline, style = {} }) {
  const common = {
    background: '#0d1220', border: '1px solid #2a3354',
    borderRadius: 12, padding: '13px 16px', color: '#f3f5ff',
    fontSize: 16, fontFamily: 'inherit', outline: 'none',
    width: '100%', boxSizing: 'border-box', ...style,
  };
  if (multiline) {
    return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                     style={{ ...common, minHeight: 90, resize: 'none' }} />;
  }
  return <input type={type} value={value} autoFocus={autoFocus}
                onChange={e => onChange(e.target.value)} placeholder={placeholder} style={common} />;
}

// ---- SectionLabel -------------------------------------------------
function SectionLabel({ children, style = {} }) {
  return (
    <div style={{
      color: '#7a82a5', fontSize: 12, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: 0.5, ...style,
    }}>{children}</div>
  );
}

// ---- ReactionBar --------------------------------------------------
function ReactionBar({ reactions, onAdd, myReaction }) {
  // reactions: { emoji: count }
  const entries = Object.entries(reactions);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 10 }}>
      {entries.map(([emoji, count]) => {
        const isMe = myReaction === emoji;
        return (
          <div key={emoji} onClick={() => onAdd?.(emoji)}
               style={{
                 display: 'flex', alignItems: 'center', gap: 3,
                 background: isMe ? '#2a1f0a' : '#242b40',
                 border: `1px solid ${isMe ? '#ffb547' : '#2a3354'}`,
                 borderRadius: 20, padding: '4px 10px', cursor: 'pointer',
               }}>
            <span style={{ fontSize: 15 }}>{emoji}</span>
            {count > 1 && (
              <span style={{ color: isMe ? '#ffb547' : '#7a82a5', fontSize: 12, fontWeight: 600 }}>{count}</span>
            )}
          </div>
        );
      })}
      <div onClick={() => onAdd?.('🔥')}
           style={{
             background: '#242b40', border: '1px solid #2a3354',
             borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
           }}>
        <span style={{ color: '#4a5278', fontSize: 14, lineHeight: 1 }}>+</span>
      </div>
    </div>
  );
}

// ---- FAB ----------------------------------------------------------
function FAB({ onClick, style = {} }) {
  return (
    <div onClick={onClick} style={{
      position: 'absolute', bottom: 100, right: 20,
      width: 54, height: 54, borderRadius: 27,
      background: '#2ee6d6',
      boxShadow: '0 4px 8px #2ee6d680, 0 0 24px #2ee6d655',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', zIndex: 5, ...style,
    }}>
      <Icon name="plus" size={26} color="#04060c" strokeWidth={2.5} />
    </div>
  );
}

// ---- TabBar -------------------------------------------------------
function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'home',     label: 'Home',     icon: 'home' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar' },
    { id: 'profile',  label: 'Profile',  icon: 'user' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'rgba(8, 11, 20, 0.92)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid #2a3354', padding: '8px 0 28px 0',
      display: 'flex', zIndex: 4,
    }}>
      {tabs.map(t => {
        const isActive = active === t.id;
        const color = isActive ? '#2ee6d6' : '#4a5278';
        return (
          <div key={t.id} onClick={() => onChange(t.id)}
               style={{ flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            <Icon name={t.icon} size={22} color={color} />
            <span style={{ color, fontSize: 11, fontWeight: isActive ? 600 : 500 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---- Header (stack screen header) ---------------------------------
function Header({ title, emoji, onBack, trailing }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px', borderBottom: '1px solid #1f1f1f',
      borderBottomColor: '#1c2440',
    }}>
      <div onClick={onBack} style={{ width: 36, cursor: 'pointer' }}>
        {onBack && <Icon name="chevronLeft" size={24} color="#f3f5ff" />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' }}>
        {emoji && <span style={{ fontSize: 20 }}>{emoji}</span>}
        <span style={{ color: '#f3f5ff', fontSize: 17, fontWeight: 800 }}>{title}</span>
      </div>
      <div style={{ width: 36, display: 'flex', justifyContent: 'flex-end' }}>{trailing}</div>
    </div>
  );
}

// ---- ScreenTitle (large screen title) -----------------------------
function ScreenTitle({ children }) {
  return (
    <div style={{
      color: '#f3f5ff', fontSize: 28, fontWeight: 900,
      letterSpacing: -1, padding: '8px 20px 12px',
    }}>{children}</div>
  );
}

window.StatusPill = StatusPill;
window.TypeBadge = TypeBadge;
window.Avatar = Avatar;
window.Button = Button;
window.Input = Input;
window.SectionLabel = SectionLabel;
window.ReactionBar = ReactionBar;
window.FAB = FAB;
window.TabBar = TabBar;
window.Header = Header;
window.ScreenTitle = ScreenTitle;
