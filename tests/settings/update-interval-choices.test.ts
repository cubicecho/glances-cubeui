import {
  chosenUpdateInterval,
  formatInterval,
  updateIntervalChoices,
  updateIntervalSetting,
} from '../../web/src/settings/update-interval-choices.ts';

describe('updateIntervalChoices', () => {
  it('starts with the server interval and offers only slower ones after it', () => {
    expect(updateIntervalChoices(3)).toEqual([3, 5, 10, 30, 60]);
    expect(updateIntervalChoices(10)).toEqual([10, 30, 60]);
  });

  it('offers a server interval that is not one of the usual choices', () => {
    expect(updateIntervalChoices(7.5)).toEqual([7.5, 10, 30, 60]);
  });

  it('offers the server interval alone when it is the slowest', () => {
    expect(updateIntervalChoices(120)).toEqual([120]);
  });
});

describe('chosenUpdateInterval', () => {
  it('is the server interval when nothing is stored', () => {
    expect(chosenUpdateInterval(null, 3)).toBe(3);
  });

  it('is the stored interval when the server is faster', () => {
    expect(chosenUpdateInterval(30, 3)).toBe(30);
  });

  it('is the server interval when the stored one is no slower', () => {
    expect(chosenUpdateInterval(5, 10)).toBe(10);
  });
});

describe('updateIntervalSetting', () => {
  it('stores nothing for the fastest choice, so it follows the server', () => {
    expect(updateIntervalSetting(3, 3)).toBeNull();
  });

  it('stores a slower choice as picked', () => {
    expect(updateIntervalSetting(30, 3)).toBe(30);
  });
});

describe('formatInterval', () => {
  it('writes seconds below a minute and minutes from there', () => {
    expect(formatInterval(5)).toBe('5 s');
    expect(formatInterval(60)).toBe('1 min');
    expect(formatInterval(90)).toBe('1.5 min');
  });
});
