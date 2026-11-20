import { it } from 'node:test';
import assert from 'node:assert/strict';
import { PANDA_WHATSAPP_URL } from '../pandaContact';

// Every contact point (homepage, Contact Us, the "Contact support" pop-up,
// header, footer, help bubble) reads this link, so it must be the live chat
// address the business gave.
it('WhatsApp contact link is the current Panda chat address', () => {
  assert.equal(PANDA_WHATSAPP_URL, 'https://wa.me/message/I5OUGLJ7XTMOA1');
});

it('WhatsApp contact link is a plain wa.me chat link with no tracking junk', () => {
  assert.ok(PANDA_WHATSAPP_URL.startsWith('https://wa.me/message/'));
  assert.ok(!PANDA_WHATSAPP_URL.includes('?'));
});
