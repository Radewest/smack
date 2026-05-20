// ─────────────────────────────────────────────────────────────
// Smack UI kit — App shell
// Mounts everything into the iOS frame, manages navigation state.
// ─────────────────────────────────────────────────────────────

const { useState } = React;

function SmackApp() {
  const [authed,   setAuthed]   = useState(true);
  const [tab,      setTab]      = useState('home');
  const [stack,    setStack]    = useState([]); // navigation stack on top of tab
  const [showCreate, setShowCreate] = useState(false);

  // Mutable copies of mock state
  const [groups]   = useState(window.MOCK.MOCK_GROUPS);
  const [events,   setEvents]   = useState(window.MOCK.MOCK_EVENTS);

  const currentUserId = window.MOCK.CURRENT_USER_ID;

  function push(screen) { setStack([...stack, screen]); }
  function pop() { setStack(stack.slice(0, -1)); }
  const top = stack[stack.length - 1];

  // --- mutations --------------------------------------------------
  function updateRsvp(eventId, status) {
    setEvents(events.map(e => {
      if (e.id !== eventId) return e;
      const rsvps = e.rsvps.filter(r => r.userId !== currentUserId);
      const existing = e.rsvps.find(r => r.userId === currentUserId);
      if (existing && existing.status === status) return { ...e, rsvps };
      return { ...e, rsvps: [...rsvps, { userId: currentUserId, name: window.MOCK.CURRENT_USER_NAME,
                                          status, attendance: existing?.attendance ?? null }] };
    }));
  }

  function updateAttendance(eventId, attendance) {
    setEvents(events.map(e => {
      if (e.id !== eventId) return e;
      return {
        ...e,
        rsvps: e.rsvps.map(r => r.userId === currentUserId ? { ...r, attendance, status: 'going' } : r),
      };
    }));
  }

  function updateLiveStatus(eventId, liveStatus) {
    setEvents(events.map(e => e.id === eventId ? { ...e, liveStatus } : e));
  }

  function addReaction(eventId, emoji) {
    setEvents(events.map(e => {
      if (e.id !== eventId) return e;
      const reactions = { ...(e.reactions || {}) };
      const was = e.myReaction;
      if (was === emoji) {
        // remove
        const c = (reactions[emoji] || 1) - 1;
        if (c <= 0) delete reactions[emoji]; else reactions[emoji] = c;
        return { ...e, reactions, myReaction: null };
      }
      if (was) {
        const c = (reactions[was] || 1) - 1;
        if (c <= 0) delete reactions[was]; else reactions[was] = c;
      }
      reactions[emoji] = (reactions[emoji] || 0) + 1;
      return { ...e, reactions, myReaction: emoji };
    }));
  }

  // --- render ----------------------------------------------------
  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />;
  }

  // Stack screen overrides tabs
  if (top?.kind === 'group') {
    const g = top.group;
    const groupEvents = events.filter(e => e.groupId === g.id);
    return (
      <GroupDetailScreen
        group={g} events={groupEvents} currentUserId={currentUserId}
        onBack={pop}
        onSelectEvent={ev => push({ kind: 'event', event: ev })}
        onCreateEvent={() => setShowCreate(true)}
        onUpdateAttendance={updateAttendance}
        onAddReaction={addReaction}
      />
    );
  }

  if (top?.kind === 'event') {
    const ev = events.find(e => e.id === top.event.id);
    return (
      <EventDetailScreen
        event={ev} currentUserId={currentUserId}
        onBack={pop}
        onUpdateRsvp={updateRsvp}
        onUpdateAttendance={updateAttendance}
        onUpdateLiveStatus={updateLiveStatus}
        onAddReaction={addReaction}
      />
    );
  }

  // Modal: create event
  if (showCreate) {
    return <CreateEventScreen onCancel={() => setShowCreate(false)}
                              onCreate={() => setShowCreate(false)} />;
  }

  // Tabs
  let tabContent;
  if (tab === 'home') {
    tabContent = <GroupsScreen groups={groups}
                   onSelectGroup={g => push({ kind: 'group', group: g })} />;
  } else if (tab === 'calendar') {
    tabContent = <CalendarScreen events={events} />;
  } else if (tab === 'profile') {
    tabContent = <ProfileScreen profile={window.MOCK.MOCK_PROFILE}
                   onSignOut={() => setAuthed(false)} />;
  }

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {tabContent}
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}

window.SmackApp = SmackApp;
