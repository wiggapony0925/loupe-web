import { describe, expect, it } from 'vitest';
import { htmlToText, normalizeMerchant, parseAlertEmail, parseDateLoose } from './emailParser';

const received = new Date(Date.UTC(2026, 7, 16, 15, 0, 0)); // Aug 16 2026

describe('parseAlertEmail — Amex', () => {
  it('parses the sentence-form charge alert', () => {
    const result = parseAlertEmail({
      from: 'AmericanExpress@welcome.americanexpress.com',
      subject: 'Large Purchase Approved',
      text: 'A charge of $1,234.56 at DELTA AIR LINES was approved on your Card ending in 91002 on August 15, 2026.',
      receivedAt: received,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alert.provider).toBe('AMEX');
    expect(result.alert.amountCents).toBe(123_456);
    expect(result.alert.merchantNormalized).toBe('DELTA AIR LINES');
    expect(result.alert.cardLast4).toBe('91002');
    expect(result.alert.date.toISOString().slice(0, 10)).toBe('2026-08-15');
    expect(result.alert.applePayDevice).toBeNull();
  });

  it('parses labeled-field alerts', () => {
    const result = parseAlertEmail({
      from: 'alerts@aexp.com',
      subject: 'Purchase alert',
      text: 'Merchant: UBER EATS\nAmount: $34.20\nDate: Aug 12, 2026\nCard Ending: 1005',
      receivedAt: received,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alert.amountCents).toBe(3_420);
    expect(result.alert.merchantNormalized).toBe('UBER EATS');
    expect(result.alert.cardLast4).toBe('1005');
    expect(result.alert.date.toISOString().slice(0, 10)).toBe('2026-08-12');
  });

  it('negates credits', () => {
    const result = parseAlertEmail({
      from: 'alerts@americanexpress.com',
      subject: 'Credit posted',
      text: 'A credit of $50.00 at NIKE.COM was applied to your Card ending in 91002.',
      receivedAt: received,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alert.amountCents).toBe(-5_000);
  });

  it('strips store numbers from the normalized merchant', () => {
    const result = parseAlertEmail({
      from: 'alerts@americanexpress.com',
      subject: 'Charge',
      text: 'A charge of $6.75 at STARBUCKS #0921 was approved on your Card ending in 91002.',
      receivedAt: received,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alert.merchantNormalized).toBe('STARBUCKS');
  });
});

describe('parseAlertEmail — Chase', () => {
  it('parses "You made a … transaction with" alerts', () => {
    const result = parseAlertEmail({
      from: 'no.reply.alerts@chase.com',
      subject: 'Your $12.34 transaction with DOORDASH*SUBWAY',
      text: 'You made a $12.34 transaction with DOORDASH*SUBWAY on your card ending in 1234 on Aug 14, 2026.',
      receivedAt: received,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alert.provider).toBe('CHASE');
    expect(result.alert.amountCents).toBe(1_234);
    expect(result.alert.cardLast4).toBe('1234');
    expect(result.alert.applePayDevice).toBeNull();
  });

  it('extracts the Apple Pay device name', () => {
    const result = parseAlertEmail({
      from: 'no.reply.alerts@chase.com',
      subject: 'Transaction alert',
      text: "A $25.00 transaction with LYFT using Apple Pay on Nicol's iPhone was approved on your card ending in 1234.",
      receivedAt: received,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alert.applePayDevice).toBe("Nicol's iPhone");
    expect(result.alert.merchantNormalized).toBe('LYFT');
  });

  it('parses HTML bodies', () => {
    const result = parseAlertEmail({
      from: 'no.reply.alerts@chase.com',
      subject: 'Transaction alert',
      html: '<html><body><table><tr><td>You made a</td><td>$89.00</td><td>transaction with</td><td>WHOLEFDS #10203</td></tr></table><p>Account ending in (...4321)</p></body></html>',
      receivedAt: received,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alert.amountCents).toBe(8_900);
    expect(result.alert.cardLast4).toBe('4321');
  });
});

describe('parseAlertEmail — guards', () => {
  it('ignores payment notifications', () => {
    const result = parseAlertEmail({
      from: 'alerts@chase.com',
      subject: 'Payment received',
      text: 'Your payment of $500.00 was received. Thank you.',
      receivedAt: received,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('payment_notification');
  });

  it('ignores declined transactions', () => {
    const result = parseAlertEmail({
      from: 'alerts@chase.com',
      subject: 'Declined transaction',
      text: 'A $45.00 transaction with UBER was declined on your card ending in 1234.',
      receivedAt: received,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('declined');
  });

  it('rejects unknown senders', () => {
    const result = parseAlertEmail({
      from: 'spam@example.com',
      subject: 'You made a transaction',
      text: 'You made a $999.99 transaction with FAKE MERCHANT.',
      receivedAt: received,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unknown_provider');
  });
});

describe('helpers', () => {
  it('normalizeMerchant strips processor prefixes', () => {
    expect(normalizeMerchant('SQ *BLUE BOTTLE COFFEE')).toBe('BLUE BOTTLE COFFEE');
    expect(normalizeMerchant('TST* JOES PIZZA #42')).toBe('JOES PIZZA');
  });

  it('parseDateLoose pins dates to UTC noon', () => {
    const date = parseDateLoose('8/12/2026');
    expect(date?.toISOString()).toBe('2026-08-12T12:00:00.000Z');
    expect(parseDateLoose('2026-08-12')?.toISOString().slice(0, 10)).toBe('2026-08-12');
    expect(parseDateLoose('not a date')).toBeNull();
  });

  it('htmlToText decodes entities and drops tags', () => {
    expect(htmlToText('<p>A&nbsp;charge of <b>$5.00</b> at CAF&#233;</p>')).toContain('A charge of $5.00');
  });
});
