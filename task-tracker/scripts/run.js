#!/usr/bin/env node
/**
 * Task Tracker - Runner Principal
 * Ejecuta todo el pipeline: fetch → analyze → send alerts
 * 
 * Uso:
 *   node scripts/run.js
 * 
 * Requiere variables de entorno:
 *   source ~/.openclaw/env
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Verificar variables de entorno
function checkEnv() {
  const required = [
    'TRELLO_API_KEY',
    'TRELLO_API_TOKEN',
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL',
    'SENDGRID_TO_EMAIL'
  ];
  
  const missing = [];
  required.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });
  
  if (missing.length > 0) {
    console.error('❌ ERROR: Faltan variables de entorno:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\n💡 Solución:');
    console.error('   source ~/.openclaw/env');
    console.error('\nO agrega a tu ~/.bashrc:');
    console.error('   echo "source ~/.openclaw/env" >> ~/.bashrc');
    process.exit(1);
  }
  
  console.log('✅ Environment variables loaded');
}

// Ejecutar comando
function run(cmd) {
  console.log(`\n🔹 Running: ${cmd}`);
  try {
    const output = execSync(cmd, { 
      stdio: 'inherit',
      cwd: __dirname
    });
    return output;
  } catch (error) {
    console.error(`❌ Error executing: ${cmd}`);
    throw error;
  }
}

// Main
async function main() {
  console.log('========================================');
  console.log('🚀 Task Tracker - Full Pipeline');
  console.log('========================================\n');
  
  // Verificar entorno
  checkEnv();
  
  const startTime = Date.now();
  
  try {
    // Paso 1: Fetch Trello
    console.log('\n📋 STEP 1: Fetch Trello cards');
    run('node fetch-trello.js');
    
    // Paso 2: Analyze tasks
    console.log('\n📊 STEP 2: Analyze tasks');
    run('node analyze-tasks.js');
    
    // Paso 3: Send alerts
    console.log('\n📧 STEP 3: Send alerts');
    run('node send-alerts.js');
    
    // Completado
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n========================================');
    console.log(`✅ Pipeline completed in ${duration}s`);
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n❌ Pipeline failed!');
    console.error(error.message);
    process.exit(1);
  }
}

// Auto-PR command
async function runAutoPR() {
  console.log('========================================');
  console.log('🤖 Auto PR Generator');
  console.log('========================================\n');
  
  checkEnv();
  
  try {
    run('node auto-pr.js');
  } catch (error) {
    console.error('\n❌ Auto-PR failed!');
    console.error(error.message);
    process.exit(1);
  }
}

// Auto-PR Sync command
async function runAutoPRSync() {
  console.log('========================================');
  console.log('🔄 Auto PR - Sync Status');
  console.log('========================================\n');
  
  checkEnv();
  
  try {
    run('node auto-pr.js --sync');
  } catch (error) {
    console.error('\n❌ Auto-PR Sync failed!');
    console.error(error.message);
    process.exit(1);
  }
}

// Parse command line args
const args = process.argv.slice(2);
if (args.includes('--auto-pr') || args.includes('-p')) {
  runAutoPR();
} else if (args.includes('--sync') || args.includes('-s')) {
  runAutoPRSync();
} else {
  main();
}

// Run
main();
