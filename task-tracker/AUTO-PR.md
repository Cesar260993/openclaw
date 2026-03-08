# Auto-PR Generator 🤖

Generación automática de Pull Requests desde tarjetas de Trello.

---

## 📋 Descripción

El script `auto-pr.js` automatiza la creación de Pull Requests en GitHub basándose en las tarjetas de Trello que están en la lista **"Ready for Development"**.

### Flujo de Trabajo

```
┌─────────────────────────┐
│  Ready for Development  │
│    (Trello Board)       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  ¿Tiene label del       │
│  repositorio?           │
└──────┬──────┬───────────┘
       │ NO   │ SI
       │      ▼
       │  ┌─────────────────────────┐
       │  │  ¿Tiene score verde     │
       │  │  en analyze-tasks.js?   │
       │  └──────┬──────┬───────────┘
       │         │ NO   │ SI
       │         │      ▼
       │         │  ┌─────────────────────────┐
       │         │  │  Generar PR en GitHub   │
       │         │  │  - Crear branch         │
       │         │  │  - Crear PR             │
       │         │  │  - Mover a In Progress  │
       │         │  │  - Comentar en Trello   │
       │         │  └─────────────────────────┘
       │         │
       │         ▼
       │  ┌─────────────────────────┐
       │  │  Ejecutar analyze-tasks │
       │  │  ¿Pasó el análisis?     │
       │  └──────┬──────┬───────────┘
       │         │ NO   │ SI
       │         │      │
       │         │      └──────┐
       │         │             │
       │         ▼             │
       │  ┌─────────────────────────┐
       │  │  Dejar comentario       │
       │  │  explicando por qué     │
       │  │  no se generó PR        │
       │  └─────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│  Saltar tarjeta         │
│  (comentario opcional)  │
└─────────────────────────┘
```

---

## 🚀 Uso

### Ejecutar Auto-PR

```bash
# Cargar variables de entorno
source ~/.openclaw/env

# Opción 1: Ejecutar directamente
cd /home/admin/.openclaw/workspace/task-tracker
node scripts/auto-pr.js

# Opción 2: Usar run.js con flag
node scripts/run.js --auto-pr

# Opción 3: Usar flag corto
node scripts/run.js -p
```

### Pipeline Completo + Auto-PR

```bash
# Ejecutar pipeline y luego auto-pr
node scripts/run.js && node scripts/run.js --auto-pr
```

---

## 🔧 Configuración

### Variables de Entorno Requeridas

```bash
# Trello
export TRELLO_API_KEY="tu-api-key"
export TRELLO_API_TOKEN="tu-token"

# GitHub (para crear PRs)
export GITHUB_TOKEN="ghp_xxx"
```

### Lista de Trello

- **Nombre:** `Ready for development`
- **ID:** `69ab19cf4fd18af4dcd0909a`

### Label del Repositorio

- **Nombre:** `Voltom-Tech/plazalud-infra`
- **Color:** Azul 🔵

---

## 📊 Criterios de Selección

### ✅ Se Genera PR Cuando:

1. Card está en **"Ready for Development"**
2. Tiene el label **`Voltom-Tech/plazalud-infra`**
3. Tiene **score verde** en `analyze-tasks.js` (está en `analysis.ready`)
4. La descripción contiene información suficiente

### ❌ Se Salta Cuando:

1. **No tiene label del repositorio** → Se salta sin comentario
2. **No está en análisis** → Ejecuta `analyze-tasks.js` primero
3. **Score no es verde** → Deja comentario explicando
4. **Branch ya existe** → Error, se salta con comentario

---

## 💬 Comentarios Automáticos

### Cuando se Genera PR

```
🤖 **Auto-PR Generated**

PR creado: https://github.com/Voltom-Tech/plazalud-infra/pull/XX

El PR ha sido generado automáticamente desde esta tarjeta. 
Revisar y mergear cuando esté listo.
```

### Cuando NO se Genera PR (score bajo)

```
🤖 **Auto-PR Check**

Esta tarjeta no tiene score verde en el análisis automático. 
No se generó PR porque:
- La prioridad no es alta suficiente
- Hay tareas con mayor prioridad pendientes

Revisar analysis.json para más detalles.
```

### Cuando NO se Genera PR (no analizada)

```
🤖 **Auto-PR Check**

Esta tarjeta no fue incluida en el análisis automático. 
Posibles razones:
- No cumple con los criterios de prioridad
- Información incompleta en la descripción
- Score bajo en el análisis

Por favor revisar y actualizar la tarjeta antes de generar PR.
```

---

## 🔄 Flujo Típico

### 1. Crear Card en Trello

```
Título: 🖥️ [INFRA] Configurar VPC para producción
Lista: Ready for Development
Label: Voltom-Tech/plazalud-infra 🔵
Descripción:
  **Responsable:** Infraestructura
  **Tareas:**
  - Crear VPC con 3 subnets públicas
  - Configurar Internet Gateway
  - Setup NAT Gateway para subnets privadas
```

### 2. Ejecutar Pipeline

```bash
# Fetch + Analyze + Alerts
node scripts/run.js
```

### 3. Verificar Score

```bash
# Revisar analysis.json
cat analysis.json | jq '.ready[] | select(.id == "CARD_ID")'
```

### 4. Ejecutar Auto-PR

```bash
# Si score es verde
node scripts/run.js --auto-pr
```

### 5. Resultado

- ✅ PR creado en GitHub
- ✅ Card movida a **"In progress"**
- ✅ Comentario agregado en Trello con link al PR

---

## 📁 Archivos Involucrados

| Archivo | Propósito |
|---------|-----------|
| `scripts/auto-pr.js` | Script principal de Auto-PR |
| `scripts/run.js` | Runner con soporte --auto-pr |
| `analysis.json` | Resultado del análisis de tareas |
| `state.json` | Estado actual de cards de Trello |
| `config.json` | Configuración del task-tracker |

---

## 🛠️ Personalización

### Cambiar Lista de Origen

Editar `AUTO_PR_LIST_ID` en `auto-pr.js`:

```javascript
const READY_FOR_DEV_LIST_ID = '69ab19cf4fd18af4dcd0909a'; // Tu list ID
```

### Cambiar Repositorio

Editar `REPO_LABEL` en `auto-pr.js`:

```javascript
const REPO_LABEL = 'Voltom-Tech/plazalud-infra'; // Tu label
```

### Cambiar Comportamiento de Score

Editar la lógica de verificación en `auto-pr.js`:

```javascript
// Verificar si está en 'ready' (score verde)
const isInReady = analysis.ready && analysis.ready.some(c => c.id === card.id);
```

---

## 🔍 Troubleshooting

### Error: GITHUB_TOKEN no está configurado

```bash
# Verificar variable
echo $GITHUB_TOKEN

# Si está vacía, cargar
source ~/.openclaw/env
```

### Error: Card no tiene label

- Asegurar que la card tiene el label `Voltom-Tech/plazalud-infra`
- El label debe ser exactamente ese nombre (case-sensitive)

### Error: Branch ya existe

- El script intenta crear PR desde una branch que no existe
- Necesitas crear la branch primero o usar un nombre diferente
- El nombre de branch se genera automáticamente desde el título de la card

### Error: 403 Forbidden en GitHub API

- Verificar que el GITHUB_TOKEN tiene permisos de `repo` y `workflow`
- El token debe ser de un usuario con write access al repositorio

---

## 📊 Logs y Monitoreo

### Ver Logs de Ejecución

```bash
# Ejecutar con output detallado
node scripts/auto-pr.js 2>&1 | tee auto-pr.log
```

### Ver PRs Creados

```bash
# GitHub API
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/Voltom-Tech/plazalud-infra/pulls
```

### Ver Cards Procesadas

```bash
# Revisar state.json
cat state.json | jq '.cards[] | select(.labels[].name == "Voltom-Tech/plazalud-infra")'
```

---

## 🔐 Seguridad

### Tokens

- ✅ Los tokens se guardan en `~/.openclaw/env` (fuera del repo)
- ✅ El archivo `.env` está en `.gitignore`
- ❌ **NUNCA** commitear tokens al repositorio

### Permisos de GitHub Token

El token necesita:

- `repo` - Acceso completo a repositorios
- `workflow` - Para actualizar workflows si es necesario

---

## 📝 Ejemplos

### Ejecución Exitosa

```
========================================
🤖 Auto PR Generator
========================================

📋 Fetching cards from "Ready for Development"...
   Found 3 cards

========================================
📋 Processing cards...


🔹 Card: 🖥️ [INFRA] Configurar VPC
   📄 Branch: feat/configurar-vpc-para-produccion-42
   🚀 Creating GitHub PR...
   ✅ PR created: https://github.com/Voltom-Tech/plazalud-infra/pull/1
   💬 Adding comment to card...
   ✅ Comment added
   📤 Moving card to "In progress"...
   ✅ Card moved

========================================
📊 Summary:
   Processed: 1
   PRs created: 1
   Skipped: 2
========================================
```

### Ejecución con Saltos

```
========================================
🤖 Auto PR Generator
========================================

📋 Fetching cards from "Ready for Development"...
   Found 5 cards

========================================
📋 Processing cards...


🔹 Card: 🖥️ [INFRA] Configurar VPC
   ⏭️  Skipping: No tiene label "Voltom-Tech/plazalud-infra"

🔹 Card: 🔄 [MIGRATION] Migrar dominio
   ⚠️  Card not in analysis. Running analyze-tasks.js...
   ❌ Skipped: Not in analysis. Comment added.

🔹 Card: 📦 [SETUP] Configurar Terraform
   📄 Branch: feat/configurar-terraform-15
   🚀 Creating GitHub PR...
   ✅ PR created: https://github.com/Voltom-Tech/plazalud-infra/pull/2
   ✅ Card moved

========================================
📊 Summary:
   Processed: 3
   PRs created: 1
   Skipped: 4
========================================
```

---

## 📚 Recursos

- [GitHub API - Pull Requests](https://docs.github.com/en/rest/pulls/pulls)
- [Trello API - Cards](https://developer.trello.com/docs/api-reference/cards)
- [Terraform - Voltom-Tech/plazalud-infra](https://github.com/Voltom-Tech/plazalud-infra)

---

_Última actualización: 2026-03-08_
