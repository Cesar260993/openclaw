#!/usr/bin/env node
/**
 * Auto PR Generator
 * Lee tarjetas de "Ready for Development" y genera PRs automáticamente
 * 
 * Flujo:
 * 1. Fetch cards de "Ready for Development"
 * 2. Verificar si tienen score de analyze-tasks.js
 * 3. Si score verde → Generar PR desde descripción de la card
 * 4. Si no tiene score → Ejecutar analyze-tasks.js primero
 * 5. Si no pasa → Dejar comentario explicando por qué no se tomó
 * 
 * Variables de entorno requeridas:
 * - TRELLO_API_KEY
 * - TRELLO_API_TOKEN
 * - GITHUB_TOKEN (para crear PRs)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuración
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const apiKey = process.env.TRELLO_API_KEY;
const apiToken = process.env.TRELLO_API_TOKEN;
const githubToken = process.env.GITHUB_TOKEN;
const boardId = config.apis.trello.boards[0];

// Lista "Ready for Development"
const READY_FOR_DEV_LIST_ID = '69ab19cf4fd18af4dcd0909a';

// Label del repositorio
const REPO_LABEL = 'Voltom-Tech/plazalud-infra';

// Validar variables de entorno
function checkEnv() {
  const missing = [];
  if (!apiKey || apiKey.includes('${')) missing.push('TRELLO_API_KEY');
  if (!apiToken || apiToken.includes('${')) missing.push('TRELLO_API_TOKEN');
  if (!githubToken) missing.push('GITHUB_TOKEN');
  
  if (missing.length > 0) {
    console.error('❌ ERROR: Faltan variables de entorno:');
    missing.forEach(v => console.error(`   - ${v}`));
    process.exit(1);
  }
}

// Helper HTTPS GET
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// Helper HTTPS POST
function httpsPost(url, data, token) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            resolve({ success: true, raw: responseData });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

// Helper HTTPS PUT
function httpsPut(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve({ success: true });
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Fetch cards de "Ready for Development"
async function fetchReadyCards() {
  console.log(`📋 Fetching cards from "Ready for Development"...`);
  
  const cards = await httpsGet(
    `https://api.trello.com/1/lists/${READY_FOR_DEV_LIST_ID}/cards?key=${apiKey}&token=${apiToken}&labels=true&members=true`
  );
  
  if (!Array.isArray(cards)) {
    console.log('   No cards found');
    return [];
  }
  
  console.log(`   Found ${cards.length} cards`);
  return cards;
}

// Verificar si card tiene label del repositorio
function hasRepoLabel(card) {
  return card.labels.some(l => l.name === REPO_LABEL);
}

// Cargar análisis previo
function loadAnalysis() {
  const analysisPath = path.join(__dirname, '../analysis.json');
  if (!fs.existsSync(analysisPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
}

// Buscar card en análisis
function findCardInAnalysis(cardId, analysis) {
  if (!analysis) return null;
  
  const allCards = [
    ...(analysis.ready || []),
    ...(analysis.dueSoon || []),
    ...(analysis.stuck || []),
    ...(analysis.overdue || [])
  ];
  
  return allCards.find(c => c.id === cardId);
}

// Ejecutar analyze-tasks.js
async function runAnalyzeTasks() {
  console.log('📊 Running analyze-tasks.js...');
  
  const { execSync } = require('child_process');
  try {
    execSync('node scripts/analyze-tasks.js', {
      cwd: __dirname,
      stdio: 'inherit'
    });
    return loadAnalysis();
  } catch (error) {
    console.error('❌ Error running analyze-tasks.js:', error.message);
    return null;
  }
}

// Dejar comentario en card
async function addComment(cardId, comment) {
  console.log(`   💬 Adding comment to card...`);
  
  const data = { text: comment };
  await httpsPost(
    `https://api.trello.com/1/cards/${cardId}/actions/comments?key=${apiKey}&token=${apiToken}`,
    data
  );
  
  console.log('   ✅ Comment added');
}

// Mover card a "In Progress"
async function moveToInProgress(cardId) {
  console.log('   📤 Moving card to "In progress"...');
  
  const data = { idList: '69ab19d5b57bdbb03d849344' };
  await httpsPut(
    `https://api.trello.com/1/cards/${cardId}?key=${apiKey}&token=${apiToken}`,
    data
  );
  
  console.log('   ✅ Card moved');
}

// Parsear descripción de card para extraer información
function parseCardDescription(desc) {
  const result = {
    tasks: [],
    notes: '',
    responsable: ''
  };
  
  if (!desc) return result;
  
  // Extraer responsable
  const respMatch = desc.match(/\*\*Responsable:\*\*\s*(.+)/i);
  if (respMatch) result.responsable = respMatch[1].trim();
  
  // Extraer tareas
  const tasksMatch = desc.match(/\*\*Tareas:\*\*([\s\S]*?)(?=\*\*|$)/i);
  if (tasksMatch) {
    result.tasks = tasksMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-/, '').trim());
  }
  
  // Extraer notas
  const notesMatch = desc.match(/\*\*Notas:\*\*([\s\S]*?)(?=\*\*|$)/i);
  if (notesMatch) {
    result.notes = notesMatch[1].trim();
  }
  
  return result;
}

// Generar branch name desde card
function generateBranchName(card) {
  const prefix = card.name.split(']')[0] || 'feat';
  const slug = card.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  
  return `${prefix}/${slug}-${card.idShort}`;
}

// Crear PR en GitHub
async function createPR(card, branchName) {
  console.log('   🚀 Creating GitHub PR...');
  
  // Parsear descripción para obtener detalles
  const parsed = parseCardDescription(card.desc);
  
  const prData = {
    title: card.name,
    head: branchName,
    base: 'main',
    body: `## Descripción
${card.desc || 'No description provided'}

## Tareas
${parsed.tasks.length > 0 ? parsed.tasks.map(t => `- ${t}`).join('\n') : 'No tasks specified'}

## Notas
${parsed.notes || 'No additional notes'}

---
*PR generado automáticamente desde Trello*
*Card: ${card.url}*`
  };
  
  try {
    const result = await httpsPost(
      'https://api.github.com/repos/Voltom-Tech/plazalud-infra/pulls',
      prData,
      githubToken
    );
    
    console.log('   ✅ PR created:', result.html_url);
    return result;
  } catch (error) {
    console.error('   ❌ Error creating PR:', error.message);
    
    // Si el error es que la branch no existe, es esperado
    if (error.message.includes('422')) {
      console.log('   ⚠️  Branch does not exist yet. Need to create branch first.');
    }
    
    throw error;
  }
}

// Comentar card con link al PR
async function commentWithPR(cardId, prUrl) {
  const comment = `🤖 **Auto-PR Generated**\n\nPR creado: ${prUrl}\n\nEl PR ha sido generado automáticamente desde esta tarjeta. Revisar y mergear cuando esté listo.`;
  await addComment(cardId, comment);
}

// Main
async function main() {
  console.log('========================================');
  console.log('🤖 Auto PR Generator');
  console.log('========================================\n');
  
  checkEnv();
  
  // 1. Fetch cards de Ready for Development
  const cards = await fetchReadyCards();
  
  if (cards.length === 0) {
    console.log('\n✅ No cards to process');
    return;
  }
  
  // 2. Cargar análisis previo
  let analysis = loadAnalysis();
  
  // 3. Si no hay análisis, ejecutar analyze-tasks.js
  if (!analysis) {
    console.log('\n⚠️  No analysis found. Running analyze-tasks.js...\n');
    analysis = await runAnalyzeTasks();
  }
  
  console.log('\n========================================');
  console.log('📋 Processing cards...\n');
  
  let processed = 0;
  let skipped = 0;
  let prCreated = 0;
  
  for (const card of cards) {
    console.log(`\n🔹 Card: ${card.name}`);
    
    // Verificar label del repositorio
    if (!hasRepoLabel(card)) {
      console.log(`   ⏭️  Skipping: No tiene label "${REPO_LABEL}"`);
      skipped++;
      continue;
    }
    
    // Buscar en análisis
    const cardAnalysis = findCardInAnalysis(card.id, analysis);
    
    if (!cardAnalysis) {
      // No está en análisis - ejecutar analyze-tasks.js y verificar
      console.log('   ⚠️  Card not in analysis. Running analyze-tasks.js...');
      analysis = await runAnalyzeTasks();
      const newAnalysis = findCardInAnalysis(card.id, analysis);
      
      if (!newAnalysis) {
        const comment = `🤖 **Auto-PR Check**\n\nEsta tarjeta no fue incluida en el análisis automático. Posibles razones:\n- No cumple con los criterios de prioridad\n- Información incompleta en la descripción\n- Score bajo en el análisis\n\nPor favor revisar y actualizar la tarjeta antes de generar PR.`;
        await addComment(card.id, comment);
        console.log('   ❌ Skipped: Not in analysis. Comment added.');
        skipped++;
        continue;
      }
    }
    
    // Verificar score (asumimos que si está en "ready" es score verde)
    const isInReady = analysis.ready && analysis.ready.some(c => c.id === card.id);
    
    if (!isInReady) {
      const comment = `🤖 **Auto-PR Check**\n\nEsta tarjeta no tiene score verde en el análisis automático. No se generó PR porque:\n- La prioridad no es alta suficiente\n- Hay tareas con mayor prioridad pendientes\n\nRevisar analysis.json para más detalles.`;
      await addComment(card.id, comment);
      console.log('   ❌ Skipped: Score no es verde. Comment added.');
      skipped++;
      continue;
    }
    
    // Generar branch name
    const branchName = generateBranchName(card);
    console.log(`   📄 Branch: ${branchName}`);
    
    // Crear PR (o al menos intentar)
    try {
      const pr = await createPR(card, branchName);
      await commentWithPR(card.id, pr.html_url);
      
      // Mover a "In progress"
      await moveToInProgress(card.id);
      
      prCreated++;
    } catch (error) {
      console.log('   ⚠️  PR creation failed. Card stays in Ready for Development.');
      skipped++;
    }
    
    processed++;
  }
  
  console.log('\n========================================');
  console.log('📊 Summary:');
  console.log(`   Processed: ${processed}`);
  console.log(`   PRs created: ${prCreated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log('========================================\n');
}

// Run
if (require.main === module) {
  main();
}

module.exports = { fetchReadyCards, createPR, generateBranchName };
