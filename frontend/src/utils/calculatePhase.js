/**
 * Calculates the current development phase based on implementation progress.
 */

const PHASES = [
  { name: 'Planning', threshold: 0 },
  { name: 'Development', threshold: 10 },
  { name: 'Testing', threshold: 50 },
  { name: 'Review', threshold: 75 },
  { name: 'Deployment', threshold: 90 },
  { name: 'Complete', threshold: 100 }
];

export function calculatePhase(progressPercentage) {
  const progress = Math.max(0, Math.min(100, progressPercentage || 0));
  
  let currentPhase = PHASES[0];
  for (const phase of PHASES) {
    if (progress >= phase.threshold) {
      currentPhase = phase;
    }
  }
  
  return {
    name: currentPhase.name,
    index: PHASES.indexOf(currentPhase),
    total: PHASES.length,
    progress: progress
  };
}

export function getPhaseStatus(phaseName, currentPhase) {
  const phaseIndex = PHASES.findIndex(p => p.name === phaseName);
  if (phaseIndex < currentPhase.index) return 'completed';
  if (phaseIndex === currentPhase.index) return 'current';
  return 'upcoming';
}

export default calculatePhase;
