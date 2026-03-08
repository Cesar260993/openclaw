#!/usr/bin/env node
/**
 * Backlog Reviewer - Product Owner AI
 * Lee cards de todas las listas, analiza requisitos, y comenta gaps/preguntas en Trello
 * 
 * Reglas de Email:
 * - Backlog: SOLO comentarios con sugerencias (NO emails)
 * - Ready for Development / Ready / To Do: Emails si score < 50
 * 
 * Features:
 * - Análisis automático de calidad de requisitos
 * - Templates inteligentes para sugerencias (adaptados por tipo de card)
 * - Email alerts solo para cards en listas "Ready" con score < 50
 * - Reportes JSON para tracking
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Cargar configuración
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const { apiKey, apiToken, boards } = config.apis.trello;
const sendgridConfig = config.apis.sendgrid;

// ============================================================
// GENERACIÓN DE SUGERENCIAS (Templates Inteligentes)
// ============================================================

function generateSuggestedDescription(card) {
  const name = card.name;
  const desc = card.desc || '';
  
  // Plantillas basadas en keywords del nombre
  const templates = {
    'feature': `## 🎯 Objetivo
[Describir el propósito de esta feature y qué problema resuelve]

## 👤 User Story
**Como** [tipo de usuario]
**Quiero** [acción/capacidad específica]
**Para** [beneficio/valor de negocio]

## ✅ Criterios de Aceptación
### Given (Dado)
- [Contexto inicial o precondiciones]

### When (Cuando)
- [Acción del usuario o evento del sistema]

### Then (Entonces)
- [Resultado esperado observable]

## 📋 Definición de Done
- [ ] Código implementado y funcional
- [ ] Tests unitarios escritos
- [ ] Tests de integración (si aplica)
- [ ] Code review aprobado
- [ ] Documentación actualizada (si corresponde)

## 🔗 Dependencias
- [ ] ¿Depende de otras cards? Listar aquí
- [ ] ¿Bloquea otras cards? Listar aquí`,
    
    'fix': `## 🐛 Descripción del Bug
[Describir el comportamiento incorrecto actual]

## ✅ Comportamiento Esperado
[Describir cómo debería funcionar correctamente]

## 📝 Pasos para Reproducir
1. [Paso 1: acción inicial]
2. [Paso 2: navegación/interacción]
3. [Paso 3: observar el error]

## 🔍 Información Adicional
- **Ambiente:** [dev/staging/prod]
- **Browser/Dispositivo:** [si aplica]
- **Frecuencia:** [siempre/a veces/raro]

## ✅ Criterios de Aceptación
- [ ] El bug no se reproduce en las condiciones descritas
- [ ] Tests agregados para prevenir regresión
- [ ] Code review aprobado

## 📋 Definición de Done
- [ ] Bug fix implementado
- [ ] Tests de regresión escritos
- [ ] Code review aprobado
- [ ] Deploy a staging verificado`,
    
    'default': `## 🎯 Objetivo
[¿Qué problema resuelve esta task? ¿Por qué es importante?]

## 👤 User Story
**Como** [rol/usuario]
**Quiero** [capacidad/funcionalidad]
**Para** [beneficio/objetivo]

## ✅ Criterios de Aceptación
- [ ] Criterio 1: [describir condición específica]
- [ ] Criterio 2: [describir condición específica]
- [ ] Criterio 3: [describir condición específica]

## 📋 Definición de Done
- [ ] Código implementado
- [ ] Tests unitarios
- [ ] Tests de integración (si aplica)
- [ ] Code review aprobado
- [ ] Documentación actualizada

## ❓ Preguntas Abiertas
- [ ] ¿Hay dependencias con otros equipos?
- [ ] ¿Se necesita migración de datos?
- [ ] ¿Hay consideraciones de performance?`
  };
  
  // Detectar tipo de card
  const lowerName = name.toLowerCase();
  let templateKey = 'default';
  
  if (lowerName.includes('fix') || lowerName.includes('bug') || lowerName.includes('error') || lowerName.includes('falla')) {
    templateKey = 'fix';
  } else if (lowerName.includes('feature') || lowerName.includes('add') || lowerName.includes('new') || lowerName.includes('crear') || lowerName.includes('implementar')) {
    templateKey = 'feature';
  }
  
  return templates[templateKey];
}

function generateAcceptanceCriteria(card) {
  const name = card.name;
  const desc = card.desc || '';
  const lowerText = (name + ' ' + desc).toLowerCase();
  
  // Criterios por contexto
  const criteriaMap = {
    'login': [
      '- [ ] El usuario puede ingresar email/usuario y contraseña',
      '- [ ] El sistema valida credenciales contra la base de datos',
      '- [ ] Se muestra error claro con credenciales inválidas',
      '- [ ] Se redirige al dashboard tras login exitoso',
      '- [ ] El token de sesión se guarda correctamente',
      '- [ ] El logout invalida la sesión'
    ],
    'form': [
      '- [ ] Todos los campos requeridos están validados (frontend + backend)',
      '- [ ] Se muestran mensajes de error claros y específicos',
      '- [ ] El formulario no se puede enviar si es inválido',
      '- [ ] Los datos se guardan correctamente en la base de datos',
      '- [ ] Se manejan errores de red/conexión',
      '- [ ] El formulario tiene feedback visual (loading, success)'
    ],
    'api': [
      '- [ ] La API responde con los códigos HTTP correctos (200, 201, 400, 404, 500)',
      '- [ ] Los datos de entrada se validan antes de procesar',
      '- [ ] Se manejan errores de timeout y conexión',
      '- [ ] La respuesta sigue el schema/contrato definido',
      '- [ ] Los errores incluyen mensajes descriptivos',
      '- [ ] Hay logging de las requests (sin datos sensibles)'
    ],
    'ui': [
      '- [ ] El diseño es responsive (mobile, tablet, desktop)',
      '- [ ] Los colores y tipografía coinciden con el design system',
      '- [ ] Las animaciones son suaves (< 300ms)',
      '- [ ] Es accesible (keyboard navigation, screen readers, ARIA labels)',
      '- [ ] Los estados (hover, focus, disabled) están implementados',
      '- [ ] Se probó en los browsers soportados'
    ],
    'database': [
      '- [ ] El schema de base de datos está documentado',
      '- [ ] Las migraciones son idempotentes (se pueden correr múltiples veces)',
      '- [ ] Hay rollback para las migraciones',
      '- [ ] Los índices están optimizados para las queries comunes',
      '- [ ] Se probó con datos de prueba realistas'
    ],
    'default': [
      '- [ ] La funcionalidad principal está implementada y funcional',
      '- [ ] Los casos edge están manejados apropiadamente',
      '- [ ] No hay regresiones en funcionalidad existente',
      '- [ ] El código sigue los estándares del proyecto (linting, formato)',
      '- [ ] Los tests cubren los escenarios principales'
    ]
  };
  
  // Detectar contexto
  let criteria = criteriaMap['default'];
  
  for (const [key, value] of Object.entries(criteriaMap)) {
    if (lowerText.includes(key)) {
      criteria = value;
      break;
    }
  }
  
  return criteria.join('\n');
}

// ============================================================
// EMAIL ALERTAS - SendGrid
// ============================================================

async function sendLowScoreAlert(reviews) {
  // Filtrar solo cards en listas "Ready" con score < 50
  // NO enviar emails para cards en Backlog
  const readyListNames = ['ready', 'to do', 'ready for development', 'next up', 'upcoming'];
  
  const lowScoreReadyCards = reviews.filter(r => 
    r.score < 50 && 
    r.listName && 
    readyListNames.some(name => r.listName.toLowerCase().includes(name))
  );
  
  if (lowScoreReadyCards.length === 0) {
    return { skipped: true, reason: 'No cards en listas "Ready" con score < 50' };
  }

  // Verificar si SendGrid está configurado
  if (!sendgridConfig || !sendgridConfig.apiKey || sendgridConfig.apiKey.includes('xxxx')) {
    return { 
      skipped: true, 
      reason: 'SendGrid no configurado. Agrega tu API key en config.json' 
    };
  }

  const emailContent = generateLowScoreEmail(lowScoreReadyCards);

  const emailData = {
    personalizations: [{
      to: [{ email: sendgridConfig.toEmail }],
      subject: `🚨 Alert: ${lowScoreReadyCards.length} card(s) en "Ready" con score crítico (< 50)`
    }],
    from: { email: sendgridConfig.fromEmail, name: 'Backlog Reviewer' },
    content: [{
      type: 'text/html',
      value: emailContent.html
    }]
  };

  try {
    const result = await sendEmail(emailData);
    return { success: true, sent: lowScoreReadyCards.length, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendEmail(emailData) {
  return new Promise((resolve, reject) => {
    const url = new URL('https://api.sendgrid.com/v3/mail/send');
    const postData = JSON.stringify(emailData);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sendgridConfig.apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode });
        } else {
          reject(new Error(`SendGrid API ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Email timeout'));
    });

    req.write(postData);
    req.end();
  });
}

function generateLowScoreEmail(lowScoreCards) {
  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; border: 1px solid #ddd; border-top: none; }
    .card { background: #f8f9fa; padding: 15px; margin: 15px 0; border-left: 4px solid #dc3545; border-radius: 4px; }
    .score { font-size: 24px; font-weight: bold; color: #dc3545; }
    .list { font-size: 14px; color: #007bff; margin: 5px 0; }
    .issues { margin-top: 10px; }
    .issue { color: #666; margin: 5px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-top: 10px; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚨 Alerta: Cards en "Ready" con Requisitos Incompletos</h1>
    <p>Se detectaron ${lowScoreCards.length} tarjeta(s) marcadas como listas para desarrollar pero con score < 50</p>
  </div>
  <div class="content">
    <div class="warning">
      <strong>⚠️ Estas cards NO deberían estar en "Ready" hasta que se mejoren sus requisitos.</strong>
      <br>Mover de vuelta al Backlog o completar la información faltante.
    </div>
    <p>El Backlog Reviewer encontró las siguientes cards que necesitan atención inmediata:</p>
`;

  lowScoreCards.forEach((card, i) => {
    html += `
    <div class="card">
      <h3>${i + 1}. ${escapeHtml(card.cardName)}</h3>
      <p class="list">📁 Lista: <strong>${escapeHtml(card.listName)}</strong></p>
      <p class="score">Score: ${card.score}/100</p>
      <div class="issues">
        <strong>Issues detectados:</strong>
        <ul>
`;
    card.issues.forEach(issue => {
      html += `<li class="issue">${escapeHtml(issue.title)}: ${escapeHtml(issue.description)}</li>`;
    });
    html += `
        </ul>
      </div>
      <a href="${card.cardUrl}" class="button">Ver en Trello →</a>
    </div>
`;
  });

  html += `
    <div class="footer">
      <p>Este email fue generado automáticamente por el Backlog Reviewer.</p>
      <p>Próxima revisión: Lunes, Miércoles y Viernes a las 10:00 AM (America/Montevideo)</p>
      <p><strong>Nota:</strong> Las cards en Backlog NO generan emails, solo sugerencias de mejora.</p>
    </div>
  </div>
</body>
</html>
`;

  return { html };
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================
// TRELLO API HELPERS
// ============================================================

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

function httpsRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);

    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
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

async function getLists(boardId) {
  return await httpsGet(
    `https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${apiToken}`
  );
}

async function getCardsFromList(boardId, listId) {
  const cards = await httpsGet(
    `https://api.trello.com/1/boards/${boardId}/cards?key=${apiKey}&token=${apiToken}`
  );
  return cards.filter(card => card.idList === listId && !card.closed);
}

// ============================================================
// ANÁLISIS DE REQUISITOS
// ============================================================

function analyzeRequirements(card) {
  const analysis = {
    cardId: card.id,
    cardName: card.name,
    cardUrl: card.shortUrl,  // Trello API ya devuelve URL completo
    issues: [],
    suggestions: [],
    questions: [],
    aiSuggestions: {
      description: null,
      acceptanceCriteria: null
    },
    score: 100,
    needsComment: false
  };

  const desc = (card.desc || '').toLowerCase();
  const name = card.name.toLowerCase();

  // 1. Check: ¿Tiene descripción?
  if (!card.desc || card.desc.trim().length === 0) {
    analysis.issues.push({
      type: 'critical',
      title: '❌ Sin Descripción',
      description: 'La card no tiene descripción. Los desarrolladores necesitan contexto.'
    });
    analysis.score -= 30;
    analysis.needsComment = true;
  }

  // 2. Check: ¿Tiene criterios de aceptación?
  const hasAcceptanceCriteria =
    desc.includes('acceptance') ||
    desc.includes('criterio') ||
    desc.includes('given') ||
    desc.includes('cuando') ||
    desc.includes('entonces') ||
    desc.includes('✅') ||
    desc.includes('- [ ]');

  if (!hasAcceptanceCriteria) {
    analysis.issues.push({
      type: 'warning',
      title: '⚠️ Sin Criterios de Aceptación',
      description: 'No hay criterios de aceptación claros (Given/When/Then o checklist).'
    });
    analysis.score -= 20;
    analysis.needsComment = true;
  }

  // 3. Check: ¿Es una User Story bien formada?
  const hasUserStory =
    desc.includes('como') && desc.includes('quiero') && desc.includes('para') ||
    desc.includes('as a') && desc.includes('i want') && desc.includes('so that');

  if (!hasUserStory && !name.includes('fix') && !name.includes('bug')) {
    analysis.suggestions.push({
      type: 'info',
      title: '💡 Sugerencia: Formato User Story',
      description: 'Considera usar: "Como [rol], quiero [acción], para [beneficio]"'
    });
    analysis.score -= 10;
  }

  // 4. Check: ¿Tiene contexto de negocio?
  const hasContext =
    desc.includes('negocio') ||
    desc.includes('objetivo') ||
    desc.includes('propósito') ||
    desc.includes('porque') ||
    desc.includes('razón') ||
    desc.includes('context') ||
    desc.includes('why') ||
    desc.includes('purpose');

  if (!hasContext) {
    analysis.questions.push({
      type: 'question',
      title: '❓ Contexto de Negocio',
      description: '¿Cuál es el objetivo de negocio? ¿Por qué es importante esta feature?'
    });
    analysis.score -= 15;
    analysis.needsComment = true;
  }

  // 5. Check: ¿Hay ambigüedad?
  const ambiguousWords = [
    'quizás', 'tal vez', 'etc', 'algo', 'cosas', 'varios',
    'maybe', 'perhaps', 'stuff', 'things', 'some', 'etc'
  ];

  const foundAmbiguous = ambiguousWords.filter(word =>
    desc.includes(word) || name.includes(word)
  );

  if (foundAmbiguous.length > 0) {
    analysis.issues.push({
      type: 'warning',
      title: '⚠️ Lenguaje Ambiguo',
      description: `Se encontraron palabras vagas: ${foundAmbiguous.join(', ')}. Sé más específico.`
    });
    analysis.score -= 15;
    analysis.needsComment = true;
  }

  // 6. Check: ¿Menciona dependencias?
  const hasDependencies =
    desc.includes('depende') ||
    desc.includes('bloqueado') ||
    desc.includes('después de') ||
    desc.includes('dependency') ||
    desc.includes('blocked');

  if (!hasDependencies && analysis.score < 80) {
    analysis.questions.push({
      type: 'question',
      title: '❓ Dependencias',
      description: '¿Esta task depende de algo? ¿Hay otras cards que deben completarse primero?'
    });
    analysis.score -= 5;
  }

  // 7. Check: ¿Tiene definición de Done?
  const hasDefinitionOfDone =
    desc.includes('done') ||
    desc.includes('terminado') ||
    desc.includes('completo') ||
    desc.includes('entregable') ||
    desc.includes('deliverable');

  if (!hasDefinitionOfDone && analysis.issues.length > 0) {
    analysis.suggestions.push({
      type: 'info',
      title: '💡 Definición de Done',
      description: 'Agrega qué significa "terminado" para esta card (tests, docs, deploy, etc.)'
    });
  }

  // 8. Check: Longitud de la descripción
  if (card.desc && card.desc.length < 50) {
    analysis.issues.push({
      type: 'warning',
      title: '⚠️ Descripción Muy Corta',
      description: `La descripción tiene solo ${card.desc.length} caracteres. Agrega más detalle.`
    });
    analysis.score -= 10;
    analysis.needsComment = true;
  }

  // Asegurar score mínimo de 0
  analysis.score = Math.max(0, analysis.score);

  return analysis;
}

// ============================================================
// GENERAR COMENTARIO
// ============================================================

function generateComment(analysis, card) {
  // Generar sugerencias si hay issues de descripción/criterios
  const needsDescription = analysis.issues.some(i => 
    i.title.includes('Sin Descripción') || i.title.includes('Descripción Muy Corta')
  );
  
  const needsCriteria = analysis.issues.some(i => 
    i.title.includes('Sin Criterios')
  );

  if (needsDescription) {
    analysis.aiSuggestions.description = generateSuggestedDescription(card);
  }

  if (needsCriteria) {
    analysis.aiSuggestions.acceptanceCriteria = generateAcceptanceCriteria(card);
  }

  // Generar comentario
  let comment = `🤖 **AI Product Owner Review**\n\n`;
  comment += `**Score:** ${analysis.score}/100\n\n`;

  if (analysis.issues.length > 0) {
    comment += `---\n### 🔴 Issues a Resolver:\n\n`;
    analysis.issues.forEach(issue => {
      comment += `**${issue.title}**\n${issue.description}\n\n`;
    });
  }

  if (analysis.questions.length > 0) {
    comment += `---\n### ❓ Preguntas:\n\n`;
    analysis.questions.forEach(question => {
      comment += `**${question.title}**\n${question.description}\n\n`;
    });
  }

  // Agregar sugerencias de IA
  if (analysis.aiSuggestions.description || analysis.aiSuggestions.acceptanceCriteria) {
    comment += `---\n### 🤖 Sugerencias de IA (Copiar/Pegar):\n\n`;

    if (analysis.aiSuggestions.description) {
      comment += `**📝 Descripción Sugerida:**\n\`\`\`markdown\n${analysis.aiSuggestions.description}\n\`\`\`\n\n`;
    }

    if (analysis.aiSuggestions.acceptanceCriteria) {
      comment += `**✅ Criterios de Aceptación Sugeridos:**\n\`\`\`markdown\n${analysis.aiSuggestions.acceptanceCriteria}\n\`\`\`\n\n`;
    }
  }

  if (analysis.suggestions.length > 0) {
    comment += `---\n### 💡 Sugerencias:\n\n`;
    analysis.suggestions.forEach(suggestion => {
      comment += `**${suggestion.title}**\n${suggestion.description}\n\n`;
    });
  }

  if (analysis.score >= 80 && analysis.issues.length === 0) {
    comment += `✅ **Esta card está bien documentada.** ¡Buen trabajo!\n\n`;
  }

  comment += `---\n_Review generado automáticamente por Task Tracker - Backlog Reviewer_`;

  return comment;
}

async function addCommentToCard(cardId, comment) {
  const url = `https://api.trello.com/1/cards/${cardId}/actions/comments?key=${apiKey}&token=${apiToken}`;
  const data = { text: comment };

  try {
    const result = await httpsRequest(url, 'POST', data);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  try {
    console.log('🔍 Backlog Reviewer - Starting review...\n');

    const boardId = boards[0];
    console.log(`📋 Board: ${boardId}`);

    // Obtener todas las listas
    const lists = await getLists(boardId);
    console.log(`📁 Listas encontradas: ${lists.map(l => l.name).join(', ')}\n`);

    // Obtener TODAS las cards del board (de todas las listas)
    const allCards = await httpsGet(
      `https://api.trello.com/1/boards/${boardId}/cards?key=${apiKey}&token=${apiToken}`
    );
    
    // Filtrar solo cards abiertas
    const openCards = allCards.filter(card => !card.closed);
    
    // Mapear cards con su lista
    const cardsWithList = openCards.map(card => {
      const list = lists.find(l => l.id === card.idList);
      return {
        ...card,
        listName: list ? list.name : 'Unknown'
      };
    });

    console.log(`📊 Total cards abiertas: ${cardsWithList.length}\n`);

    if (cardsWithList.length === 0) {
      console.log('✅ No hay cards para revisar.');
      return;
    }

    // Analizar cada card
    const reviews = [];

    for (const card of cardsWithList) {
      console.log(`🔍 Reviewing: ${card.name}`);
      console.log(`   📁 Lista: ${card.listName}`);

      const analysis = analyzeRequirements(card);
      analysis.listName = card.listName; // Agregar info de la lista al análisis
      reviews.push(analysis);

      console.log(`   Score: ${analysis.score}/100`);
      console.log(`   Issues: ${analysis.issues.length}`);
      console.log(`   Questions: ${analysis.questions.length}`);
      console.log(`   Needs Comment: ${analysis.needsComment}\n`);
    }

    // Resumen por lista
    const backlogReviews = reviews.filter(r => r.listName.toLowerCase() === 'backlog');
    const readyReviews = reviews.filter(r => 
      ['ready', 'to do', 'ready for development', 'next up'].some(name => 
        r.listName.toLowerCase().includes(name)
      )
    );
    const otherReviews = reviews.filter(r => 
      r.listName.toLowerCase() !== 'backlog' && 
      !['ready', 'to do', 'ready for development', 'next up'].some(name => 
        r.listName.toLowerCase().includes(name)
      )
    );

    console.log('=' .repeat(50));
    console.log('📊 Resumen por Lista:');
    console.log(`   Total cards: ${reviews.length}`);
    console.log(`   Avg Score: ${Math.round(reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length)}/100`);
    console.log(``);
    console.log(`   📁 Backlog: ${backlogReviews.length} cards`);
    console.log(`      Avg Score: ${backlogReviews.length > 0 ? Math.round(backlogReviews.reduce((sum, r) => sum + r.score, 0) / backlogReviews.length) : 'N/A'}/100`);
    console.log(``);
    console.log(`   ✅ Ready/To Do: ${readyReviews.length} cards`);
    console.log(`      Avg Score: ${readyReviews.length > 0 ? Math.round(readyReviews.reduce((sum, r) => sum + r.score, 0) / readyReviews.length) : 'N/A'}/100`);
    console.log(`      Low Score (<50): ${readyReviews.filter(r => r.score < 50).length}`);
    console.log(``);
    console.log(`   🔄 Otras listas: ${otherReviews.length} cards`);
    console.log(`   Need Comments: ${reviews.filter(r => r.needsComment).length}`);
    console.log('=' .repeat(50));

    // Cards que necesitan comentarios
    const needsComments = reviews.filter(r => r.needsComment);

    if (needsComments.length > 0) {
      console.log(`\n📝 Cards que necesitan comentarios:\n`);
      needsComments.forEach((review, i) => {
        console.log(`${i + 1}. ${review.cardName} (Score: ${review.score})`);
        console.log(`   ${review.cardUrl}`);
      });

      // Generar y agregar comentarios
      console.log(`\n🚀 Generando sugerencias y agregando comentarios...\n`);

      for (const review of needsComments) {
        const card = cardsWithList.find(c => c.id === review.cardId);
        const comment = generateComment(review, card);

        console.log(`   Commenting: ${review.cardName}`);
        const result = await addCommentToCard(review.cardId, comment);

        if (result.success) {
          console.log(`   ✅ Comment added!`);
        } else {
          console.log(`   ❌ Error: ${result.error}`);
        }
      }

      console.log(`\n✅ Review complete!`);
    } else {
      console.log(`\n✅ Todas las cards están bien documentadas. No se necesitan comentarios.`);
    }

    // Enviar email si hay cards con score < 50
    console.log(`\n📧 Checking for low score alerts...`);
    const emailResult = await sendLowScoreAlert(reviews);

    if (emailResult.success) {
      console.log(`   ✅ Email sent! ${emailResult.sent} low score card(s) reported.`);
    } else if (emailResult.skipped) {
      console.log(`   ⏭️ Skipped: ${emailResult.reason}`);
    } else {
      console.log(`   ❌ Email failed: ${emailResult.error}`);
    }

    // Guardar reporte
    const reportPath = path.join(__dirname, '../reports/backlog-review.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      reviewedAt: new Date().toISOString(),
      totalCards: reviews.length,
      avgScore: Math.round(reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length),
      byList: {
        backlog: {
          count: backlogReviews.length,
          avgScore: backlogReviews.length > 0 ? Math.round(backlogReviews.reduce((sum, r) => sum + r.score, 0) / backlogReviews.length) : null
        },
        ready: {
          count: readyReviews.length,
          avgScore: readyReviews.length > 0 ? Math.round(readyReviews.reduce((sum, r) => sum + r.score, 0) / readyReviews.length) : null,
          lowScore: readyReviews.filter(r => r.score < 50).length
        },
        other: otherReviews.length
      },
      lowScoreCards: reviews.filter(r => r.score < 50).length,
      lowScoreReadyCards: readyReviews.filter(r => r.score < 50).length,
      cardsWithAiSuggestions: reviews.filter(r => r.aiSuggestions.description || r.aiSuggestions.acceptanceCriteria).length,
      emailSent: emailResult.success || false,
      reviews: reviews.map(r => ({
        cardId: r.cardId,
        cardName: r.cardName,
        cardUrl: r.cardUrl,
        listName: r.listName,
        score: r.score,
        issues: r.issues.length,
        questions: r.questions.length,
        hasAiSuggestions: !!(r.aiSuggestions.description || r.aiSuggestions.acceptanceCriteria)
      }))
    }, null, 2));

    console.log(`\n📁 Reporte guardado: ${reportPath}`);

    return reviews;
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export
module.exports = { analyzeRequirements, generateComment, addCommentToCard, sendLowScoreAlert };

// Run
if (require.main === module) {
  main();
}
