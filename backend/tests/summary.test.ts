import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, auth, loginAs, relativeDateString, resetDb } from './helpers';

describe('Summary API (/api/v1/summary)', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('returns all zeros for a newly created user with no loans', async () => {
    const { token } = await loginAs('+919222222221');

    const res = await request(app)
      .get('/api/v1/summary')
      .set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalLentMinor: 0,
      totalRepaidMinor: 0,
      outstandingMinor: 0,
      overdueMinor: 0,
      counts: {
        total: 0,
        open: 0,
        repaid: 0,
        overdue: 0,
      },
    });
  });

  it('computes exact totals and counts for mixed open, overdue, and repaid loans', async () => {
    const { token } = await loginAs('+919222222222');

    // Open: 100000 + 250000 = 350000 (due today and +10 days)
    await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Open 1',
        amountMinor: 100000,
        dueDate: relativeDateString(0),
      });
    await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Open 2',
        amountMinor: 250000,
        dueDate: relativeDateString(10),
      });

    // Overdue: 150000 + 50000 = 200000 (due -1 and -7 days)
    await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Overdue 1',
        amountMinor: 150000,
        dueDate: relativeDateString(-1),
      });
    await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Overdue 2',
        amountMinor: 50000,
        dueDate: relativeDateString(-7),
      });

    // Repaid: 80000
    const repaidLoan = await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Repaid 1',
        amountMinor: 80000,
        dueDate: relativeDateString(-3),
      });
    await request(app)
      .post(`/api/v1/loans/${repaidLoan.body.loan.id}/repay`)
      .set(auth(token));

    const res = await request(app)
      .get('/api/v1/summary')
      .set(auth(token));

    // Hand-computed expected values:
    // totalLentMinor = 100000 + 250000 + 150000 + 50000 + 80000 = 630000
    // totalRepaidMinor = 80000
    // outstandingMinor = 630000 - 80000 = 550000
    // overdueMinor = 150000 + 50000 = 200000
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalLentMinor: 630000,
      totalRepaidMinor: 80000,
      outstandingMinor: 550000,
      overdueMinor: 200000,
      counts: {
        total: 5,
        open: 2,
        repaid: 1,
        overdue: 2,
      },
    });
  });

  it('updates overdueMinor, outstandingMinor, and totalRepaidMinor when a loan is repaid', async () => {
    const { token } = await loginAs('+919222222223');

    const created = await request(app)
      .post('/api/v1/loans')
      .set(auth(token))
      .send({
        friendName: 'Past Due',
        amountMinor: 90000,
        dueDate: relativeDateString(-4),
      });
    const loanId = created.body.loan.id as string;

    const beforeRepay = await request(app)
      .get('/api/v1/summary')
      .set(auth(token));
    expect(beforeRepay.body).toEqual({
      totalLentMinor: 90000,
      totalRepaidMinor: 0,
      outstandingMinor: 90000,
      overdueMinor: 90000,
      counts: { total: 1, open: 0, repaid: 0, overdue: 1 },
    });

    await request(app)
      .post(`/api/v1/loans/${loanId}/repay`)
      .set(auth(token));

    const afterRepay = await request(app)
      .get('/api/v1/summary')
      .set(auth(token));
    expect(afterRepay.body).toEqual({
      totalLentMinor: 90000,
      totalRepaidMinor: 90000,
      outstandingMinor: 0,
      overdueMinor: 0,
      counts: { total: 1, open: 0, repaid: 1, overdue: 0 },
    });
  });

  it('isolates summary totals per user', async () => {
    const userA = await loginAs('+919222222224');
    const userB = await loginAs('+919222222225');

    await request(app)
      .post('/api/v1/loans')
      .set(auth(userA.token))
      .send({
        friendName: 'User A Friend',
        amountMinor: 500000,
        dueDate: relativeDateString(5),
      });

    const userBSummary = await request(app)
      .get('/api/v1/summary')
      .set(auth(userB.token));

    expect(userBSummary.status).toBe(200);
    expect(userBSummary.body.totalLentMinor).toBe(0);
    expect(userBSummary.body.counts.total).toBe(0);
  });
});
