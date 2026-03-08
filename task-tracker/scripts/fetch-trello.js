#!/usr/bin/env node
/**
 * Fetch Trello Cards
 * Extrae todas las cards del board configurado
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

// Helper para hacer requests HTTPS
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

async function fetchTrelloCards() {
  const allCards = [];
  
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
    
    // Process cards
    cards.forEach(card => {
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
    });
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
