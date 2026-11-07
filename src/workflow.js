// Which roles must approve, based on contract value
function requiredApprovers(value) {
  return Number(value) > 50000 ? ['LEGAL', 'FINANCE'] : ['LEGAL'];
}

// Allowed status transitions
const transitions = {
  DRAFT: ['IN_REVIEW'],
  IN_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['SIGNED'],
  SIGNED: ['ACTIVE'],
  ACTIVE: ['EXPIRED', 'TERMINATED'],
  REJECTED: ['DRAFT'],
};

function canTransition(from, to) {
  return (transitions[from] || []).includes(to);
}

// Decide overall outcome from individual approvals
function evaluate(approvals) {
  if (approvals.some(a => a.decision === 'REJECTED')) return 'REJECTED';
  if (approvals.every(a => a.decision === 'APPROVED')) return 'APPROVED';
  return 'IN_REVIEW';
}

module.exports = { requiredApprovers, canTransition, evaluate };