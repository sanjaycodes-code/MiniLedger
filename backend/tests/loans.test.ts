import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, auth, loginAs, relativeDateString, resetDb } from './helpers';

describe('Loans API (/api/v1/loans)', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates a loan (201) and derives open status when due today or in the future', async () => {
    const { token } = await loginAs('+919111111111');
    const dueToday = relativeDateString(0);

    const res = await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: '  Rahul Kumar  ',
        amountMinor: 250000,
        dueDate: dueToday,
      });

    expect(res.status).toBe(201);
    expect(res.body.loan).toMatchObject({
      friendName: 'Rahul Kumar',
      amountMinor: 250000,
      dueDate: dueToday,
      status: 'open',
      repaidAt: null,
      hasReceipt: false,
    });
  });

  it('rejects whitespace-only friendName with 400 VALIDATION_ERROR', async () => {
    const { token } = await loginAs('+919111111112');

    const res = await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: '    ',
        amountMinor: 10000,
        dueDate: relativeDateString(5),
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details?.[0]?.field).toBe('friendName');
  });

  it('rejects amountMinor <= 0 with 400 VALIDATION_ERROR', async () => {
    const { token } = await loginAs('+919111111113');

    const res = await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Amit',
        amountMinor: 0,
        dueDate: relativeDateString(5),
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details?.[0]?.field).toBe('amountMinor');
  });

  it('rejects non-integer amountMinor (12.5) with 400 VALIDATION_ERROR', async () => {
    const { token } = await loginAs('+919111111114');

    const res = await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Amit',
        amountMinor: 12.5,
        dueDate: relativeDateString(5),
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details?.[0]?.field).toBe('amountMinor');
  });

  it('rejects invalid calendar dates (2026-02-31 and pre-2000) with 400 VALIDATION_ERROR', async () => {
    const { token } = await loginAs('+919111111115');

    const feb31 = await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Amit',
        amountMinor: 5000,
        dueDate: '2026-02-31',
      });
    expect(feb31.status).toBe(400);
    expect(feb31.body.error.details?.[0]?.field).toBe('dueDate');

    const pre2000 = await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Amit',
        amountMinor: 5000,
        dueDate: '1999-12-31',
      });
    expect(pre2000.status).toBe(400);
    expect(pre2000.body.error.details?.[0]?.field).toBe('dueDate');
  });

  it('rejects unknown extra fields on POST /loans with 400 VALIDATION_ERROR', async () => {
    const { token } = await loginAs('+919111111116');

    const res = await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Amit',
        amountMinor: 5000,
        dueDate: relativeDateString(5),
        extraField: 'not-allowed',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('filters loans by status (all, open, overdue, repaid)', async () => {
    const { token } = await loginAs('+919111111117');

    // 1. Open (due today)
    await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Open Today',
        amountMinor: 10000,
        dueDate: relativeDateString(0),
      });

    // 2. Overdue (due -5 days)
    await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Overdue Friend',
        amountMinor: 20000,
        dueDate: relativeDateString(-5),
      });

    // 3. Repaid (created due -2 days, then repaid)
    const toRepay = await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Repaid Friend',
        amountMinor: 30000,
        dueDate: relativeDateString(-2),
      });
    await request(app)
      .post(`/api/v1/loans/${toRepay.body.loan.id}/repay`)
      .set(auth(token));

    const allRes = await request(app).get('/api/v1/loans').set(auth(token));
    expect(allRes.status).toBe(200);
    expect(allRes.body.loans).toHaveLength(3);

    const openRes = await request(app)
      .get('/api/v1/loans?status=open')
      .set(auth(token));
    expect(openRes.status).toBe(200);
    expect(openRes.body.loans).toHaveLength(1);
    expect(openRes.body.loans[0].friendName).toBe('Open Today');

    const overdueRes = await request(app)
      .get('/api/v1/loans?status=overdue')
      .set(auth(token));
    expect(overdueRes.status).toBe(200);
    expect(overdueRes.body.loans).toHaveLength(1);
    expect(overdueRes.body.loans[0].friendName).toBe('Overdue Friend');

    const repaidRes = await request(app)
      .get('/api/v1/loans?status=repaid')
      .set(auth(token));
    expect(repaidRes.status).toBe(200);
    expect(repaidRes.body.loans).toHaveLength(1);
    expect(repaidRes.body.loans[0].friendName).toBe('Repaid Friend');
  });

  it('orders loans by dueDate ascending then createdAt ascending', async () => {
    const { token } = await loginAs('+919111111118');

    await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Later Due',
        amountMinor: 10000,
        dueDate: relativeDateString(10),
      });

    await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Earlier Due 1',
        amountMinor: 10000,
        dueDate: relativeDateString(2),
      });

    await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Earlier Due 2',
        amountMinor: 10000,
        dueDate: relativeDateString(2),
      });

    const res = await request(app).get('/api/v1/loans').set(auth(token));
    expect(res.status).toBe(200);
    const names = (res.body.loans as Array<{ friendName: string }>).map(
      (l) => l.friendName,
    );
    expect(names).toEqual(['Earlier Due 1', 'Earlier Due 2', 'Later Due']);
  });

  it('fetches a single loan by id (GET /loans/:id)', async () => {
    const { token } = await loginAs('+919111111119');

    const created = await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Kiran',
        amountMinor: 75000,
        dueDate: relativeDateString(7),
      });

    const loanId = created.body.loan.id as string;
    const fetched = await request(app)
      .get(`/api/v1/loans/${loanId}`)
      .set(auth(token));

    expect(fetched.status).toBe(200);
    expect(fetched.body.loan.id).toBe(loanId);
    expect(fetched.body.loan.friendName).toBe('Kiran');
  });

  it('returns 404 NOT_FOUND for an unknown loan UUID', async () => {
    const { token } = await loginAs('+919111111120');

    const res = await request(app)
      .get('/api/v1/loans/00000000-0000-0000-0000-000000000000')
      .set(auth(token));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 NOT_FOUND when accessing another user’s loan', async () => {
    const userA = await loginAs('+919111111121');
    const userB = await loginAs('+919111111122');

    const created = await request(app)
      .post('/api/v1/loans')
      .set(auth(userA.token))
      .send({
        friendName: 'Secret Friend',
        amountMinor: 50000,
        dueDate: relativeDateString(3),
      });

    const loanId = created.body.loan.id as string;

    const getRes = await request(app)
      .get(`/api/v1/loans/${loanId}`)
      .set(auth(userB.token));
    expect(getRes.status).toBe(404);
    expect(getRes.body.error.code).toBe('NOT_FOUND');

    const repayRes = await request(app)
      .post(`/api/v1/loans/${loanId}/repay`)
      .set(auth(userB.token));
    expect(repayRes.status).toBe(404);
  });

  it('marks a loan repaid (200) and returns 409 ALREADY_REPAID on second repay', async () => {
    const { token } = await loginAs('+919111111123');

    const created = await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Deepak',
        amountMinor: 40000,
        dueDate: relativeDateString(4),
      });
    const loanId = created.body.loan.id as string;

    const firstRepay = await request(app)
      .post(`/api/v1/loans/${loanId}/repay`)
      .set(auth(token));
    expect(firstRepay.status).toBe(200);
    expect(firstRepay.body.loan.status).toBe('repaid');
    expect(firstRepay.body.loan.repaidAt).not.toBeNull();

    const secondRepay = await request(app)
      .post(`/api/v1/loans/${loanId}/repay`)
      .set(auth(token));
    expect(secondRepay.status).toBe(409);
    expect(secondRepay.body.error.code).toBe('ALREADY_REPAID');
  });

  it('returns 401 UNAUTHORIZED when calling loan endpoints without a token', async () => {
    const listRes = await request(app).get('/api/v1/loans');
    expect(listRes.status).toBe(401);
    expect(listRes.body.error.code).toBe('UNAUTHORIZED');

    const createRes = await request(app).post('/api/v1/loans').send({
      friendName: 'NoAuth',
      amountMinor: 100,
      dueDate: relativeDateString(1),
    });
    expect(createRes.status).toBe(401);
  });
});
