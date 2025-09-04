/**
 * Smart persona routing based on query analysis
 */

import { PersonaRegistry } from './types.js';

export interface QueryClassification {
  primaryPersona: string;
  confidence: number;
  alternativePersonas?: string[];
  detectedDomain: string;
}

/**
 * Keyword-based routing rules
 * Maps keywords/phrases to persona IDs
 */
const ROUTING_RULES: Record<string, { keywords: string[], personaId: string }> = {
  architecture: {
    keywords: [
      'architecture', 'structure', 'design', 'pattern', 'system',
      'microservice', 'monolith', 'coupling', 'cohesion', 'solid',
      'dependency', 'layer', 'module', 'component', 'service',
      'scalability', 'maintainability', 'refactor', 'technical debt'
    ],
    personaId: 'charles'
  },
  algorithms: {
    keywords: [
      'algorithm', 'optimize', 'performance', 'complexity',
      'big o', 'data structure', 'sort', 'search', 'graph',
      'dynamic programming', 'recursion', 'iteration', 'efficiency',
      'runtime', 'space complexity', 'benchmark', 'profiling'
    ],
    personaId: 'ada'
  },
  security: {
    keywords: [
      'security', 'vulnerability', 'auth', 'authentication', 'authorization',
      'encryption', 'csrf', 'xss', 'sql injection', 'owasp', 'penetration',
      'exploit', 'patch', 'certificate', 'ssl', 'tls', 'oauth', 'jwt',
      'password', 'hash', 'salt', 'token', 'session'
    ],
    personaId: 'security-expert' // Future persona
  },
  frontend: {
    keywords: [
      'react', 'vue', 'angular', 'svelte', 'component', 'ui', 'ux',
      'css', 'tailwind', 'style', 'responsive', 'accessibility',
      'state management', 'redux', 'hooks', 'props', 'dom',
      'webpack', 'vite', 'bundler', 'jsx', 'tsx'
    ],
    personaId: 'frontend-expert' // Future persona
  },
  backend: {
    keywords: [
      'api', 'rest', 'graphql', 'database', 'sql', 'nosql',
      'orm', 'migration', 'server', 'endpoint', 'middleware',
      'cache', 'redis', 'queue', 'message', 'event', 'webhook',
      'docker', 'kubernetes', 'deployment', 'ci/cd'
    ],
    personaId: 'backend-expert' // Future persona
  }
};

/**
 * Classify a query to determine the best persona
 */
export function classifyQuery(query: string, hint?: string): QueryClassification {
  const normalizedQuery = query.toLowerCase();
  const normalizedHint = hint?.toLowerCase();
  
  const scores: Record<string, number> = {};
  
  // Check each routing rule
  for (const [domain, rule] of Object.entries(ROUTING_RULES)) {
    let score = 0;
    
    // Check keywords in query
    for (const keyword of rule.keywords) {
      if (normalizedQuery.includes(keyword)) {
        score += keyword.split(' ').length; // Multi-word keywords score higher
      }
    }
    
    // Boost score if hint matches domain
    if (normalizedHint && domain.includes(normalizedHint)) {
      score += 10;
    }
    
    if (score > 0) {
      scores[domain] = score;
    }
  }
  
  // Find the best match
  const sortedDomains = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);
  
  if (sortedDomains.length === 0) {
    // No matches, use default persona
    const availablePersonas = PersonaRegistry.list();
    const defaultPersona = availablePersonas.find(p => p.id === 'charles') || availablePersonas[0];
    
    return {
      primaryPersona: defaultPersona?.id || 'charles',
      confidence: 0.3,
      detectedDomain: 'general'
    };
  }
  
  const [topDomain, topScore] = sortedDomains[0];
  const rule = ROUTING_RULES[topDomain];
  
  // Check if the persona exists in registry
  const persona = PersonaRegistry.get(rule.personaId);
  if (!persona) {
    // Fallback to available personas
    const availablePersonas = PersonaRegistry.list();
    const fallback = availablePersonas[0];
    
    return {
      primaryPersona: fallback?.id || 'charles',
      confidence: 0.5,
      detectedDomain: topDomain,
      alternativePersonas: availablePersonas.slice(1).map(p => p.id)
    };
  }
  
  // Calculate confidence based on score
  const maxPossibleScore = rule.keywords.length * 2; // Rough estimate
  const confidence = Math.min(topScore / maxPossibleScore, 1.0);
  
  return {
    primaryPersona: rule.personaId,
    confidence,
    detectedDomain: topDomain,
    alternativePersonas: sortedDomains.slice(1, 3).map(([d]) => ROUTING_RULES[d].personaId)
  };
}

/**
 * Get a user-friendly explanation of the routing decision
 */
export function explainRouting(classification: QueryClassification): string {
  const persona = PersonaRegistry.get(classification.primaryPersona);
  
  if (classification.confidence < 0.4) {
    return `I'll connect you with ${persona?.name || 'our expert'} for general assistance.`;
  }
  
  const domainDescriptions: Record<string, string> = {
    architecture: 'architectural and design questions',
    algorithms: 'algorithm and performance optimization',
    security: 'security and authentication concerns',
    frontend: 'frontend and UI development',
    backend: 'backend and API development',
    general: 'your question'
  };
  
  const domainDesc = domainDescriptions[classification.detectedDomain] || 'your technical question';
  
  return `Based on ${domainDesc}, I'm connecting you with ${persona?.name || 'our expert'}.`;
}
