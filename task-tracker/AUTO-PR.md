# Auto-PR Generator 🤖

Generación automática de Pull Requests desde tarjetas de Trello.

---

## 📋 Descripción

El script `auto-pr.js` automatiza la creación de Pull Requests en GitHub basándose en las tarjetas de Trello que están en la lista **"Ready for Development"**.

### 🔄 Flujo de Trabajo

```
┌─────────────────────────┐
│  Ready for Development  │
│    (Trello Board)       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Auto-PR Generator      │
│  (Crear PR en GitHub)   │
└───────────┬─────────────┘
            │
            │ ✅ Card se MANTIENE en
            │    "Ready for Development"
            │
            ▼
    ┌───────────────────┐
    │  Yo genero código │
    │  (terraform, etc) │
    └──────┬────────────┘
           │
           │ Cuando el código está listo
           ▼
┌─────────────────────────┐
│  node run.js --ready    │
│  (Mover a PR Review)    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Ready for PR Review    │
│  (Esperando merge)      │
└───────────┬─────────────┘
            │
            │
     ┌──────┴──────┐
     │             │
     ▼             ▼
┌─────────┐  ┌──────────────┐
│  Merge  │  │ Observaciones│
│   ✅    │  │   ❌         │
└─────────┘  └──────┬───────┘
                    │
                    │ Usuario regresa
                    │ card a
                    ▼
           ┌─────────────────┐
           │ Ready for Dev   │
           │ (Re-procesar)   │
           └─────────────────┘
```

---

## 🚀 Uso

### 1. Generar PRs Automáticos

```bash
# Cargar variables de entorno
source ~/.openclaw/env

# Ejecutar auto-pr (crea PRs en GitHub)
cd /home/admin/.openclaw/workspace/task-tracker
node scripts/run.js --auto-pr

# O ejecutar directamente
node scripts/auto-pr.js
```

**Resultado:**
- ✅ PR creado en GitHub
- ✅ Card **se mantiene** en "Ready for Development"
- ✅ Comentario agregado en Trello con link al PR

---

### 2. Cuando el Código Está Listo

```bash
# Mover card específica a "Ready for PR Review"
node scripts/run.js --ready <CARD_ID>

# Ejemplo:
node scripts/run.js --ready 69ab5d133a24dba710983243
```

**Cómo obtener el CARD_ID:**
```bash
# Ver cards en state.json
cat state.json | jq '.cards[] | {name, id, listName}'

# O ver en Trello (el ID está en la URL de la card)
```

**Resultado:**
- ✅ Card movida a "Ready for PR Review"
- ✅ Comentario agregado: "Código listo para review"
- ✅ Link al PR incluido

---

### 3. Si Hay Observaciones

El usuario:
1. Revisa el PR en GitHub
2. Deja comentarios con observaciones
3. **Regresa la card a "Ready for Development"** (manual en Trello)
4. Yo proceso las observaciones y genero nuevo código
5. Vuelvo a ejecutar `--ready` cuando esté listo

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

### Al Crear PR

```
🤖 **Auto-PR Generated**

PR creado: #XX

El PR ha sido generado automáticamente desde esta tarjeta.

📋 **Flujo:**
- Card se mantiene en "Ready for Development" hasta que el PR esté listo
- Cuando el PR esté mergeado, la card pasará a "Ready for PR Review"
- Si hay observaciones, regresar la card a "Ready for Development"

🔗 Link: https://github.com/...
```

### Al Marcar como Ready (Código Listo)

```
🤖 **Código Listo para Review**

El código ha sido generado y el PR está listo para revisión.

🔗 PR: https://github.com/...

📋 **Próximos pasos:**
- Revisar el código en GitHub
- Si hay observaciones, regresar card a "Ready for Development"
- Si está OK, hacer merge
```

---

## 🔄 Flujo Completo Ejemplo

### Paso 1: Crear Card en Trello

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

### Paso 2: Ejecutar Pipeline

```bash
# Fetch + Analyze + Alerts
node scripts/run.js
```

### Paso 3: Verificar Score

```bash
# Revisar analysis.json
cat analysis.json | jq '.ready[] | select(.id == "CARD_ID")'
```

### Paso 4: Generar PR Automático

```bash
# Si score es verde
node scripts/run.js --auto-pr
```

**Output:**
```
🔹 Card: 🖥️ [INFRA] Configurar VPC
   📄 Branch: feat/configurar-vpc-42
   🚀 Creating GitHub PR...
   ✅ PR created: #1
   ℹ️  Card stays in "Ready for Development" (pending code generation)
```

### Paso 5: Generar Código (Manual)

```bash
# Yo genero el código Terraform
cd /home/admin/.openclaw/workspace/plazalud-infra
# ... creo archivos .tf ...
git add .
git commit -m "feat: Add VPC configuration"
git push origin feat/configurar-vpc-42
```

### Paso 6: Marcar como Ready

```bash
# Cuando el código está listo
node scripts/run.js --ready 69ab5d133a24dba710983243
```

**Output:**
```
🔹 Card: 🖥️ [INFRA] Configurar VPC
   📤 Moving card to "Ready for PR Review"...
   ✅ Card moved to "Ready for PR Review"
```

### Paso 7: Review y Merge

- Usuario revisa PR en GitHub
- Si está OK → **Merge**
- Si hay observaciones → Regresa card a "Ready for Development"

---

## 📁 Archivos Involucrados

| Archivo | Propósito |
|---------|-----------|
| `scripts/auto-pr.js` | Script principal de Auto-PR |
| `scripts/run.js` | Runner con soporte --auto-pr y --ready |
| `analysis.json` | Resultado del análisis de tareas |
| `state.json` | Estado actual de cards de Trello |
| `config.json` | Configuración del task-tracker |

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

### Error: 403 Forbidden en GitHub API

- Verificar que el GITHUB_TOKEN tiene permisos de `repo` y `workflow`
- El token debe ser de un usuario con write access al repositorio

---

## 📊 Ejemplos de Output

### Ejecución Exitosa (Crear PR)

```
========================================
🤖 Auto PR Generator
========================================

📋 Fetching cards from "Ready for Development"...
   Found 3 cards

========================================
📋 Processing cards...


🔹 Card: 🖥️ [INFRA] Configurar VPC
   📄 Branch: feat/configurar-vpc-42
   🚀 Creating GitHub PR...
   ✅ PR created: #1
   ℹ️  Card stays in "Ready for Development" (pending code generation)

========================================
📊 Summary:
   Processed: 1
   PRs created: 1
   Skipped: 2
========================================

ℹ️  Cuando el código esté listo, mover cards a "Ready for PR Review" manualmente
   O ejecutar: node scripts/run.js --ready <card-id>
```

### Ejecución Exitosa (Marcar como Ready)

```
========================================
📤 Marking card as Ready for PR Review
========================================

🔹 Card: 🖥️ [INFRA] Configurar VPC
   💬 Adding comment: Código listo para review
   📤 Moving card to "Ready for PR Review"...
   ✅ Card moved to "Ready for PR Review"

✅ Card marked as ready for PR review
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

## 📚 Recursos

- [GitHub API - Pull Requests](https://docs.github.com/en/rest/pulls/pulls)
- [Trello API - Cards](https://developer.trello.com/docs/api-reference/cards)
- [Terraform - Voltom-Tech/plazalud-infra](https://github.com/Voltom-Tech/plazalud-infra)

---

_Última actualización: 2026-03-09_
