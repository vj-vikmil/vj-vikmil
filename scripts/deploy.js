#!/usr/bin/env node

/**
 * Cross-platform deployment script
 * Deploys dist/ to target GitHub Pages directory
 */

import { existsSync, rmSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';

const TARGET_DIR = process.env.DEPLOY_TARGET || 'C:\\Users\\user\\Documents\\GitHub\\vikmil.github.io\\vj-vikmil\\ascii-detect';
const DIST_DIR = join(process.cwd(), 'dist');

function copyRecursive(src, dest) {
  const stats = statSync(src);
  
  if (stats.isDirectory()) {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }
    const entries = readdirSync(src);
    for (const entry of entries) {
      copyRecursive(join(src, entry), join(dest, entry));
    }
  } else {
    const destDir = dirname(dest);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }
    copyFileSync(src, dest);
  }
}

console.log('🚀 Starting deployment...');

// Check if dist exists
if (!existsSync(DIST_DIR)) {
  console.error('❌ dist/ directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Clean and create target directory
if (existsSync(TARGET_DIR)) {
  console.log('🧹 Cleaning target directory...');
  rmSync(TARGET_DIR, { recursive: true, force: true });
}

mkdirSync(TARGET_DIR, { recursive: true });

// Copy files
console.log('📦 Copying files...');
copyRecursive(DIST_DIR, TARGET_DIR);

console.log('✅ Deployment complete!');
console.log(`📁 Files copied to: ${TARGET_DIR}`);
console.log('\n💡 Next steps:');
console.log('   cd C:\\Users\\user\\Documents\\GitHub\\vikmil.github.io\\vj-vikmil');
console.log('   git add ascii-detect');
console.log('   git commit -m "Deploy ascii-detect"');
console.log('   git push');

