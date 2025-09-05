export interface ProjectType {
  type: 'static' | 'react' | 'vue' | 'angular' | 'nextjs' | 'nuxt' | 'svelte' | 'vite' | 'webpack' | 'docusaurus' | 'unknown';
  framework?: string;
  buildCommand?: string;
  outputDir?: string;
  installCommand?: string;
  confidence: number;
  detectedFiles: string[];
}

export interface DetectedProject {
  projectType: ProjectType;
  packageJson?: any;
  configFiles: string[];
  hasNodeModules: boolean;
  buildScripts: string[];
}

export class ProjectDetector {
  private static readonly PROJECT_INDICATORS = {
    // React projects
    react: {
      files: ['package.json'],
      patterns: [
        /"react"/,
        /"@vitejs\/plugin-react"/,
        /"react-scripts"/,
        /"next"/,
        /"create-react-app"/
      ],
      configFiles: ['vite.config.js', 'vite.config.ts', 'next.config.js', 'next.config.ts'],
      buildCommand: 'npm run build',
      outputDir: 'dist'
    },
    
    // Vue projects
    vue: {
      files: ['package.json'],
      patterns: [
        /"vue"/,
        /"@vitejs\/plugin-vue"/,
        /"nuxt"/,
        /"@vue\/cli/
      ],
      configFiles: ['vite.config.js', 'vite.config.ts', 'nuxt.config.js', 'nuxt.config.ts'],
      buildCommand: 'npm run build',
      outputDir: 'dist'
    },
    
    // Angular projects
    angular: {
      files: ['package.json', 'angular.json'],
      patterns: [
        /"@angular\/core"/,
        /"@angular\/cli"/
      ],
      configFiles: ['angular.json'],
      buildCommand: 'ng build --prod',
      outputDir: 'dist'
    },
    
    // Svelte projects
    svelte: {
      files: ['package.json'],
      patterns: [
        /"svelte"/,
        /"@sveltejs\/kit"/,
        /"vite-plugin-svelte"/
      ],
      configFiles: ['svelte.config.js', 'svelte.config.ts', 'vite.config.js', 'vite.config.ts'],
      buildCommand: 'npm run build',
      outputDir: 'build'
    },
    
    // Vite projects
    vite: {
      files: ['vite.config.js', 'vite.config.ts'],
      patterns: [
        /"vite"/
      ],
      configFiles: ['vite.config.js', 'vite.config.ts'],
      buildCommand: 'npm run build',
      outputDir: 'dist'
    },
    
    // Next.js projects
    nextjs: {
      files: ['package.json'],
      patterns: [
        /"next"/
      ],
      configFiles: ['next.config.js', 'next.config.ts'],
      buildCommand: 'npm run build',
      outputDir: 'out'
    },
    
    // Nuxt.js projects
    nuxt: {
      files: ['package.json'],
      patterns: [
        /"nuxt"/
      ],
      configFiles: ['nuxt.config.js', 'nuxt.config.ts'],
      buildCommand: 'npm run generate',
      outputDir: 'dist'
    },
    
    // Docusaurus projects
    docusaurus: {
      files: ['package.json'],
      patterns: [
        /"@docusaurus/
      ],
      configFiles: ['docusaurus.config.js', 'docusaurus.config.ts'],
      buildCommand: 'npm run build',
      outputDir: 'build'
    },
    
    // Static sites
    static: {
      files: ['index.html'],
      patterns: [],
      configFiles: [],
      buildCommand: null,
      outputDir: '.'
    }
  };

  static async detectProjectType(files: { name: string; content: string }[]): Promise<DetectedProject> {
    const fileMap = new Map(files.map(f => [f.name, f]));
    const detectedFiles: string[] = [];
    const configFiles: string[] = [];
    const buildScripts: string[] = [];
    let packageJson: any = null;
    let hasNodeModules = false;

    // Check for package.json
    const packageJsonFile = fileMap.get('package.json');
    if (packageJsonFile) {
      try {
        packageJson = JSON.parse(packageJsonFile.content);
        detectedFiles.push('package.json');
        
        // Extract build scripts
        if (packageJson.scripts) {
          buildScripts.push(...Object.keys(packageJson.scripts));
        }
      } catch (error) {
        console.warn('Failed to parse package.json:', error);
      }
    }

    // Check for node_modules
    hasNodeModules = fileMap.has('node_modules') || 
      files.some(f => f.name.startsWith('node_modules/'));

    // Check for config files
    const allConfigFiles = [
      'vite.config.js', 'vite.config.ts', 'next.config.js', 'next.config.ts',
      'nuxt.config.js', 'nuxt.config.ts', 'angular.json', 'svelte.config.js',
      'svelte.config.ts', 'docusaurus.config.js', 'docusaurus.config.ts',
      'webpack.config.js', 'webpack.config.ts', 'rollup.config.js', 'rollup.config.ts'
    ];

    for (const configFile of allConfigFiles) {
      if (fileMap.has(configFile)) {
        configFiles.push(configFile);
        detectedFiles.push(configFile);
      }
    }

    // Check for static files
    if (fileMap.has('index.html')) {
      detectedFiles.push('index.html');
    }

    // Detect project type based on indicators
    const projectTypes: ProjectType[] = [];

    for (const [type, indicators] of Object.entries(this.PROJECT_INDICATORS)) {
      let confidence = 0;
      const typeDetectedFiles: string[] = [];

      // Check for required files
      for (const requiredFile of indicators.files) {
        if (fileMap.has(requiredFile)) {
          confidence += 0.3;
          typeDetectedFiles.push(requiredFile);
        }
      }

      // Check for config files
      for (const configFile of indicators.configFiles) {
        if (fileMap.has(configFile)) {
          confidence += 0.2;
          typeDetectedFiles.push(configFile);
        }
      }

      // Check package.json patterns
      if (packageJson && indicators.patterns.length > 0) {
        const packageJsonStr = JSON.stringify(packageJson);
        for (const pattern of indicators.patterns) {
          if (pattern.test(packageJsonStr)) {
            confidence += 0.4;
            break;
          }
        }
      }

      // Special handling for static sites
      if (type === 'static' && fileMap.has('index.html') && !packageJson) {
        confidence = 0.8;
        typeDetectedFiles.push('index.html');
      }

      if (confidence > 0) {
        projectTypes.push({
          type: type as any,
          framework: type,
          buildCommand: indicators.buildCommand || undefined,
          outputDir: indicators.outputDir || 'dist',
          installCommand: 'npm install',
          confidence,
          detectedFiles: typeDetectedFiles
        });
      }
    }

    // Sort by confidence and return the best match
    projectTypes.sort((a, b) => b.confidence - a.confidence);

    const bestMatch = projectTypes[0] || {
      type: 'unknown',
      confidence: 0,
      detectedFiles: []
    };

    return {
      projectType: bestMatch,
      packageJson,
      configFiles,
      hasNodeModules,
      buildScripts
    };
  }

  static getBuildCommand(projectType: ProjectType, packageJson?: any): string {
    if (projectType.buildCommand) {
      return projectType.buildCommand;
    }

    // Fallback to package.json scripts
    if (packageJson?.scripts) {
      if (packageJson.scripts.build) {
        return 'npm run build';
      }
      if (packageJson.scripts['build:prod']) {
        return 'npm run build:prod';
      }
      if (packageJson.scripts['build:production']) {
        return 'npm run build:production';
      }
    }

    return 'npm run build';
  }

  static getOutputDirectory(projectType: ProjectType, packageJson?: any): string {
    if (projectType.outputDir) {
      return projectType.outputDir;
    }

    // Check package.json for output directory
    if (packageJson?.scripts) {
      const buildScript = packageJson.scripts.build || '';
      const outputMatch = buildScript.match(/--out-dir\s+(\S+)/);
      if (outputMatch) {
        return outputMatch[1];
      }
    }

    // Default fallbacks
    const defaults: Record<string, string> = {
      'react': 'dist',
      'vue': 'dist',
      'angular': 'dist',
      'svelte': 'build',
      'nextjs': 'out',
      'nuxt': 'dist',
      'vite': 'dist',
      'static': '.'
    };

    return defaults[projectType.type] || 'dist';
  }
}
