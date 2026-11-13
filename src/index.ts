import PostalMime from 'postal-mime';
import {extractCode} from './code';
import {getLogger} from './log';
import {sendPushNotification} from './pushover';
import {isAllowedSender} from './sender';

export default {
  async email(message, env) {
    const log = getLogger(env);
    const {ALLOWED_SENDERS, FORWARD_TO} = env;

    log('Received email from:', message.from);
    log('Headers:', JSON.stringify([...message.headers]));

    const email = await PostalMime.parse(message.raw);

    log('Header From:', email.from?.address);

    // Check if the sender is allowed (From header domain + DMARC pass).
    if (!isAllowedSender(email, ALLOWED_SENDERS)) {
      message.setReject('Sender is not allowed.');
      log('Email is from a disallowed sender.');
      return;
    }

    log('Email is from an allowed sender');
    log('Email content:', email.text);

    // No code found: forward the email instead.
    const code = extractCode(email.text);
    if (code === null) {
      log('No code found, forwarding.');
      await message.forward(FORWARD_TO);
      return;
    }

    log('Code extracted:', code);

    const response = await sendPushNotification(code, env);

    log('Push notification response:', response.status);

    // Push failed: forward the email instead.
    if (!response.ok) {
      await message.forward(FORWARD_TO);
      log('Push notification error:', await response.text());
    }
  },
} satisfies ExportedHandler<Env>;
