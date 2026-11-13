export type Logger = (...args: unknown[]) => void;

/** Returns a console logger when DEBUG is on, otherwise a no-op. */
export function getLogger(env: Pick<Env, 'DEBUG'>): Logger {
  return env.DEBUG ? console.log : () => {};
}
