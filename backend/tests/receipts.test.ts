import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getUploadRootDir } from '../src/modules/loans/receipts';
import { app, auth, loginAs, relativeDateString, resetDb } from './helpers';

// 1x1 transparent PNG (67 bytes, starts with 89 50 4E 47 0D 0A 1A 0A)
const TINY_PNG_BUFFER = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
  'hex',
);

describe('Loan Receipts API (/api/v1/loans/:id/receipt)', () => {
  beforeEach(async () => {
    await resetDb();
    await fs.promises.rm(getUploadRootDir(), { recursive: true, force: true });
  });

  afterAll(async () => {
    await fs.promises.rm(getUploadRootDir(), { recursive: true, force: true });
  });

  it('uploads a PNG receipt (hasReceipt=true), serves it via GET, and replaces old file on re-upload', async () => {
    const { token, userId } = await loginAs('+919333333331');

    const created = await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Receipt Friend',
        amountMinor: 100000,
        dueDate: relativeDateString(5),
      });
    const loanId = created.body.loan.id as string;

    const upload1 = await request(app)
      .post(`/api/v1/loans/${loanId}/receipt`)
      .set(auth(token))
      .attach('receipt', TINY_PNG_BUFFER, {
        filename: 'receipt1.png',
        contentType: 'image/png',
      });

    expect(upload1.status).toBe(200);
    expect(upload1.body.loan.hasReceipt).toBe(true);

    const getRes = await request(app)
      .get(`/api/v1/loans/${loanId}/receipt`)
      .set(auth(token))
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(getRes.status).toBe(200);
    expect(getRes.headers['content-type']).toContain('image/png');
    expect(getRes.headers['cache-control']).toBe('private, max-age=3600');
    expect(Buffer.compare(getRes.body as Buffer, TINY_PNG_BUFFER)).toBe(0);

    // Upload a second receipt and verify the first file is replaced on disk
    const upload2 = await request(app)
      .post(`/api/v1/loans/${loanId}/receipt`)
      .set(auth(token))
      .attach('receipt', TINY_PNG_BUFFER, {
        filename: 'receipt2.png',
        contentType: 'image/png',
      });
    expect(upload2.status).toBe(200);

    const userUploadDir = path.join(getUploadRootDir(), userId);
    const filesOnDisk = await fs.promises.readdir(userUploadDir);
    expect(filesOnDisk).toHaveLength(1);
  });

  it('rejects unsupported MIME types and spoofed magic bytes with 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    const { token } = await loginAs('+919333333332');

    const created = await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Wrong Type Friend',
        amountMinor: 50000,
        dueDate: relativeDateString(3),
      });
    const loanId = created.body.loan.id as string;

    const txtRes = await request(app)
      .post(`/api/v1/loans/${loanId}/receipt`)
      .set(auth(token))
      .attach('receipt', Buffer.from('just some plain text'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(txtRes.status).toBe(415);
    expect(txtRes.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');

    const spoofedJpgRes = await request(app)
      .post(`/api/v1/loans/${loanId}/receipt`)
      .set(auth(token))
      .attach('receipt', Buffer.from('not really a jpeg image'), {
        filename: 'fake.jpg',
        contentType: 'image/jpeg',
      });

    expect(spoofedJpgRes.status).toBe(415);
    expect(spoofedJpgRes.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects files larger than 5MB with 413 FILE_TOO_LARGE', async () => {
    const { token } = await loginAs('+919333333333');

    const created = await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Big File Friend',
        amountMinor: 50000,
        dueDate: relativeDateString(3),
      });
    const loanId = created.body.loan.id as string;

    const overFiveMb = Buffer.alloc(5 * 1024 * 1024 + 1024, 0xff);

    const res = await request(app)
      .post(`/api/v1/loans/${loanId}/receipt`)
      .set(auth(token))
      .attach('receipt', overFiveMb, {
        filename: 'huge.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('returns 404 NOT_FOUND for another user’s loan without writing anything to disk', async () => {
    const owner = await loginAs('+919333333334');
    const attacker = await loginAs('+919333333335');

    const created = await request(app)
      .post('/api/v1/loans')
      .set(auth(owner.token))
      .send({
        friendName: 'Owner Loan',
        amountMinor: 50000,
        dueDate: relativeDateString(3),
      });
    const loanId = created.body.loan.id as string;

    const res = await request(app)
      .post(`/api/v1/loans/${loanId}/receipt`)
      .set(auth(attacker.token))
      .attach('receipt', TINY_PNG_BUFFER, {
        filename: 'attacker.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(fs.existsSync(getUploadRootDir())).toBe(false);
  });
});
