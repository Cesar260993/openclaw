#!/usr/bin/env node
/**
 * Analyze Tasks
 * Detecta tareas: vencidas, por vencer, estancadas
 */

const fs = require('fs');
const path = require('path');

// Cargar configuración y estado
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const statePath = path.join(__dirname, '../state.json');
if (!fs.existsSync(statePath)) {
  console.error('❌ No state.json found. Run fetch-trello.js first.');
  process.exit(1);
}
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

// Cargar feriados
const holidaysPath = path.join(__dirname, '../peru-holidays-2026.json');
const holidaysData = JSON.parse(fs.readFileSync(holidaysPath, 'utf8'));
const holidays = holidaysData.holidays.map(h => h.date);

const { dueSoon, stuck, overdue } = config.thresholds;
const timezone = config.schedule.timezone;

// Listas donde se aplica el check de "estancada" (del config o default)
const stuckCheckLists = config.stuckCheck?.lists || [
  'In progress',
  'Ready for PR Review',
  'Pending for deploy'
];

// Helper: Parsear fecha
function parseDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr);
}

// Helper: Diferencia en días
function daysDiff(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((date2 - date1) / oneDay);
}

// Helper: Es día hábil?
function isBusinessDay(date) {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) return false;
  
  const dateStr = date.toISOString().split('T')[0];
  if (holidays.includes(dateStr)) return false;
  
  return true;
}

// Helper: Contar días hábiles entre dos fechas
function businessDaysBetween(start, end) {
  let count = 0;
  const current = new Date(start);
  while (current < end) {
    if (isBusinessDay(current)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// Analizar cards
function analyzeCards(cards) {
  const now = new Date();
  const analysis = {
    analyzedAt: now.toISOString(),
    totalCards: cards.length,
    overdue: [],
    dueSoon: [],
    stuck: [],
    healthy: []
  };
  
  cards.forEach(card => {
    if (card.closed) return; // Ignorar cards cerradas
    
    const cardInfo = {
      id: card.id,
      name: card.name,
      listName: card.listName,
      boardName: card.boardName,
      url: card.url,
      due: card.due,
      members: card.members.map(m => m.fullName),
      lastActivity: card.dateLastActivity
    };
    
    // 1. Check vencidas
    if (card.due) {
      const dueDate = parseDate(card.due);
      const daysUntilDue = daysDiff(now, dueDate);
      
      if (daysUntilDue < 0 && !card.dueComplete) {
        // Vencida
        cardInfo.daysOverdue = Math.abs(daysUntilDue);
        cardInfo.reason = `Vencida hace ${cardInfo.daysOverdue} día(s)`;
        analysis.overdue.push(cardInfo);
        return;
      }
      
      if (daysUntilDue >= 0 && daysUntilDue <= dueSoon) {
        // Por vencer
        cardInfo.daysUntilDue = daysUntilDue;
        cardInfo.reason = `Por vencer en ${cardInfo.daysUntilDue} día(s)`;
        analysis.dueSoon.push(cardInfo);
        return;
      }
    }
    
    // 2. Check estancadas (sin actividad) - Solo en listas específicas
    const shouldCheckStuck = stuckCheckLists.includes(card.listName);
    
    if (shouldCheckStuck && card.dateLastActivity) {
      const lastActivity = parseDate(card.dateLastActivity);
      const daysSinceActivity = daysDiff(lastActivity, now);
      const businessDaysSinceActivity = businessDaysBetween(lastActivity, now);
      
      if (businessDaysSinceActivity >= stuck) {
        cardInfo.daysSinceActivity = daysSinceActivity;
        cardInfo.businessDaysSinceActivity = businessDaysSinceActivity;
        cardInfo.reason = `Sin actividad por ${businessDaysSinceActivity} día(s hábil(es)`;
        analysis.stuck.push(cardInfo);
        return;
      }
    }
    
    // 3. Sana
    analysis.healthy.push(cardInfo);
  });
  
  return analysis;
}

// Generar reporte
function generateReport(analysis) {
  const report = {
    generatedAt: analysis.analyzedAt,
    summary: {
      total: analysis.totalCards,
      overdue: analysis.overdue.length,
      dueSoon: analysis.dueSoon.length,
      stuck: analysis.stuck.length,
      healthy: analysis.healthy.length
    },
    alerts: [
      ...analysis.overdue.map(a => ({ ...a, priority: 'HIGH', type: 'OVERDUE' })),
      ...analysis.dueSoon.map(a => ({ ...a, priority: 'MEDIUM', type: 'DUE_SOON' })),
      ...analysis.stuck.map(a => ({ ...a, priority: 'LOW', type: 'STUCK' }))
    ]
  };
  
  return report;
}

// Main
function main() {
  try {
    console.log('🔍 Analyzing tasks...\n');
    
    const analysis = analyzeCards(state.cards);
    const report = generateReport(analysis);
    
    // Guardar análisis
    const analysisPath = path.join(__dirname, '../analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
    
    // Guardar reporte
    const reportPath = path.join(__dirname, '../reports/daily/', `report-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('✅ Analysis complete!\n');
    console.log('📊 Summary:');
    console.log(`   Total cards: ${report.summary.total}`);
    console.log(`   🔴 Overdue: ${report.summary.overdue}`);
    console.log(`   🟡 Due soon: ${report.summary.dueSoon}`);
    console.log(`   🟠 Stuck: ${report.summary.stuck}`);
    console.log(`   🟢 Healthy: ${report.summary.healthy}`);
    
    if (report.alerts.length > 0) {
      console.log('\n🚨 Alerts generated:', report.alerts.length);
      report.alerts.forEach(alert => {
        console.log(`   [${alert.priority}] ${alert.name} (${alert.reason})`);
      });
    }
    
    console.log('\n📁 Files saved:');
    console.log(`   Analysis: ${analysisPath}`);
    console.log(`   Report: ${reportPath}`);
    
    return report;
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export
module.exports = { analyzeCards, generateReport };

// Run
if (require.main === module) {
  main();
}
