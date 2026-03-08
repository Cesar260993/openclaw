#!/usr/bin/env node
/**
 * Check SendGrid Status
 * Verifica bounces, blocks, spam reports y emails inválidos
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Cargar variables de entorno
const envPath = path.join(__dirname, '../.env');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const apiKey = env.SENDGRID_API_KEY;

// Helper para hacer requests HTTPS GET
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ raw: data });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

// Verificar bounces
async function checkBounces() {
  console.log('\n🔍 Checking Bounces...');
  console.log('   (Emails that couldn\'t be delivered)');
  
  try {
    const result = await httpsGet('https://api.sendgrid.com/v3/suppression/bounces?limit=100');
    const bounces = result.bounces || [];
    
    if (bounces.length === 0) {
      console.log('   ✅ No bounces found');
    } else {
      console.log(`   ⚠️  ${bounces.length} bounce(s) found:`);
      bounces.forEach(b => {
        console.log(`      - ${b.email} (${b.created})`);
        console.log(`        Reason: ${b.reason}`);
      });
    }
    
    return bounces;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return [];
  }
}

// Verificar blocks
async function checkBlocks() {
  console.log('\n🚫 Checking Blocks...');
  console.log('   (Emails blocked by SendGrid)');
  
  try {
    const result = await httpsGet('https://api.sendgrid.com/v3/suppression/blocks?limit=100');
    const blocks = result.blocks || [];
    
    if (blocks.length === 0) {
      console.log('   ✅ No blocks found');
    } else {
      console.log(`   ⚠️  ${blocks.length} block(s) found:`);
      blocks.forEach(b => {
        console.log(`      - ${b.email} (${b.created})`);
      });
    }
    
    return blocks;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return [];
  }
}

// Verificar spam reports
async function checkSpamReports() {
  console.log('\n📢 Checking Spam Reports...');
  console.log('   (Recipients marked email as spam)');
  
  try {
    const result = await httpsGet('https://api.sendgrid.com/v3/suppression/spam_reports?limit=100');
    const reports = result.spam_reports || [];
    
    if (reports.length === 0) {
      console.log('   ✅ No spam reports found');
    } else {
      console.log(`   ⚠️  ${reports.length} spam report(s) found:`);
      reports.forEach(r => {
        console.log(`      - ${r.email} (${r.created})`);
      });
    }
    
    return reports;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return [];
  }
}

// Verificar invalid emails
async function checkInvalidEmails() {
  console.log('\n❌ Checking Invalid Emails...');
  console.log('   (Emails that don\'t exist)');
  
  try {
    const result = await httpsGet('https://api.sendgrid.com/v3/suppression/invalid_emails?limit=100');
    const invalid = result.invalid_emails || [];
    
    if (invalid.length === 0) {
      console.log('   ✅ No invalid emails found');
    } else {
      console.log(`   ⚠️  ${invalid.length} invalid email(s) found:`);
      invalid.forEach(e => {
        console.log(`      - ${e.email} (${e.created})`);
      });
    }
    
    return invalid;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return [];
  }
}

// Verificar sender reputation
async function checkSenderReputation() {
  console.log('\n📊 Checking Sender Reputation...');
  
  try {
    // Get recent email activity
    const result = await httpsGet('https://api.sendgrid.com/v3/stats?limit=10');
    
    if (result.stats && result.stats.length > 0) {
      const stats = result.stats[0].stats;
      console.log('   📈 Recent Activity:');
      console.log(`      - Delivered: ${stats.find(s => s.name === 'delivered')?.value || 0}`);
      console.log(`      - Bounces: ${stats.find(s => s.name === 'bounce')?.value || 0}`);
      console.log(`      - Spam Reports: ${stats.find(s => s.name === 'spam_report')?.value || 0}`);
      console.log(`      - Blocks: ${stats.find(s => s.name === 'blocked')?.value || 0}`);
    } else {
      console.log('   ℹ️  No recent stats available');
    }
    
    return stats;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

// Main
async function main() {
  console.log('🔍 SendGrid Account Health Check');
  console.log('=' .repeat(50));
  
  const [bounces, blocks, spamReports, invalidEmails, stats] = await Promise.all([
    checkBounces(),
    checkBlocks(),
    checkSpamReports(),
    checkInvalidEmails(),
    checkSenderReputation()
  ]);
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 Summary:');
  console.log(`   Bounces: ${bounces.length}`);
  console.log(`   Blocks: ${blocks.length}`);
  console.log(`   Spam Reports: ${spamReports.length}`);
  console.log(`   Invalid Emails: ${invalidEmails.length}`);
  
  const totalIssues = bounces.length + blocks.length + spamReports.length + invalidEmails.length;
  
  if (totalIssues === 0) {
    console.log('\n✅ Account health looks good!');
  } else {
    console.log(`\n⚠️  Found ${totalIssues} issue(s) that may affect deliverability.`);
    console.log('\n💡 Recommendations:');
    console.log('   1. Remove bounced/invalid emails from your list');
    console.log('   2. Verify sender identity in SendGrid dashboard');
    console.log('   3. Use double opt-in for new subscribers');
    console.log('   4. Monitor spam complaint rate (< 0.1%)');
  }
  
  return { bounces, blocks, spamReports, invalidEmails, stats };
}

// Export
module.exports = { checkBounces, checkBlocks, checkSpamReports, checkInvalidEmails };

// Run
if (require.main === module) {
  main().catch(console.error);
}
