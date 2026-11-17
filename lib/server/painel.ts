import "server-only";

/** O painel só funciona com a conta de serviço do Firebase configurada. */
export function firebaseConfigurado() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT?.trim());
}
