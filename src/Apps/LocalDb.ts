import Dexie from "dexie";
import { nanoid } from "nanoid";
import TimeAgo from "javascript-time-ago";

// English.
import en from "javascript-time-ago/locale/en";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

const DB_NAME = "CodeChatLocalStore";
const SESSIONS = "sessions";
const MESSAGES = "messages";
const CODES = "codes";

const db = new Dexie(DB_NAME);

db.version(1).stores({
  [SESSIONS]: `
    id,
    title,
    updatedOn
    `,
  [MESSAGES]: `
      ++,
      id,
      sessionId`,
  [CODES]: `
    sessionId
  `,
});

export const SESSION_ID_KEY = "CHAT_CODE_SESSION_ID";

export const deleteSession = async (sessionId: string) => {
  await db.table(SESSIONS).delete(sessionId);
  await db.table(MESSAGES).where("sessionId").equals(sessionId).delete();
  await db.table(CODES).delete(sessionId);
}

export const addSession = async (initialPrompt: string) => {
  const sessionId = nanoid();
  await db.table(SESSIONS).add({
    title: initialPrompt,
    initialPrompt,
    id: sessionId,
    createdOn: Date.now(),
    updatedOn: Date.now(),
  });
  return sessionId;
};

export const getSessions = async () => {
  const sessionRows = await db
    .table(SESSIONS)
    .orderBy("updatedOn")
    .reverse()
    .toArray();
  return sessionRows.map(({ title, id, updatedOn }) => ({
    title,
    id,
    updatedOn,
    when: timeAgo.format(new Date(updatedOn)),
  }));
};

export const addMessage = async (message: any, sessionId: string) => {
  const id = message.id || nanoid();
  message = { ...message, id };
  return Promise.all([
    db.table(MESSAGES).add({ ...message, sessionId, createdOn: Date.now() }),
    db.table(SESSIONS).update(sessionId, { updatedOn: Date.now() }),
  ]);
};

export const setCodesForSession = async (
  codes: Record<string, string>,
  sessionId: string
) => {
  return db.table(CODES).put({ sessionId, codes });
};

export const updateMessage = (id: string, update: any) => {
  return db
    .table(MESSAGES)
    .where("id")
    .equals(id)
    .modify((obj) => {
      Object.assign(obj, update);
    });
};

// export const addMessages = async (messages: any[], sessionId: string) => {
//   return Promise.all([
//     db.table(MESSAGES).bulkAdd(
//       messages.map((message) => ({
//         ...message,
//         sessionId,
//         createdOn: Date.now(),
//       }))
//     ),
//     db.table(SESSIONS).update(sessionId, { updatedOn: Date.now() }),
//   ]);
// };

export const getSession = async (sessionId: string) => {
  const [sessionResult, codesResult] = await Promise.all([
    db.table(SESSIONS).get(sessionId),
    db.table(CODES).get(sessionId),
  ]);
  if (!sessionResult) {
    return null;
  }

  const { initialPrompt } = sessionResult;
  const messageFromDb = await db
    .table(MESSAGES)
    .where("sessionId")
    .equals(sessionId)
    .toArray();

  const messages = messageFromDb.map(
    ({ sessionId, createdOn, ...message }) => message
  );

  console.log("codes", codesResult);

  return { initialPrompt, messages, codes: codesResult?.codes || {} };
};

(window as any).__db = db;
