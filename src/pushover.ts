export type PushoverEnv = Pick<
  Env,
  'PUSHOVER_URL' | 'PUSHOVER_TOKEN' | 'PUSHOVER_USER' | 'PUSHOVER_TTL'
>;

/** Sends the code as a Pushover notification. */
export function sendPushNotification(
  code: string,
  env: PushoverEnv,
): Promise<Response> {
  const body = {
    token: env.PUSHOVER_TOKEN,
    user: env.PUSHOVER_USER,
    ttl: env.PUSHOVER_TTL,
    message: `Code: ${code}`,
    title: 'Auth Code',
  };

  console.log('Sending push notification:', body);

  return fetch(env.PUSHOVER_URL, {
    body: JSON.stringify(body),
    method: 'POST',
    headers: {'content-type': 'application/json;charset=UTF-8'},
  });
}
