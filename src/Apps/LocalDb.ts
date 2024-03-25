import Dexie from "dexie";

let idCount = 0;
const getId = () => {
  idCount = idCount + 1;
  return `incId:${idCount}`;
};

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

export const addSession = async (initialPrompt: string) => {
  const sessionId = getId();
  await db.table(SESSIONS).add({
    title: initialPrompt,
    initialPrompt,
    id: sessionId,
    createdOn: Date.now(),
    updatedOn: Date.now(),
  });
  return sessionId;
};

export const addMessage = async (message: any, sessionId: string) => {
  const id = message.id||getId();
  message = {...message,id};
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
  return db.table(MESSAGES).update(id,update);
}

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

  return { initialPrompt, messages, codes:  codesResult?.codes||{} };
};
