import mongoose from 'mongoose';

let transactionSupport;

async function supportsTransactions() {
  if (transactionSupport !== undefined) return transactionSupport;

  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  transactionSupport = Boolean(hello.setName || hello.msg === 'isdbgrid');
  return transactionSupport;
}

export async function runAtomic(work) {
  if (!(await supportsTransactions())) return work(null);

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export function useSession(query, session) {
  return session ? query.session(session) : query;
}

export function sessionOptions(session, options = {}) {
  return session ? { ...options, session } : options;
}
