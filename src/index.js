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
 * Checks an address against the ALLOWED_SENDERS entries:
 *   "user@example.com" -> exactly that address
 *   "@example.com"     -> any address at example.com or its subdomains
 */
function is_allowed_address(address, allowed_senders) {
  const domain = address.split('@').pop();
  return allowed_senders.some(entry => {
    const allowed = entry.trim().toLowerCase();
    if (!allowed.startsWith('@')) {
      return address === allowed;
    }
    const allowed_domain = allowed.slice(1);
    return domain === allowed_domain || domain.endsWith('.' + allowed_domain);
  });
}

/**
 * Checks that the email's From header is allowed and that the receiving MX
 * (Cloudflare Email Routing) verified it with DMARC. Works for any sender
 * whose domain publishes DMARC; senders without DMARC are rejected, since
 * their From header cannot be trusted.
 *
 * Only the topmost Authentication-Results header is trusted: it is the one
 * prepended by Cloudflare's MX on receipt. Any further ones came with the
 * message and could be forged. postal-mime keeps headers in document order.
 */
function is_allowed_sender(email, allowed_senders) {
  const from_address = (email.from?.address || '').toLowerCase();
  const from_domain = from_address.split('@').pop();
  if (!from_address.includes('@') || !is_allowed_address(from_address, allowed_senders)) {
    return false;
  }

  const auth = email.headers.find(h => h.key === 'authentication-results');
  if (!auth || !/^\s*mx\.cloudflare\.net\s*;/i.test(auth.value)) {
    return false;
  }

  const dmarc = auth.value.match(/\bdmarc=(\w+)[^;]*?\bheader\.from=([^\s;]+)/i);
  return Boolean(dmarc)
    && dmarc[1].toLowerCase() === 'pass'
    && dmarc[2].toLowerCase() === from_domain;
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

    log("Received email from:", message.from);
    log("Headers:", JSON.stringify([...message.headers]));

    // Parse the email content.
    const email = await PostalMime.parse(message.raw);

    log("Header From:", email.from?.address);

    // Check if the sender is allowed (From header domain + DMARC pass).
    if (!is_allowed_sender(email, ALLOWED_SENDERS)) {
      message.setReject("Sender is not allowed.");
      log("Email is from a disallowed sender.");
      return;
    }

    log("Email is from an allowed sender");

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
