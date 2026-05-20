// ─────────────────────────────────────────────────────────────
// Smack UI kit — Calendar screen
// ─────────────────────────────────────────────────────────────

function CalendarScreen({ events }) {
  const [selectedDate, setSelectedDate] = React.useState(20); // May 20

  // Map "May 24" → events. Mock — just spread events across the month.
  const eventDates = { 20: 1, 23: 1, 24: 1, 27: 1 };

  const monthName = 'May 2026';
  const startDay = 5; // Friday — May 1, 2026 is a Friday
  const daysInMonth = 31;

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayEvents = events.filter(e =>
    e.startsAt && (
      (selectedDate === 23 && e.startsAt.startsWith('Sat')) ||
      (selectedDate === 27 && e.startsAt.startsWith('Tue 27'))
    )
  );

  return (
    <div style={{ flex: 1, background: '#080b14', height: '100%',
                  display: 'flex', flexDirection: 'column', paddingBottom: 90 }}>
      <ScreenTitle>Calendar</ScreenTitle>

      <div style={{ paddingInline: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: 16 }}>
          <Icon name="chevronLeft" size={20} color="#2ee6d6" />
          <div style={{ color: '#f3f5ff', fontSize: 17, fontWeight: 700 }}>{monthName}</div>
          <Icon name="chevronRight" size={20} color="#2ee6d6" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                      textAlign: 'center', marginBottom: 6 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} style={{ color: '#4a5278', fontSize: 11, fontWeight: 600 }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: 2, rowGap: 4 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const isSelected = d === selectedDate;
            const isToday = d === 20;
            const hasEvent = eventDates[d];
            return (
              <div key={i} onClick={() => setSelectedDate(d)}
                   style={{
                     aspectRatio: '1', display: 'flex', flexDirection: 'column',
                     alignItems: 'center', justifyContent: 'center',
                     borderRadius: 8, cursor: 'pointer',
                     background: isSelected ? '#2ee6d6' : 'transparent',
                     boxShadow: isSelected ? '0 0 16px #2ee6d655' : 'none',
                   }}>
                <span style={{
                  color: isSelected ? '#04060c' :
                         isToday ? '#2ee6d6' : '#f3f5ff',
                  fontSize: 14, fontWeight: isToday || isSelected ? 700 : 500,
                }}>{d}</span>
                {hasEvent && !isSelected && (
                  <div style={{ width: 4, height: 4, borderRadius: '50%',
                                background: '#2ee6d6', marginTop: 2 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ paddingInline: 20, paddingTop: 20, paddingBottom: 8 }}>
        <SectionLabel>
          {selectedDate === 20 ? 'Today · Tuesday' :
           selectedDate === 23 ? 'Saturday 23 May' :
           selectedDate === 27 ? 'Tuesday 27 May' :
           `${selectedDate} May`}
        </SectionLabel>
      </div>

      <div style={{ overflow: 'auto', paddingInline: 16, flex: 1 }}>
        {dayEvents.length > 0 ? dayEvents.map(e => (
          <div key={e.id} style={{
            background: '#0d1220', border: '1px solid #2a3354',
            borderRadius: 12, padding: 14, marginBottom: 8,
          }}>
            <div style={{ color: '#f3f5ff', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              {e.title}
            </div>
            {e.location && (
              <div style={{ color: '#7a82a5', fontSize: 13 }}>📍 {e.location}</div>
            )}
            <div style={{ color: '#7a82a5', fontSize: 13, marginTop: 2 }}>🕐 {e.startsAt}</div>
          </div>
        )) : (
          <div style={{ color: '#4a5278', textAlign: 'center', marginTop: 24, fontSize: 14 }}>
            Nothing on this day.
          </div>
        )}
      </div>
    </div>
  );
}

window.CalendarScreen = CalendarScreen;
