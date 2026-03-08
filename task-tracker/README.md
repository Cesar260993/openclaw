# Task Tracker - Sistema de Seguimiento Automatizado

Sistema que monitorea tareas en **Trello**, detecta tareas vencidas/estancadas, envía alertas automáticas por email, y **genera PRs automáticos** desde "Ready for Development".

## 🎯 Características

- ✅ **Fetch** automático de cards desde Trello
- ✅ **Análisis** de tareas (vencidas, por vencer, estancadas)
- ✅ **Alertas** por email vía SendGrid
- ✅ **Auto-PR** desde "Ready for Development" a GitHub
- ✅ **Backup** diario automático a GitHub

## 🔐 Configuración de Variables de Entorno

### Método Recomendado: Variables del Sistema

Las credenciales se almacenan fuera del workspace para mayor seguridad.

**1. Cargar variables del sistema:**
```bash
# Una vez (para sesión actual)
source ~/.openclaw/env

# O permanentemente (agrega a tu ~/.bashrc o ~/.zshrc)
echo 'source ~/.openclaw/env' >> ~/.bashrc
source ~/.bashrc
```

**2. Verificar que están cargadas:**
```bash
echo $TRELLO_API_KEY
echo $SENDGRID_API_KEY
```

### Variables Requeridas

```bash
# Trello
export TRELLO_API_KEY="tu-api-key"
export TRELLO_API_TOKEN="tu-token"
export TRELLO_BOARD_ID="board-id"

# SendGrid
export SENDGRID_API_KEY="tu-sendgrid-key"
export SENDGRID_FROM_EMAIL="tu-email@outlook.com"
export SENDGRID_TO_EMAIL="tu-email@gmail.com"

# GitHub (para Auto-PR)
export GITHUB_TOKEN="ghp_xxx"
```

### Método Alternativo: .env Local (Solo Desarrollo)

Para desarrollo local, puedes usar `.env` (no se sube a GitHub):

```bash
# Copia el ejemplo
cp task-tracker/.env.example task-tracker/.env

# Edita con tus credenciales
nano task-tracker/.env
```

---

## 📋 Estado Actual

- [x] Estructura de archivos creada
- [x] Configurar API keys (Trello)
- [x] Configurar SendGrid para emails
- [x] Definir umbrales de alerta
- [x] Implementar scripts de fetch
- [x] Implementar análisis de tareas
- [x] Implementar envío de alertas
- [x] Variables de entorno del sistema
- [ ] Configurar cron (cada 2 días hábiles)
- [x] Testing

---

## 🔧 Configuración

### 1. Board de Trello

Configura el board en `config.json`:
```json
"trello": {
  "boards": ["STrhmjpz"]
}
```

### 2. Umbrales de Alerta (config.json)

```json
"thresholds": {
  "dueSoon": 3,      // Días antes del vencimiento para alertar
  "stuck": 5,        // Días sin movimiento para considerar "estancada"
  "overdue": 1       // Días después del vencimiento
}
```

### 3. Listas para Detectar Tareas Estancadas

```json
"stuckCheck": {
  "enabled": true,
  "lists": [
    "In progress",
    "Ready for PR Review",
    "Pending for deploy"
  ]
}
```

---

## 🚀 Comandos

### Pipeline Completo

```bash
# Cargar variables de entorno
source ~/.openclaw/env

# Ejecutar pipeline completo (fetch + analyze + alerts)
cd /home/admin/.openclaw/workspace/task-tracker
node scripts/run.js
```

### Auto-PR Generator

```bash
# Generar PRs automáticos desde "Ready for Development"
node scripts/run.js --auto-pr

# O ejecutar directamente
node scripts/auto-pr.js
```

### Scripts Individuales

```bash
# Fetch cards de Trello
node scripts/fetch-trello.js

# Analizar tareas
node scripts/analyze-tasks.js

# Enviar alertas
node scripts/send-alerts.js
```

### Ver Estado y Reportes

```bash
# Ver estado actual
cat state.json

# Ver análisis de tareas
cat analysis.json | jq '.ready, .stuck, .overdue'

# Ver reportes
ls reports/daily/
ls reports/weekly/
```

---

## 📅 Schedule

- **Frecuencia:** Cada 2 días hábiles
- **Timezone:** America/Montevideo (UTC-3)
- **Días hábiles:** Lunes a Viernes
- **Feriados:** peru-holidays-2026.json

---

## 📁 Estructura de Archivos

```
task-tracker/
├── config.json              # Configuración (usa variables de entorno)
├── .env                     # Variables locales (NO subir a Git)
├── .env.example             # Ejemplo para copiar
├── state.json               # Estado actual (gitignore)
├── analysis.json            # Análisis de tareas (gitignore)
├── peru-holidays-2026.json  # Feriados Perú
├── README.md                # Esta documentación
├── AUTO-PR.md               # Docs del Auto-PR Generator
├── scripts/
│   ├── fetch-trello.js      # Extraer cards de Trello
│   ├── analyze-tasks.js     # Analizar tareas vencidas/estancadas
│   ├── send-alerts.js       # Enviar emails de alerta
│   ├── auto-pr.js           # 🆕 Generar PRs automáticos
│   └── run.js               # Runner principal (soporta --auto-pr)
├── backlog-reviewer/
│   └── review-backlog.js    # Reviewer automático del backlog
└── reports/
    ├── daily/               # Reportes diarios (gitignore)
    └── weekly/              # Reportes semanales (gitignore)
```

---

## 🔒 Seguridad

**Las credenciales NUNCA se suben a GitHub:**
- ✅ `config.json` - Usa placeholders `${VAR_NAME}`
- ✅ `.env` - Excluido en `.gitignore`
- ✅ `state.json`, `analysis.json` - Excluidos (datos runtime)
- ✅ `reports/` - Excluido (datos personales)

**Backup de credenciales:**
- Guarda `~/.openclaw/env` en un password manager
- O haz backup encriptado: `tar -czf env-backup.tar.gz ~/.openclaw/env`

---

_Próximo paso: Configurar cron job para ejecución automática_
