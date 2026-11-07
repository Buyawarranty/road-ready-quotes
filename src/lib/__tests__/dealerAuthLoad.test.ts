import { it } from 'node:test';
import assert from 'node:assert/strict';
import { boundedDealerAuth, DEALER_AUTH_TIMEOUT_MS } from '../dealerAuthLoad';

it('loads a dealer successfully', async () => assert.deepEqual(await boundedDealerAuth(Promise.resolve({ id: 'kam', status: 'active' })), { id: 'kam', status: 'active' }));
it('settles a rejected profile lookup', async () => assert.rejects(boundedDealerAuth(Promise.reject(new Error('Profile request failed'))), /Profile request failed/));
it('settles a rejected session lookup', async () => assert.rejects(boundedDealerAuth(Promise.reject(new Error('Session request failed'))), /Session request failed/));
it('times out a request that never settles', async () => assert.rejects(boundedDealerAuth(new Promise(() => {}), 10), /taking longer/));
it('permits 15 seconds before offering retry', () => assert.equal(DEALER_AUTH_TIMEOUT_MS, 15000));