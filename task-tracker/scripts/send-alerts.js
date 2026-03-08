#!/usr/bin/env node
/**
 * Send Alerts via SendGrid
 * Envía alertas a los responsables de tareas
 * 
 * Variables de entorno requeridas:
 * - SENDGRID_API_KEY
 * - SENDGRID_FROM_EMAIL
 * - SENDGRID_TO_EMAIL
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Cargar configuración y análisis
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const analysisPath = path.join(__dirname, '../analysis.json');
if (!fs.existsSync(analysisPath)) {
  console.error('❌ No analysis.json found. Run analyze-tasks.js first.');
  process.exit(1);
}
const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));

// Configuración SendGrid desde variables de entorno
const sendgridConfig = {
  apiKey: process.env.SENDGRID_API_KEY,
  from: process.env.SENDGRID_FROM_EMAIL || 'noreply@tasktracker.com',
  to: process.env.SENDGRID_TO_EMAIL || process.env.SENDGRID_FROM_EMAIL
};

// Validar credenciales
if (!sendgridConfig.apiKey) {
  console.error('❌ ERROR: SENDGRID_API_KEY no está configurada');
  console.error('   Setea la variable de entorno: export SENDGRID_API_KEY="tu-api-key"');
  console.error('   O carga: source ~/.openclaw/env');
  process.exit(1);
}

// Helper para hacer requests HTTPS POST
function httpsPost(url, data, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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

// Enviar email vía SendGrid
async function sendEmail(subject, htmlBody, textBody) {
  const url = 'https://api.sendgrid.com/v3/mail/send';
  
  const data = {
    personalizations: [{
      to: [{ email: sendgridConfig.to }],
      subject: subject
    }],
    from: { email: sendgridConfig.from },
    content: [
      {
        type: 'text/plain',
        value: textBody
      },
      {
        type: 'text/html',
        value: htmlBody
      }
    ]
  };
  
  console.log(`\n📤 Sending email via SendGrid to ${sendgridConfig.to}...`);
  console.log(`   From: ${sendgridConfig.from}`);
  console.log(`   Subject: ${subject}`);
  
  try {
    const result = await httpsPost(url, data, sendgridConfig.apiKey);
    console.log(`   ✅ Email sent successfully!`);
    return { success: true };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Agrupar alertas por responsable
function groupAlertsByMember(alerts) {
  const byMember = {};
  
  alerts.forEach(alert => {
    if (alert.members && alert.members.length > 0) {
      alert.members.forEach(member => {
        if (!byMember[member]) {
          byMember[member] = [];
        }
        byMember[member].push(alert);
      });
    } else {
      if (!byMember['Unassigned']) {
        byMember['Unassigned'] = [];
      }
      byMember['Unassigned'].push(alert);
    }
  });
  
  return byMember;
}

// Generar mensaje de alerta (HTML)
function generateAlertHTML(memberName, alerts) {
  // Saludo personalizado
  const greeting = memberName === 'estimado' ? 'Hola estimado' : `Hola ${memberName}`;
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0079bf; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f4f5f7; padding: 20px; border-radius: 0 0 5px 5px; }
    .alert { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #ccc; }
    .alert-overdue { border-left-color: #eb5a46; }
    .alert-due-soon { border-left-color: #f2d600; }
    .alert-stuck { border-left-color: #ff9f1a; }
    .alert-title { font-weight: bold; margin-bottom: 5px; }
    .alert-meta { color: #666; font-size: 12px; }
    .summary { display: flex; gap: 10px; margin-bottom: 20px; }
    .summary-item { background: white; padding: 10px; border-radius: 5px; text-align: center; flex: 1; }
    .summary-number { font-size: 24px; font-weight: bold; }
    .summary-label { font-size: 12px; color: #666; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
    a { color: #0079bf; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Recordatorio de Tareas</h1>
      <p>${greeting}</p>
    </div>
    <div class="content">
      <div class="summary">
        <div class="summary-item">
          <div class="summary-number" style="color: #eb5a46">${alerts.filter(a => a.type === 'OVERDUE').length}</div>
          <div class="summary-label">Vencidas</div>
        </div>
        <div class="summary-item">
          <div class="summary-number" style="color: #f2d600">${alerts.filter(a => a.type === 'DUE_SOON').length}</div>
          <div class="summary-label">Por Vencer</div>
        </div>
        <div class="summary-item">
          <div class="summary-number" style="color: #ff9f1a">${alerts.filter(a => a.type === 'STUCK').length}</div>
          <div class="summary-label">Estancadas</div>
        </div>
      </div>
`;

  alerts.forEach(alert => {
    const alertClass = `alert-${alert.type.toLowerCase()}`;
    const icons = { OVERDUE: '🔴', DUE_SOON: '🟡', STUCK: '🟠' };
    
    html += `
      <div class="alert ${alertClass}">
        <div class="alert-title">${icons[alert.type]} ${alert.name}</div>
        <div>${alert.reason}</div>
        <div class="alert-meta">
          Lista: ${alert.listName} | 
          Board: ${alert.boardName} | 
          <a href="https://trello.com${alert.url}">Ver en Trello</a>
        </div>
      </div>
`;
  });

  html += `
      <div class="footer">
        Generado: ${new Date().toLocaleString('es-UY', { timeZone: config.schedule.timezone })}<br>
        Task Tracker - OpenClaw
      </div>
    </div>
  </div>
</body>
</html>
`;

  return html;
}

// Generar mensaje de alerta (texto plano)
function generateAlertText(memberName, alerts) {
  // Saludo personalizado
  const greeting = memberName === 'estimado' ? 'Hola estimado' : `Hola ${memberName}`;
  let message = `🔔 Recordatorio de Tareas\n\n${greeting},\n\n`;
  
  const overdue = alerts.filter(a => a.type === 'OVERDUE');
  const dueSoon = alerts.filter(a => a.type === 'DUE_SOON');
  const stuck = alerts.filter(a => a.type === 'STUCK');
  
  if (overdue.length > 0) {
    message += `🔴 VENCIDAS (${overdue.length})\n`;
    overdue.forEach(task => {
      message += `   • ${task.name}\n`;
      message += `     ${task.reason}\n`;
      message += `     https://trello.com${task.url}\n\n`;
    });
  }
  
  if (dueSoon.length > 0) {
    message += `🟡 POR VENCER (${dueSoon.length})\n`;
    dueSoon.forEach(task => {
      message += `   • ${task.name}\n`;
      message += `     ${task.reason}\n`;
      message += `     https://trello.com${task.url}\n\n`;
    });
  }
  
  if (stuck.length > 0) {
    message += `🟠 ESTANCADAS (${stuck.length})\n`;
    stuck.forEach(task => {
      message += `   • ${task.name}\n`;
      message += `     ${task.reason}\n`;
      message += `     https://trello.com${task.url}\n\n`;
    });
  }
  
  message += `\nGenerado: ${new Date().toLocaleString('es-UY', { timeZone: config.schedule.timezone })}`;
  
  return message;
}

// Enviar alerta
async function sendAlert(memberName, alerts) {
  // Usar "estimado" si no hay responsable asignado
  const displayName = memberName === 'Unassigned' ? 'estimado' : memberName;
  
  // Generar timestamp único para evitar spam filters
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').substring(0, 14); // YYYYMMDDHHmmss
  const subject = `🔔 ${alerts.length} tarea(s) requieren atención [${timestamp}]`;
  
  const htmlBody = generateAlertHTML(displayName, alerts);
  const textBody = generateAlertText(displayName, alerts);
  
  return await sendEmail(subject, htmlBody, textBody);
}

// Main
async function main() {
  try {
    console.log('🚀 Sending alerts via SendGrid...\n');
    console.log(`   From: ${sendgridConfig.from}`);
    console.log(`   To: ${sendgridConfig.to}\n`);
    
    if (analysis.overdue.length === 0 && analysis.dueSoon.length === 0 && analysis.stuck.length === 0) {
      console.log('✅ No alerts to send!');
      return;
    }
    
    const allAlerts = [
      ...analysis.overdue.map(a => ({ ...a, type: 'OVERDUE' })),
      ...analysis.dueSoon.map(a => ({ ...a, type: 'DUE_SOON' })),
      ...analysis.stuck.map(a => ({ ...a, type: 'STUCK' }))
    ];
    
    const byMember = groupAlertsByMember(allAlerts);
    
    console.log(`📊 Alerts grouped by member: ${Object.keys(byMember).length}\n`);
    
    const results = [];
    
    for (const [member, alerts] of Object.entries(byMember)) {
      const result = await sendAlert(member, alerts);
      results.push(result);
    }
    
    console.log('\n✅ Alert sending complete!');
    console.log(`   Total recipients: ${results.length}`);
    console.log(`   Successful: ${results.filter(r => r.success).length}`);
    console.log(`   Failed: ${results.filter(r => !r.success).length}`);
    
    return results;
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export
module.exports = { groupAlertsByMember, generateAlertHTML, generateAlertText, sendAlert };

// Run
if (require.main === module) {
  main();
}
