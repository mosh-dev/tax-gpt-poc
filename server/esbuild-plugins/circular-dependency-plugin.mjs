/* eslint-disable */
import path from 'path';

/**
 * ESBuild plugin to detect and warn about circular dependencies
 * Uses the metafile to analyze the dependency graph
 * @param {Object} options - Plugin options
 * @param {RegExp} options.exclude - Pattern to exclude files from circular dependency check
 * @returns {Object} ESBuild plugin
 */
export function circularDependencyPlugin(options = {}) {
  const {
    exclude = /node_modules/,
  } = options;

  return {
    name: 'circular-dependency',
    setup(build) {
      build.onEnd((result) => {
        if (!result.metafile) {
          return;
        }

        const { outputs } = result.metafile;
        const circularDeps = new Set();
        const graph = new Map();

        // Build a dependency graph from the metafile
        for (const [, output] of Object.entries(outputs)) {
          if (!output.inputs) {
            continue;
          }

          for (const [inputPath, inputInfo] of Object.entries(output.inputs)) {
            if (exclude.test(inputPath)) {
              continue;
            }

            if (!graph.has(inputPath)) {
              graph.set(inputPath, new Set());
            }

            if (inputInfo.imports) {
              for (const importInfo of inputInfo.imports) {
                const importPath = importInfo.path;
                if (!exclude.test(importPath)) {
                  graph.get(inputPath).add(importPath);
                }
              }
            }
          }
        }

        /**
         * Find circular dependencies using depth-first search
         * @param {string} node - Current node in the graph
         * @param {Set<string>} visited - Set of visited nodes
         * @param {string[]} currentPath - Current path being explored
         */
        function findCycles(node, visited = new Set(), currentPath = []) {
          if (currentPath.includes(node)) {
            const cycleStart = currentPath.indexOf(node);
            const cycle = [...currentPath.slice(cycleStart), node];
            const cycleKey = cycle.slice().sort().join('->');

            if (!circularDeps.has(cycleKey)) {
              circularDeps.add(cycleKey);

              const formattedCycle = cycle
                .map((p) => {
                  const relative = path.relative(process.cwd(), p);
                  return relative.startsWith('..') ? p : relative;
                })
                .join('\n  → ');

              console.warn(`\n⚠️  Circular dependency detected:\n  → ${formattedCycle}\n`);
            }
            return;
          }

          if (visited.has(node)) {
            return;
          }

          visited.add(node);

          const dependencies = graph.get(node) || new Set();
          for (const dep of dependencies) {
            findCycles(dep, visited, [...currentPath, node]);
          }
        }

        // Check each file in the graph for circular dependencies
        for (const node of graph.keys()) {
          findCycles(node);
        }

        if (circularDeps.size > 0) {
          const depWord = circularDeps.size === 1 ? 'dependency' : 'dependencies';
          console.warn(`\n⚠️  Found ${circularDeps.size} circular ${depWord}\n`);
        }
      });
    },
  };
}