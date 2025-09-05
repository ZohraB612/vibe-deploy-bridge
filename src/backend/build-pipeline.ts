import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, rm, readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { ProjectType, DetectedProject } from './project-detector';

const execAsync = promisify(exec);

export interface BuildResult {
  success: boolean;
  outputDir: string;
  error?: string;
  logs: string[];
  buildTime: number;
}

export interface BuildOptions {
  projectName: string;
  files: { name: string; content: string }[];
  projectType: ProjectType;
  packageJson?: any;
  buildScripts: string[];
  timeout?: number; // in milliseconds
}

export class BuildPipeline {
  private static readonly BUILD_TIMEOUT = 300000; // 5 minutes
  private static readonly MAX_BUILD_SIZE = 100 * 1024 * 1024; // 100MB

  static async buildProject(options: BuildOptions): Promise<BuildResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const tempDir = `/tmp/deployhub-build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const addLog = (message: string) => {
      const timestamp = new Date().toISOString();
      logs.push(`[${timestamp}] ${message}`);
      console.log(`[BUILD] ${message}`);
    };

    try {
      addLog(`Starting build for ${options.projectType.type} project: ${options.projectName}`);
      addLog(`Using temporary directory: ${tempDir}`);

      // Create temporary directory
      await mkdir(tempDir, { recursive: true });

      // Write files to temporary directory
      addLog('Writing project files...');
      await this.writeProjectFiles(tempDir, options.files, addLog);

      // Check if we need to install dependencies
      const needsInstall = options.projectType.type !== 'static' && 
                          !options.files.some(f => f.name.startsWith('node_modules/'));

      if (needsInstall) {
        addLog('Installing dependencies...');
        await this.installDependencies(tempDir, addLog);
      }

      // Determine build command
      const buildCommand = this.getBuildCommand(options.projectType, options.packageJson, options.buildScripts);
      addLog(`Using build command: ${buildCommand}`);

      // Execute build
      addLog('Executing build...');
      const buildResult = await this.executeBuild(tempDir, buildCommand, addLog);

      if (!buildResult.success) {
        throw new Error(`Build failed: ${buildResult.error}`);
      }

      // Determine output directory
      const outputDir = this.getOutputDirectory(options.projectType, tempDir, options.packageJson);
      addLog(`Build output directory: ${outputDir}`);

      // Verify build output
      const buildOutput = await this.verifyBuildOutput(outputDir, addLog);
      if (!buildOutput.success) {
        throw new Error(`Build output verification failed: ${buildOutput.error}`);
      }

      const buildTime = Date.now() - startTime;
      addLog(`Build completed successfully in ${buildTime}ms`);

      return {
        success: true,
        outputDir,
        logs,
        buildTime
      };

    } catch (error) {
      const buildTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown build error';
      
      addLog(`Build failed after ${buildTime}ms: ${errorMessage}`);
      
      return {
        success: false,
        outputDir: '',
        error: errorMessage,
        logs,
        buildTime
      };
    } finally {
      // Cleanup temporary directory
      try {
        await rm(tempDir, { recursive: true, force: true });
        addLog('Cleaned up temporary directory');
      } catch (cleanupError) {
        addLog(`Warning: Failed to cleanup temporary directory: ${cleanupError}`);
      }
    }
  }

  private static async writeProjectFiles(
    tempDir: string, 
    files: { name: string; content: string }[], 
    addLog: (message: string) => void
  ): Promise<void> {
    for (const file of files) {
      const filePath = join(tempDir, file.name);
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));

      // Create directory if it doesn't exist
      if (dirPath !== tempDir) {
        await mkdir(dirPath, { recursive: true });
      }

      // Convert base64 content to buffer and write
      const buffer = Buffer.from(file.content, 'base64');
      await writeFile(filePath, buffer);
      
      addLog(`Written: ${file.name} (${buffer.length} bytes)`);
    }
  }

  private static async installDependencies(
    tempDir: string, 
    addLog: (message: string) => void
  ): Promise<void> {
    const timeout = 120000; // 2 minutes for npm install
    
    try {
      addLog('Running npm install...');
      const { stdout, stderr } = await execAsync('npm install --production=false', {
        cwd: tempDir,
        timeout,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      if (stdout) {
        addLog(`npm install stdout: ${stdout.substring(0, 500)}...`);
      }
      if (stderr) {
        addLog(`npm install stderr: ${stderr.substring(0, 500)}...`);
      }

      addLog('Dependencies installed successfully');
    } catch (error) {
      addLog(`npm install failed: ${error}`);
      throw new Error(`Failed to install dependencies: ${error}`);
    }
  }

  private static getBuildCommand(
    projectType: ProjectType, 
    packageJson?: any, 
    buildScripts: string[] = []
  ): string {
    // Use project type specific command
    if (projectType.buildCommand) {
      return projectType.buildCommand;
    }

    // Check package.json scripts
    if (packageJson?.scripts) {
      const scripts = packageJson.scripts;
      
      // Priority order for build commands
      const buildCommandPriority = [
        'build:prod',
        'build:production', 
        'build',
        'build:static',
        'generate',
        'export'
      ];

      for (const command of buildCommandPriority) {
        if (scripts[command]) {
          return `npm run ${command}`;
        }
      }
    }

    // Check available build scripts
    const availableBuildScripts = buildScripts.filter(script => 
      script.includes('build') || script.includes('generate') || script.includes('export')
    );

    if (availableBuildScripts.length > 0) {
      return `npm run ${availableBuildScripts[0]}`;
    }

    // Default fallback
    return 'npm run build';
  }

  private static getOutputDirectory(
    projectType: ProjectType, 
    tempDir: string,
    packageJson?: any
  ): string {
    // Use project type specific output directory
    if (projectType.outputDir) {
      return join(tempDir, projectType.outputDir);
    }

    // Check package.json for output directory configuration
    if (packageJson?.scripts) {
      const buildScript = packageJson.scripts.build || '';
      const outputMatch = buildScript.match(/--out-dir\s+(\S+)/);
      if (outputMatch) {
        return join(tempDir, outputMatch[1]);
      }
    }

    // Default fallbacks based on project type
    const defaultOutputDirs: Record<string, string> = {
      'react': 'dist',
      'vue': 'dist', 
      'angular': 'dist',
      'svelte': 'build',
      'nextjs': 'out',
      'nuxt': 'dist',
      'vite': 'dist',
      'static': '.'
    };

    const outputDir = defaultOutputDirs[projectType.type] || 'dist';
    return join(tempDir, outputDir);
  }

  private static async executeBuild(
    tempDir: string, 
    buildCommand: string, 
    addLog: (message: string) => void
  ): Promise<{ success: boolean; error?: string }> {
    const timeout = this.BUILD_TIMEOUT;
    
    try {
      addLog(`Executing: ${buildCommand}`);
      const { stdout, stderr } = await execAsync(buildCommand, {
        cwd: tempDir,
        timeout,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      if (stdout) {
        addLog(`Build stdout: ${stdout.substring(0, 1000)}...`);
      }
      if (stderr) {
        addLog(`Build stderr: ${stderr.substring(0, 1000)}...`);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown build error';
      addLog(`Build execution failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  private static async verifyBuildOutput(
    outputDir: string, 
    addLog: (message: string) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if output directory exists
      const stats = await stat(outputDir);
      if (!stats.isDirectory()) {
        throw new Error(`Output directory is not a directory: ${outputDir}`);
      }

      // List files in output directory
      const files = await readdir(outputDir, { recursive: true });
      addLog(`Build output contains ${files.length} files`);

      if (files.length === 0) {
        throw new Error('Build output directory is empty');
      }

      // Check for common entry points
      const hasIndexHtml = files.some(file => 
        file.toString().toLowerCase().includes('index.html')
      );
      
      if (!hasIndexHtml) {
        addLog('Warning: No index.html found in build output');
      }

      // Check total size
      let totalSize = 0;
      for (const file of files) {
        const filePath = join(outputDir, file.toString());
        try {
          const fileStats = await stat(filePath);
          if (fileStats.isFile()) {
            totalSize += fileStats.size;
          }
        } catch (fileError) {
          // Skip files that can't be stat'd
        }
      }

      addLog(`Total build output size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

      if (totalSize > this.MAX_BUILD_SIZE) {
        throw new Error(`Build output too large: ${(totalSize / 1024 / 1024).toFixed(2)} MB (max: ${this.MAX_BUILD_SIZE / 1024 / 1024} MB)`);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown verification error';
      addLog(`Build output verification failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }
}
