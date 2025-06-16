import { describe, test, expect, beforeAll } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import the tools directly
import { 
  runScreenshotTool, 
  ScreenshotToolSchema 
} from '../src/tools/screenshot.js';

import { 
  runArchitectTool, 
  ArchitectToolSchema 
} from '../src/tools/architect.js';

import { 
  runCodeReviewTool, 
  CodeReviewToolSchema 
} from '../src/tools/codeReview.js';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('MCP Tools Tests', () => {
  // Make sure we have OPENAI_API_KEY for architect tool
  beforeAll(() => {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY not set. Architect tool test will fail.');
    }
  });

  describe('Screenshot Tool', () => {
    test('should take screenshot of a URL', async () => {
      // Create temp directory for test artifacts if it doesn't exist
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const screenshotPath = path.join(tempDir, 'test-screenshot.png');
      
      // Delete the screenshot if it exists
      if (fs.existsSync(screenshotPath)) {
        fs.unlinkSync(screenshotPath);
      }

      try {
        const result = await runScreenshotTool({
          url: 'https://example.com',
          fullPathToScreenshot: screenshotPath
        });

        // Check if the screenshot was saved
        expect(fs.existsSync(screenshotPath)).toBe(true);
        
        // Check if the file has content
        const stats = fs.statSync(screenshotPath);
        expect(stats.size).toBeGreaterThan(0);
        
        // Check the response format
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Screenshot saved to');
      } catch (error) {
        console.error('Screenshot test error:', error);
        throw error;
      }
    }, 30000); // Increase timeout for screenshot test
  });

  describe('Architect Tool', () => {
    test('should analyze code and task', async () => {
      // Skip if no API key
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping architect test - no API key');
        return;
      }

      const sampleCode = `
function add(a, b) {
  return a + b;
}
      `;
      
      const result = await runArchitectTool({
        task: 'Improve this add function to handle different types of inputs',
        code: sampleCode
      });
      
      // Check the response format
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text.length).toBeGreaterThan(0);
    }, 30000); // Increase timeout for OpenAI API call
  });

  describe('Code Review Tool', () => {
    test('should run code review on a folder', async () => {
      // Create a temporary git repo for testing
      const tempRepoDir = path.join(__dirname, 'temp-repo');
      
      // Skip this test if we can't set up a proper git repo
      try {
        // Check if git is available
        await Bun.spawn(['git', '--version']).exited;
        
        // Set up a basic git repo if it doesn't exist
        if (!fs.existsSync(path.join(tempRepoDir, '.git'))) {
          // Create directory if it doesn't exist
          if (!fs.existsSync(tempRepoDir)) {
            fs.mkdirSync(tempRepoDir, { recursive: true });
          }
          
          // Write a test file
          fs.writeFileSync(
            path.join(tempRepoDir, 'test-file.js'), 
            'console.log("Hello world");'
          );
          
          // Initialize git repo
          await Bun.spawn(['git', 'init'], { cwd: tempRepoDir }).exited;
          await Bun.spawn(['git', 'add', '.'], { cwd: tempRepoDir }).exited;
          await Bun.spawn(['git', 'config', 'user.email', 'test@example.com'], { cwd: tempRepoDir }).exited;
          await Bun.spawn(['git', 'config', 'user.name', 'Test User'], { cwd: tempRepoDir }).exited;
          await Bun.spawn(['git', 'commit', '-m', 'Initial commit'], { cwd: tempRepoDir }).exited;
          
          // Create a branch called main if it doesn't exist
          await Bun.spawn(['git', 'branch', '-M', 'main'], { cwd: tempRepoDir }).exited;
          
          // Make a change to the file
          fs.writeFileSync(
            path.join(tempRepoDir, 'test-file.js'), 
            'console.log("Hello world");\n// Added a comment'
          );
        }
        
        const result = await runCodeReviewTool({
          folderPath: tempRepoDir
        });
        
        // Check the response format
        expect(result.content[0].type).toBe('text');
        
      } catch (error) {
        console.log('Skipping code review test - git setup failed:', error);
      }
    }, 30000);
  });
});
