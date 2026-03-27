import { getTechColors } from '../../utils/techStackColors';

/**
 * Displays color-coded technology badges.
 */

function TechStackBadges({ techStack }) {
  const colors = getTechColors(techStack);
  
  if (!colors || colors.length === 0) {
    return null;
  }
  
  return (
    <section className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Tech Stack</h3>
      <div className="flex flex-wrap gap-2">
        {colors.map((tech, index) => (
          <span
            key={index}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${tech.bg} ${tech.text} ${tech.border}`}
          >
            {tech.name}
          </span>
        ))}
      </div>
    </section>
  );
}

export default TechStackBadges;
