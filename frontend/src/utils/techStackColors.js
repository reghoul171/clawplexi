/**
 * Color mapping for tech stack badges.
 * Uses consistent colors for common technologies.
 */

const TECH_COLORS = {
  // Languages
  javascript: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  typescript: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  python: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  go: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  rust: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  java: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  
  // Frameworks
  react: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  vue: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  angular: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  nextjs: { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/30' },
  node: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  
  // Databases
  postgresql: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  mongodb: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  redis: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  
  // Tools
  docker: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  kubernetes: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  aws: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  git: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' }
};

const DEFAULT_COLOR = { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' };

export function getTechColor(techName) {
  if (!techName) return DEFAULT_COLOR;
  
  const normalizedName = techName.toLowerCase().replace(/[^a-z]/g, '');
  
  // Direct match
  if (TECH_COLORS[normalizedName]) {
    return TECH_COLORS[normalizedName];
  }
  
  // Partial match
  for (const [key, colors] of Object.entries(TECH_COLORS)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return colors;
    }
  }
  
  return DEFAULT_COLOR;
}

export function getTechColors(techStack) {
  if (!Array.isArray(techStack)) return [];
  return techStack.map(tech => ({
    name: tech,
    ...getTechColor(tech)
  }));
}

export default TECH_COLORS;
