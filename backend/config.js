const TARGET_ROLES = [
  'hiring manager',
  'talent acquisition',
  'manager recruitment',
  'ta manager',
  'manager - ta',
  'talent acquisition manager - tech',
  'manager of talent acquisition',
  'manager - human resources',
  'talent acquisition (tech)',
  'workforce staffing manager',
  'wfs',
  'recruitment manager',
  'head of talent',
  'head of recruiting',
  'recruiter',
  'sourcer',
  'talent acquisition specialist',
  'technical recruiter',
  'campus recruiter',
  'staffing manager',
];

const ROLE_GRAPH = {
  'hr': ['human resources', 'manager - human resources', 'human resources manager', 'hr manager'],
  'human resources': ['hr', 'manager - human resources', 'human resources manager', 'hr manager'],
  'human resources manager': ['hr manager', 'manager - human resources', 'hr', 'human resources'],
  'hr manager': ['human resources', 'manager - human resources', 'hr', 'human resources manager'],
  'ta': ['talent acquisition', 'ta manager', 'talent acquisition manager'],
  'talent acquisition': ['ta', 'ta manager', 'talent acquisition manager', 'recruiting', 'recruitment'],
  'ta manager': ['talent acquisition manager', 'talent acquisition', 'talent acquisition manager - tech'],
  'manager': ['hiring manager', 'manager recruitment', 'recruitment manager', 'head of talent'],
  'recruiter': ['sourcer', 'talent acquisition', 'recruiting', 'recruitment'],
  'recruiting': ['recruiter', 'sourcer', 'talent acquisition', 'recruitment'],
  'workforce staffing': ['wfs', 'workforce staffing manager', 'staffing manager'],
  'wfs': ['workforce staffing', 'workforce staffing manager'],
  'head of talent': ['talent acquisition', 'head of recruiting', 'hiring manager'],
  'head of recruiting': ['talent acquisition', 'head of talent', 'recruiting'],
};

function expandAbbreviation(token) {
  const abbr = {
    ta: ['talent acquisition', 'ta manager'],
    hr: ['human resources', 'manager - human resources', 'hr manager'],
    wfs: ['workforce staffing', 'workforce staffing manager', 'staffing manager'],
    recruiting: ['recruiter', 'sourcer', 'talent acquisition'],
    manager: ['hiring manager', 'manager recruitment', 'recruitment manager', 'head of talent'],
  };
  return abbr[token] || [token];
}

function getRoleKeywords(title) {
  const lower = (title || '').toLowerCase();

  // Fast path - direct match
  if (TARGET_ROLES.some((role) => lower.includes(role))) {
    return null;
  }

  // Extract keywords
  const tokens = lower.split(/[\s\-,()]+/).filter(Boolean);
  const keywords = [];

  for (const token of tokens) {
    if (['and', 'the', 'of', 'a', 'or'].includes(token)) continue;
    keywords.push(...expandAbbreviation(token));
  }

  return keywords;
}

function dfsFindRelatedRole(keyword, visited = new Set()) {
  if (visited.has(keyword)) return [];
  visited.add(keyword);

  const related = ROLE_GRAPH[keyword] || [];
  const results = [];

  for (const next of related) {
    if (TARGET_ROLES.includes(next)) {
      results.push(next);
    }
    results.push(...dfsFindRelatedRole(next, visited));
  }

  return [...new Set(results)];
}

function matchesTargetRole(title) {
  if (!title) return false;
  const lower = title.toLowerCase();

  // Direct match first
  if (TARGET_ROLES.some((role) => lower.includes(role))) {
    return true;
  }

  // DFS-based matching
  const keywords = getRoleKeywords(title);
  if (!keywords) return true;

  for (const keyword of keywords) {
    const relatedMatches = dfsFindRelatedRole(keyword);
    if (relatedMatches.some((m) => lower.includes(m))) {
      return true;
    }
  }

  return false;
}

module.exports = { TARGET_ROLES, matchesTargetRole };