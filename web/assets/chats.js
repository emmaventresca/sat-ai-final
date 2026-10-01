// ---------------------------------------------------------------------------
// Planner conversations.
//
// One chat per student, or per idea, kept until deleted - the way you would
// keep a folder per student rather than one rolling transcript. Nothing is
// cleared on reload or on starting a new chat.
//
// Stored in localStorage on the teacher's own machine. These are lesson plans
// and teaching notes, not student records: they hold no student answers, no
// scores and no identifiers beyond a name the teacher typed, so they stay
// local rather than going to the database.
// ---------------------------------------------------------------------------

const KEY = 'satai.chats';
const ACTIVE = 'satai.activeChat';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? []; }
  catch { return []; }
}

function writeAll(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export function listChats() {
  return readAll().sort((a, b) => (b.updated_at ?? 0) - (a.updated_at ?? 0));
}

export function getChat(id) {
  return readAll().find((c) => c.id === id) ?? null;
}

export function activeChatId() {
  return localStorage.getItem(ACTIVE);
}

export function setActive(id) {
  if (id) localStorage.setItem(ACTIVE, id);
  else localStorage.removeItem(ACTIVE);
}

export function newChat({ title, studentId, studentName } = {}) {
  const chat = {
    id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    title: title || 'New plan',
    studentId: studentId ?? null,
    studentName: studentName ?? null,
    messages: [],
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  writeAll([...readAll(), chat]);
  setActive(chat.id);
  return chat;
}

export function saveMessages(id, messages) {
  const all = readAll();
  const c = all.find((x) => x.id === id);
  if (!c) return null;
  c.messages = messages;
  c.updated_at = Date.now();
  // Name the chat from its first request, so the list is readable without
  // anyone having to title things.
  if (c.title === 'New plan' && messages.length) {
    const first = messages.find((m) => m.role === 'user');
    if (first) c.title = first.content.trim().replace(/\s+/g, ' ').slice(0, 54);
  }
  writeAll(all);
  return c;
}

export function renameChat(id, title) {
  const all = readAll();
  const c = all.find((x) => x.id === id);
  if (c) { c.title = String(title).slice(0, 80) || c.title; c.updated_at = Date.now(); }
  writeAll(all);
  return c;
}

export function deleteChat(id) {
  writeAll(readAll().filter((c) => c.id !== id));
  if (activeChatId() === id) setActive(null);
}

/** The chat to show on arrival: the last one used, else the newest, else none. */
export function resolveActive() {
  const id = activeChatId();
  if (id && getChat(id)) return getChat(id);
  const list = listChats();
  return list[0] ?? null;
}
