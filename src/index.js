import PostalMime from 'postal-mime';

/**
 * Extracts the code from the email content.
 * Code is a sequence of 6-12 digits. 
 */
function extract_code(text) {
  const pattern = /\b\d{6,12}\b/;
  const match = text.match(pattern);

  if (match && match[0]) {
    return match[0];
  } else {
    throw new Error('Code not found in the email content.');
  }
}

/**
 * Sends a push notification with the code.
 */
function send_push_notification(code, env) {
  const log = get_logger(env);
  const {PUSHOVER_URL, PUSHOVER_TOKEN, PUSHOVER_USER, PUSHOVER_TTL} = env;
  
  const body = {
    token: PUSHOVER_TOKEN,
    user: PUSHOVER_USER,
    ttl: PUSHOVER_TTL,
    message: `Code: ${code}`,
    title: "Auth Code",
  }

  log("Sending push notification:", body);

  return fetch(PUSHOVER_URL, {
    body: JSON.stringify(body),
    method: "POST",
    headers: {"content-type": "application/json;charset=UTF-8"},
  });
}

/**
 * Returns a logger function based on the DEBUG environment variable. 
 */
function get_logger(env) {
  return env.DEBUG ? console.log : () => {};
}

/**
 * (Main) Email worker. 
 */
export default {
  async email(message, env, ctx) {
    const log = get_logger(env);
    const {ALLOWED_SENDERS, FORWARD_TO} = env;

    log(env);
    log("Received email from:", message.from);

    // Check if the sender is allowed.
    if (!ALLOWED_SENDERS.some(sender => message.from.endsWith(sender))) {
      message.setReject("Sender is not allowed.");  
      log("Email is from a disallowed sender.");
      return;
    }

    log("Email is from an allowed sender");

    // Parse the email content.
    const email = await PostalMime.parse(message.raw);

    log("Email content:", email.text);

    // Try to extract the code from the email content.
    // If the code is not found, forward the email to the specified address.
    let code;
    try {
      code = extract_code(email.text);
    }	catch (e) {
      await message.forward(FORWARD_TO);
      return;
    }

    log("Code extracted:", code);
    
    // Send a push notification with the code.
    const response = await send_push_notification(code, env);

    log("Push notification response:", response.status);

    // If the push notification was not successful, forward the email to the specified address.
    if (!response.ok) {
      await message.forward(FORWARD_TO);
      const pushover_error = await response.text();
      log("Push notification error:", pushover_error);
    }
  }
}
