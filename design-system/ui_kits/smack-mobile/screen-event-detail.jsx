// ─────────────────────────────────────────────────────────────
// Smack UI kit — Event detail screen
// Full event view, attendance controls, attendee list, reactions.
// ─────────────────────────────────────────────────────────────

function EventDetailScreen({
  event, currentUserId,
  onBack, onUpdateRsvp, onUpdateAttendance, onAddReaction, onUpdateLiveStatus,
}) {
  const isLive = event.type === 'live';
  const isProper = event.type === 'proper';
  const isOwner = event.createdBy === currentUserId;
  const isHomeSafe = event.title === '🏠 Home Safe';

  const myRsvp = event.rsvps.find(r => r.userId === currentUserId);
  const going = event.rsvps.filter(r => r.status === 'going');
  const maybe = event.rsvps.filter(r => r.status === 'maybe');

  const STATUS_COLORS = {
    on_the_way: '#ffb547', live: '#3ff09a', heading_home: '#8a92b8', ended: '#4a5278',
  };
  const STATUS_LABELS = {
    on_the_way: 'On the way 🚶', live: 'Live now 🟢', heading_home: 'Heading home 🌙', ended: 'Ended',
  };
  const NEXT_STATUSES = {
    on_the_way: ['live', 'heading_home', 'ended'],
    live: ['heading_home', 'ended'],
    heading_home: ['ended'],
  };
  const nextStatuses = isOwner && isLive ? (NEXT_STATUSES[event.liveStatus] || []) : [];
  const canSetAttendance = isProper && myRsvp && myRsvp.status !== 'not_going';

  const ATTEND_LABELS = {
    on_the_way: '🚶 On the way', here: '🟢 Here', heading_home: '🌙 Heading home',
  };

  return (
    <div style={{ flex: 1, background: '#080b14', height: '100%',
                  display: 'flex', flexDirection: 'column' }}>
      <Header title={event.title.length > 24 ? event.title.slice(0, 22) + '…' : event.title}
              onBack={onBack} />

      <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex',
                    flexDirection: 'column', gap: 20 }}>

        {/* Title block */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isLive && event.liveStatus !== 'ended' && (
            <div className="smack-pulse-dot" style={{
              width: 12, height: 12, borderRadius: '50%',
              background: STATUS_COLORS[event.liveStatus],
              boxShadow: `0 0 16px ${STATUS_COLORS[event.liveStatus]}cc`,
            }} />
          )}
          <div style={{ color: '#f3f5ff', fontSize: 22, fontWeight: 900,
                        letterSpacing: -0.4, flex: 1 }}>{event.title}</div>
          {!isHomeSafe && <TypeBadge type={event.type} label={isLive ? '⚡ Live' : '📅 Event'} />}
        </div>

        {/* Meta box */}
        <div style={{
          background: '#0d1220', border: '1px solid #2a3354',
          borderRadius: 12, padding: 14, display: 'flex',
          flexDirection: 'column', gap: 10,
        }}>
          {event.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="mapPin" size={16} color="#2ee6d6" />
              <span style={{ color: '#f3f5ff', fontSize: 14, textDecoration: 'underline',
                             flex: 1 }}>{event.location}</span>
              <Icon name="chevronRight" size={14} color="#4a5278" />
            </div>
          )}
          {event.startsAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="clock" size={16} color="#7a82a5" />
              <span style={{ color: '#b8bedb', fontSize: 14 }}>{event.startsAt}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="user" size={16} color="#7a82a5" />
            <span style={{ color: '#b8bedb', fontSize: 14 }}>
              Posted by {isOwner ? 'you' : event.author}
            </span>
          </div>
          {event.description && (
            <div style={{ color: '#7a82a5', fontSize: 14, lineHeight: 1.5, marginTop: 4 }}>
              {event.description}
            </div>
          )}
        </div>

        {/* Reactions */}
        {event.reactions && (
          <ReactionBar reactions={event.reactions} myReaction={event.myReaction}
                       onAdd={e => onAddReaction?.(event.id, e)} />
        )}

        {/* Live status section (with owner controls) */}
        {isLive && event.liveStatus && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel>Status</SectionLabel>
            <div style={{ color: STATUS_COLORS[event.liveStatus], fontSize: 16, fontWeight: 700 }}>
              {STATUS_LABELS[event.liveStatus]}
            </div>
            {nextStatuses.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {nextStatuses.map(s => (
                  <div key={s} onClick={() => onUpdateLiveStatus?.(event.id, s)}
                       style={{
                         background: '#1c2440', borderRadius: 8,
                         padding: '8px 12px', cursor: 'pointer',
                       }}>
                    <span style={{ color: '#b8bedb', fontSize: 13, fontWeight: 600 }}>
                      {STATUS_LABELS[s]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RSVP buttons */}
        {!isHomeSafe && event.liveStatus !== 'ended' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel>Are you keen?</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { status: 'going', label: "I'm keen 🙋", color: '#3ff09a', bg: '#0e2a1d', border: '#1f5a3b' },
                { status: 'maybe', label: 'Maybe 🤔',    color: '#ffb547', bg: '#2a1f0a', border: '#5a4019' },
                { status: 'not_going', label: "Can't make it 🙅", color: '#8a92b8', bg: '#181d2e', border: '#2f3550' },
              ].map(opt => {
                const active = myRsvp?.status === opt.status;
                return (
                  <div key={opt.status} onClick={() => onUpdateRsvp?.(event.id, opt.status)}
                       style={{
                         border: `1px solid ${active ? opt.border : '#2a3354'}`,
                         background: active ? opt.bg : 'transparent',
                         borderRadius: 12, padding: '14px 16px',
                         textAlign: 'center', cursor: 'pointer',
                       }}>
                    <span style={{ color: active ? opt.color : '#7a82a5',
                                   fontSize: 15, fontWeight: 600 }}>{opt.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Attendance buttons */}
        {canSetAttendance && event.liveStatus !== 'ended' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel>Where are you?</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { key: 'on_the_way', label: 'On the way 🚶', color: '#ffb547', bg: '#2a1f0a', border: '#5a4019' },
                { key: 'here',        label: "I'm here 🟢",   color: '#3ff09a', bg: '#0e2a1d', border: '#1f5a3b' },
                { key: 'heading_home', label: 'Heading home 🌙', color: '#8a92b8', bg: '#181d2e', border: '#2f3550' },
              ].map(s => {
                const active = myRsvp?.attendance === s.key;
                return (
                  <div key={s.key}
                       onClick={() => onUpdateAttendance?.(event.id, active ? null : s.key)}
                       style={{
                         border: `1px solid ${active ? s.border : '#2a3354'}`,
                         background: active ? s.bg : 'transparent',
                         borderRadius: 10, padding: '8px 12px', cursor: 'pointer',
                       }}>
                    <span style={{ color: active ? s.color : '#7a82a5',
                                   fontSize: 13, fontWeight: 600 }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Attendees */}
        {(going.length > 0 || maybe.length > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionLabel>
              {going.length > 0 ? `${going.length} keen` : ''}
              {going.length > 0 && maybe.length > 0 ? '  ·  ' : ''}
              {maybe.length > 0 ? `${maybe.length} maybe` : ''}
            </SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {going.map(r => (
                <div key={r.userId} style={{
                  display: 'flex', alignItems: 'center', gap: 10, paddingBlock: 6,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: r.attendance === 'here' ? '#3ff09a' :
                                r.attendance === 'on_the_way' ? '#ffb547' :
                                r.attendance === 'heading_home' ? '#8a92b8' : '#3ff09a',
                  }} />
                  <span style={{ color: '#f3f5ff', fontSize: 14, flex: 1 }}>{r.name}</span>
                  <span style={{ color: '#7a82a5', fontSize: 13 }}>
                    {r.attendance ? ATTEND_LABELS[r.attendance] : '🙋 Keen'}
                  </span>
                </div>
              ))}
              {maybe.map(r => (
                <div key={r.userId} style={{
                  display: 'flex', alignItems: 'center', gap: 10, paddingBlock: 6,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffb547' }} />
                  <span style={{ color: '#f3f5ff', fontSize: 14, flex: 1 }}>{r.name}</span>
                  <span style={{ color: '#7a82a5', fontSize: 13 }}>🤔 Maybe</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

window.EventDetailScreen = EventDetailScreen;
