#!/usr/bin/env node
/**
 * Hook: Task Tracker Runner
 * Se ejecuta cuando el cron job dispara el evento "task-tracker-run"
 */

const { execSync } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, '../task-tracker/scripts/run.js');

console.log('🚀 Task Tracker Cron Job Triggered');
console.log('=' .repeat(50));
console.log(`📁 Script: ${scriptPath}`);
console.log(`🕐 Time: ${new Date().toISOString()}`);
console.log('=' .repeat(50));

try {
  // Ejecutar el script
  const output = execSync(`node "${scriptPath}"`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: path.join(__dirname, '../task-tracker/scripts')
  });
  
  console.log('\n✅ Task Tracker completed successfully!\n');
  console.log(output);
  
  // Return success
  process.exit(0);
} catch (error) {
  console.error('\n❌ Task Tracker failed!\n');
  console.error(error.message);
  if (error.stdout) console.log('STDOUT:', error.stdout);
  if (error.stderr) console.log('STDERR:', error.stderr);
  process.exit(1);
}
