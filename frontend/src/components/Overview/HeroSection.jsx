import { ExternalLink, GitBranch } from 'lucide-react';

/**
 * Hero section with project name, description, and repo link.
 */

function HeroSection({ projectName, projectDescription, repositoryUrl, editorUsed }) {
  return (
    <section className="bg-gray-800 rounded-xl p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">{projectName}</h2>
          <p className="mt-2 text-gray-400 text-sm leading-relaxed">{projectDescription}</p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2">
          <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
            {editorUsed}
          </span>

          {repositoryUrl && (
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors"
            >
              <GitBranch className="w-4 h-4" />
              <span>View Repository</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
