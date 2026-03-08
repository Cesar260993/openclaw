#!/usr/bin/env node
/**
 * Fetch Trello Cards
 * Extrae todas las cards del board configurado
 * Agrega automáticamente el label "Voltom-Tech/plazalud-infra" a todas las cards
 * 
 * Variables de entorno requeridas:
 * - TRELLO_API_KEY
 * - TRELLO_API_TOKEN
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Cargar configuración
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Usar variables de entorno si existen, sino usar config.json
const apiKey = process.env.TRELLO_API_KEY || config.apis.trello.apiKey.replace(/\$\{TRELLO_API_KEY\}/, '');
const apiToken = process.env.TRELLO_API_TOKEN || config.apis.trello.apiToken.replace(/\$\{TRELLO_API_TOKEN\}/, '');
const boards = config.apis.trello.boards;

// Label para taggear todas las cards del Development Board
const PROJECT_LABEL = 'Voltom-Tech/plazalud-infra';

// Validar que tenemos credenciales
if (!apiKey || apiKey.includes('${')) {
  console.error('❌ ERROR: TRELLO_API_KEY no está configurada');
  console.error('   Setea la variable de entorno: export TRELLO_API_KEY="tu-api-key"');
  console.error('   O carga: source ~/.openclaw/env');
  process.exit(1);
}

if (!apiToken || apiToken.includes('${')) {
  console.error('❌ ERROR: TRELLO_API_TOKEN no está configurada');
  console.error('   Setea la variable de entorno: export TRELLO_API_TOKEN="tu-token"');
  console.error('   O carga: source ~/.openclaw/env');
  process.exit(1);
}

// Helper para hacer requests HTTPS GET
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

// Helper para hacer requests HTTPS PUT
function httpsPut(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    
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

async function fetchTrelloCards() {
  const allCards = [];
  let projectLabelId = null;
  
  for (const boardId of boards) {
    console.log(`📋 Fetching board: ${boardId}`);
    
    // Fetch board info
    const board = await httpsGet(
      `https://api.trello.com/1/boards/${boardId}?key=${apiKey}&token=${apiToken}`
    );
    
    if (!board.id) {
      console.error(`❌ Error fetching board ${boardId}:`, board);
      continue;
    }
    
    console.log(`   Board: ${board.name}`);
    
    // Fetch labels del board para encontrar el label del proyecto
    const labels = await httpsGet(
      `https://api.trello.com/1/boards/${boardId}/labels?key=${apiKey}&token=${apiToken}`
    );
    
    const projectLabel = labels.find(l => l.name === PROJECT_LABEL);
    if (projectLabel) {
      projectLabelId = projectLabel.id;
      console.log(`   🏷️  Project label found: "${PROJECT_LABEL}" (${projectLabel.color})`);
    } else {
      console.log(`   ⚠️  Project label "${PROJECT_LABEL}" not found. Skipping auto-tag.`);
    }
    
    // Fetch all cards
    let cards = await httpsGet(
      `https://api.trello.com/1/boards/${boardId}/cards?key=${apiKey}&token=${apiToken}&members=true&labels=true`
    );
    
    // Asegurar que cards sea un array
    if (!Array.isArray(cards)) {
      console.log(`   No cards or invalid response, treating as empty`);
      cards = [];
    }
    
    console.log(`   Cards found: ${cards.length}`);
    
    // Fetch lists
    const lists = await httpsGet(
      `https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${apiToken}`
    );
    const listMap = {};
    lists.forEach(list => {
      listMap[list.id] = list.name;
    });
    
    // Process cards y agregar label si no lo tiene
    let taggedCount = 0;
    const cardIds = [];
    
    for (const card of cards) {
      cardIds.push(card.id);
      
      const cardLabels = card.labels || [];
      const hasProjectLabel = cardLabels.some(l => l.id === projectLabelId || l.name === PROJECT_LABEL);
      
      // Agregar label si no lo tiene y existe el label
      if (projectLabelId && !hasProjectLabel) {
        try {
          await httpsPut(
            `https://api.trello.com/1/cards/${card.id}/idLabels?key=${apiKey}&token=${apiToken}&value=${projectLabelId}`,
            {}
          );
          taggedCount++;
        } catch (error) {
          console.error(`   ⚠️  Could not tag card "${card.name}": ${error.message}`);
        }
      }
    }
    
    if (taggedCount > 0) {
      console.log(`   ✅ Tagged ${taggedCount} cards with "${PROJECT_LABEL}"`);
      console.log(`   🔄 Refetching cards to get updated labels...`);
      
      // Refetch cards para obtener labels actualizados
      cards = await httpsGet(
        `https://api.trello.com/1/boards/${boardId}/cards?key=${apiKey}&token=${apiToken}&members=true&labels=true`
      );
    }
    
    // Process cards con labels actualizados
    for (const card of cards) {
      allCards.push({
        id: card.id,
        idShort: card.idShort,
        name: card.name,
        desc: card.desc || '',
        idList: card.idList,
        listName: listMap[card.idList] || 'Unknown',
        due: card.due || null,
        dueComplete: card.dueComplete || false,
        start: card.start || null,
        members: card.members ? card.members.map(m => ({ 
          id: m.id, 
          fullName: m.fullName, 
          username: m.username 
        })) : [],
        labels: card.labels || [],
        dateLastActivity: card.dateLastActivity,
        closed: card.closed,
        url: card.shortUrl,
        boardId: boardId,
        boardName: board.name
      });
    }
  }
  
  return allCards;
}

// Ejecutar y guardar resultado
async function main() {
  try {
    console.log('🚀 Starting Trello fetch...\n');
    
    const cards = await fetchTrelloCards();
    
    // Guardar estado
    const statePath = path.join(__dirname, '../state.json');
    const state = {
      lastFetch: new Date().toISOString(),
      totalCards: cards.length,
      cards: cards
    };
    
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    
    console.log('\n✅ Fetch complete!');
    console.log(`   Total cards: ${cards.length}`);
    console.log(`   State saved to: ${statePath}`);
    
    // Resumen por lista
    const byList = {};
    cards.forEach(card => {
      byList[card.listName] = (byList[card.listName] || 0) + 1;
    });
    
    console.log('\n📊 Cards by list:');
    Object.entries(byList).forEach(([list, count]) => {
      console.log(`   ${list}: ${count}`);
    });
    
    // Contar cards con el label del proyecto
    const projectLabel = cards.filter(c => 
      c.labels.some(l => l.name === PROJECT_LABEL)
    ).length;
    console.log(`\n🏷️  Cards tagged with "${PROJECT_LABEL}": ${projectLabel}/${cards.length}`);
    
    return cards;
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export for testing
module.exports = { fetchTrelloCards };

// Run if called directly
if (require.main === module) {
  main();
}
