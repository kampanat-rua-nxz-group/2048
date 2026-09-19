import { describe, expect, it } from 'vitest';
import { contrastRatio, tileColors } from './palette';

describe('tileColors', () => {
  it('uses the dark ink on light tiles and the light ink on dark tiles', () => {
    expect(tileColors(2)).toEqual({ body: '#E8E1CF', ink: '#2E3A33' });
    expect(tileColors(2048)).toEqual({ body: '#6E1F2E', ink: '#F2EEE3' });
  });

  it('uses the super colors above 2048', () => {
    expect(tileColors(4096)).toEqual(tileColors(1 << 20));
    expect(tileColors(4096).body).toBe('#2A1418');
  });

  it.each([2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096])(
    'keeps numeral contrast at 3:1 or better for %i',
    (value) => {
      const { body, ink } = tileColors(value);
      expect(contrastRatio(body, ink)).toBeGreaterThanOrEqual(3);
    },
  );
});

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for equal colors', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#3F4D44', '#3F4D44')).toBe(1);
  });

  it('rejects malformed hex', () => {
    expect(() => contrastRatio('red', '#FFFFFF')).toThrow('Invalid hex color: red');
  });
});
