// ─────────────────────────────────────────────────────────────
// Smack UI kit — Mock data
// All the seed state for the clickable prototype.
// ─────────────────────────────────────────────────────────────

const CURRENT_USER_ID = 'tom';
const CURRENT_USER_NAME = 'Tom';

const MOCK_GROUPS = [
  { id: 'g1', name: 'The Jellies',  emoji: '🌊', memberCount: 8,  isAdmin: true  },
  { id: 'g2', name: 'Pub Crew',     emoji: '🍻', memberCount: 5,  isAdmin: false },
  { id: 'g3', name: 'Festival 2026', emoji: '🪩', memberCount: 12, isAdmin: false },
];

const MOCK_EVENTS = [
  {
    id: 'e1', groupId: 'g1', type: 'live',
    title: 'The Crown, Shoreditch',
    location: 'The Crown, Shoreditch',
    createdBy: 'cara', author: 'Cara',
    liveStatus: 'live', createdAtAgo: '4m ago',
    reactions: { '🔥': 4, '🍻': 3, '❤️': 2 },
    myReaction: '🍻',
    rsvps: [
      { userId: 'cara', name: 'Cara',  status: 'going', attendance: 'here' },
      { userId: 'ben',  name: 'Ben',   status: 'going', attendance: 'here' },
      { userId: 'liv',  name: 'Liv',   status: 'going', attendance: 'here' },
      { userId: 'sam',  name: 'Sam',   status: 'maybe', attendance: null   },
      { userId: 'tom',  name: 'Tom',   status: 'going', attendance: 'on_the_way' },
    ],
  },
  {
    id: 'e2', groupId: 'g1', type: 'proper',
    title: 'Saturday BBQ at mine',
    location: '42 Elder Road, E8',
    description: "Bring meat or a thing. I'll do the salads. Beers in the fridge.",
    startsAt: 'Sat 16:00',
    createdBy: 'tom', author: 'Tom',
    reactions: { '🔥': 2, '🍖': 5 },
    rsvps: [
      { userId: 'cara', name: 'Cara',  status: 'going', attendance: null },
      { userId: 'ben',  name: 'Ben',   status: 'going', attendance: null },
      { userId: 'liv',  name: 'Liv',   status: 'going', attendance: null },
      { userId: 'sam',  name: 'Sam',   status: 'maybe', attendance: null },
      { userId: 'tom',  name: 'Tom',   status: 'going', attendance: null },
    ],
  },
  {
    id: 'e3', groupId: 'g1', type: 'live',
    title: '🏠 Home Safe',
    createdBy: 'liv', author: 'Liv',
    liveStatus: 'ended',
    reactions: {},
    rsvps: [],
  },
  {
    id: 'e4', groupId: 'g1', type: 'proper',
    title: 'Glastonbury 2026 prep',
    location: "Tom's flat",
    description: 'Tent inventory, drink rotas, jellyfish umbrella v3.',
    startsAt: 'Tue 27 May · 19:00',
    createdBy: 'cara', author: 'Cara',
    reactions: { '🪩': 4, '🪼': 3 },
    rsvps: [
      { userId: 'cara', name: 'Cara', status: 'going', attendance: null },
      { userId: 'ben',  name: 'Ben',  status: 'going', attendance: null },
      { userId: 'liv',  name: 'Liv',  status: 'maybe', attendance: null },
      { userId: 'tom',  name: 'Tom',  status: 'going', attendance: null },
    ],
  },
];

const MOCK_PROFILE = {
  id: CURRENT_USER_ID,
  displayName: 'Tom Radford',
  username: 'tomr',
  bio: 'jellyfish enjoyer · the jellies admin',
  email: 'tom@thejellies.co',
};

window.MOCK = { CURRENT_USER_ID, CURRENT_USER_NAME, MOCK_GROUPS, MOCK_EVENTS, MOCK_PROFILE };
