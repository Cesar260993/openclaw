#!/usr/bin/env node
/**
 * Task Tracker - Run Complete Flow
 * Ejecuta: fetch → analyze → send alerts
 */

const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  'fetch-trello.js',
  'analyze-tasks.js',
  'send-alerts.js'
];

console.log('🚀 Task Tracker - Starting complete flow...\n');
console.log('=' .repeat(50));

scripts.forEach((script, index) => {
  console.log(`\n[${index + 1}/${scripts.length}] Running: ${script}`);
  console.log('-'.repeat(50));
  
  try {
    const scriptPath = path.join(__dirname, script);
    execSync(`node "${scriptPath}"`, { 
      stdio: 'inherit',
      cwd: __dirname 
    });
  } catch (error) {
    console.error(`\n❌ Error running ${script}`);
    console.error(error.message);
    process.exit(1);
  }
});

console.log('\n' + '='.repeat(50));
console.log('✅ Complete flow finished successfully!');
