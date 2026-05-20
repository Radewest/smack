// ─────────────────────────────────────────────────────────────
// Smack UI kit — Event card (the star of the system)
// Displays a Smack event with title, location, attendance strip,
// reactions, and inline status controls.
// ─────────────────────────────────────────────────────────────

function EventCard({ event, onPress, onUpdateAttendance, onAddReaction, currentUserId, dim }) {
  const isLive   = event.type === 'live';
  const isProper = event.type === 'proper';
  const isHomeSafe = event.title === '🏠 Home Safe';
  const isOwner  = event.createdBy === currentUserId;

  const myRsvp  = event.rsvps.find(r => r.userId === currentUserId);
  const going   = event.rsvps.filter(r => r.status === 'going');
  const maybe   = event.rsvps.filter(r => r.status === 'maybe');
  const here    = going.filter(r => r.attendance === 'here');

  const STATUS_COLORS = {
    on_the_way: '#ffb547', live: '#3ff09a', heading_home: '#8a92b8', ended: '#4a5278',
  };
  const STATUS_LABELS = {
    on_the_way: 'On the way 🚶', live: 'Live now 🟢', heading_home: 'Heading home 🌙', ended: 'Ended',
  };

  return (
    <div onClick={onPress} style={{
      background: isHomeSafe ? '#0f1f17' : '#0d1220',
      border: `1px solid ${isHomeSafe ? '#1a3a2a' : '#2a3354'}`,
      borderRadius: 14, padding: 16,
      marginBottom: 10, marginInline: 16,
      opacity: dim ? 0.5 : 1, cursor: 'pointer',
    }}>
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {isLive && event.liveStatus !== 'ended' && (
            <div className="smack-pulse-dot" style={{
              width: 9, height: 9, borderRadius: '50%',
              background: STATUS_COLORS[event.liveStatus],
              boxShadow: `0 0 12px ${STATUS_COLORS[event.liveStatus]}cc`,
            }} />
          )}
          <span style={{ color: '#f3f5ff', fontSize: 16, fontWeight: 700,
                         overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.title}
          </span>
        </div>
        {!isHomeSafe && <TypeBadge type={event.type} />}
      </div>

      {/* Location */}
      {event.location && (
        <div style={{ color: '#7a82a5', fontSize: 13, marginBottom: 3 }}>
          📍 <span style={{ textDecoration: 'underline', color: '#b8bedb' }}>{event.location}</span>
        </div>
      )}

      {/* Time (proper events only) */}
      {event.startsAt && isProper && (
        <div style={{ color: '#7a82a5', fontSize: 13, marginBottom: 3 }}>🕐 {event.startsAt}</div>
      )}

      {/* Live status text */}
      {isLive && event.liveStatus && (
        <div style={{ color: STATUS_COLORS[event.liveStatus], fontSize: 13, fontWeight: 600, marginTop: 2 }}>
          {STATUS_LABELS[event.liveStatus]}
        </div>
      )}

      {/* Attendance strip */}
      {!isHomeSafe && (going.length > 0 || maybe.length > 0 || myRsvp) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {here.length > 0 && (
            <span style={{ color: '#3ff09a', fontSize: 12 }}>
              🟢 {here.slice(0, 2).map(r => r.name).join(', ')}
              {here.length > 2 ? ` +${here.length - 2}` : ''} here
            </span>
          )}
          {going.length > 0 && here.length === 0 && (
            <span style={{ color: '#7a82a5', fontSize: 12 }}>
              🙋 {going.slice(0, 2).map(r => r.name).join(', ')}
              {going.length > 2 ? ` +${going.length - 2}` : ''}
            </span>
          )}
          {maybe.length > 0 && (
            <span style={{ color: '#7a82a5', fontSize: 12 }}>🤔 {maybe.length} maybe</span>
          )}
          {myRsvp && (
            <span style={{
              background: '#2a1f0a', borderRadius: 6, padding: '2px 8px',
              color: '#ffb547', fontSize: 12, fontWeight: 600,
            }}>
              {myRsvp.status === 'going' ? "You're keen" :
               myRsvp.status === 'maybe' ? 'You: maybe' : "You can't go"}
            </span>
          )}
        </div>
      )}

      {/* Author */}
      <div style={{ color: '#4a5278', fontSize: 11, marginTop: 8 }}>
        {isOwner ? 'You' : event.author}
      </div>

      {/* Reactions */}
      {event.reactions && Object.keys(event.reactions).length > 0 && (
        <ReactionBar reactions={event.reactions} myReaction={event.myReaction}
                     onAdd={e => { event && onAddReaction?.(event.id, e); }} />
      )}

      {/* Inline attendance controls (proper only, my-rsvp going/maybe) */}
      {isProper && !dim && myRsvp && myRsvp.status !== 'not_going' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}
             onClick={e => e.stopPropagation()}>
          {['on_the_way', 'here', 'heading_home'].map(s => {
            const active = myRsvp.attendance === s;
            const labels = { on_the_way: 'On the way 🚶', here: "I'm here 🟢", heading_home: 'Heading home 🌙' };
            const colors = { on_the_way: '#ffb547', here: '#3ff09a', heading_home: '#8a92b8' };
            const bgs    = { on_the_way: '#2a1f0a', here: '#0e2a1d', heading_home: '#181d2e' };
            return (
              <div key={s}
                   onClick={() => onUpdateAttendance?.(event.id, active ? null : s)}
                   style={{
                     border: `1px solid ${active ? colors[s] : '#2a3354'}`,
                     background: active ? bgs[s] : 'transparent',
                     borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                   }}>
                <span style={{ color: active ? colors[s] : '#7a82a5',
                               fontSize: 12, fontWeight: 600 }}>{labels[s]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- GroupCard ----------------------------------------------------
function GroupCard({ group, onPress }) {
  return (
    <div onClick={onPress} style={{
      display: 'flex', alignItems: 'center',
      background: '#0d1220', border: '1px solid #2a3354',
      borderRadius: 16, padding: 14, marginInline: 16, marginBottom: 10,
      cursor: 'pointer',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, background: '#1c2440',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginRight: 14, flexShrink: 0,
      }}>
        <span style={{ fontSize: 24 }}>{group.emoji}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#f3f5ff', fontSize: 16, fontWeight: 700 }}>{group.name}</div>
        <div style={{ color: '#7a82a5', fontSize: 13, marginTop: 2 }}>
          {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
          {group.isAdmin ? '  ·  Admin' : ''}
        </div>
      </div>
      <Icon name="chevronRight" size={18} color="#4a5278" />
    </div>
  );
}

window.EventCard = EventCard;
window.GroupCard = GroupCard;
