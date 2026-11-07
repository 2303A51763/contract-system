const wf = require('../src/workflow');

test('high value needs Legal and Finance', () => {
  expect(wf.requiredApprovers(80000)).toEqual(['LEGAL', 'FINANCE']);
});
test('low value needs only Legal', () => {
  expect(wf.requiredApprovers(1000)).toEqual(['LEGAL']);
});
test('invalid transition is blocked', () => {
  expect(wf.canTransition('DRAFT', 'SIGNED')).toBe(false);
});
test('one rejection rejects contract', () => {
  expect(wf.evaluate([{ decision: 'APPROVED' }, { decision: 'REJECTED' }])).toBe('REJECTED');
});
test('all approvals approve contract', () => {
  expect(wf.evaluate([{ decision: 'APPROVED' }, { decision: 'APPROVED' }])).toBe('APPROVED');
});