# Backlog Reviewer - AI Product Owner

Revisa automáticamente las cards del **Backlog**, analiza la calidad de los requisitos, y agrega comentarios con preguntas/gaps directamente en Trello.

**✨ Features:**
- Templates inteligentes para sugerencias (adaptados por tipo de card)
- Email alerts para cards críticas (score < 50)
- Reportes JSON para tracking de calidad

---

## 🎯 **Objetivo**

Ayudar al equipo a tener un backlog bien documentado, actuando como un **Product Owner virtual** que:

1. ✅ Revisa cada card antes de que pase a desarrollo
2. ✅ Identifica requisitos incompletos o ambiguos
3. ✅ Pregunta lo que un desarrollador necesitaría saber
4. ✅ Sugiere mejoras de claridad y formato
5. 🤖 **Genera descripciones sugeridas** (copiar/pegar)
6. 🤖 **Genera criterios de aceptación** automáticos (copiar/pegar)
7. 📧 **Envía email alerts** cuando hay cards con score < 50

---

## 🔍 **Criterios de Análisis**

### **🔴 Issues Críticos (Restan puntos)**

| Issue | Score Impact | Descripción |
|-------|--------------|-------------|
| Sin Descripción | -30 | La card no tiene descripción o es vacía |
| Descripción Muy Corta | -10 | Menos de 50 caracteres |
| Sin Criterios de Aceptación | -20 | No hay Given/When/Then o checklist |
| Lenguaje Ambiguo | -15 | Palabras como "quizás", "etc", "algo" |

### **❓ Preguntas (Restan puntos)**

| Pregunta | Score Impact |
|----------|--------------|
| Contexto de Negocio | -15 |
| Dependencias | -5 |

### **💡 Sugerencias (No restan puntos)**

| Sugerencia | Descripción |
|------------|-------------|
| Formato User Story | Usar "Como [rol], quiero [acción], para [beneficio]" |
| Definición de Done | Especificar qué significa "terminado" |

---

## 📊 **Scoring System**

| Score | Calidad | Acción |
|-------|---------|--------|
| **90-100** | ✅ Excelente | No comenta (está bien documentada) |
| **70-89** | 🟡 Bueno | Comenta sugerencias opcionales |
| **50-69** | 🟠 Regular | Comenta issues y preguntas |
| **< 50** | 🔴 Malo | Comenta críticamente, necesita trabajo |

---

## 🚀 **Uso**

### **Ejecución Manual**

```bash
cd /home/admin/.openclaw/workspace/task-tracker/backlog-reviewer
node review-backlog.js
```

### **Automatizado (Cron)**

El cronjob está configurado para correr **3 veces por semana** (Lunes, Miércoles y Viernes) a las 10 AM:

```bash
# Lunes, Miércoles y Viernes a las 10 AM (America/Montevideo)
0 10 * * 1,3,5
```

---

## 📁 **Archivos Generados**

| Archivo | Descripción |
|---------|-------------|
| `reports/backlog-review.json` | Reporte completo del análisis |
| Comments en Trello | Comentarios en cada card revisada |

---

## 🎨 **Ejemplo de Comentario**

El script agrega comentarios como este en las cards:

```
🤖 **AI Product Owner Review**

**Score:** 50/100

---
### 🔴 Issues a Resolver:

**⚠️ Sin Criterios de Aceptación**
No hay criterios de aceptación claros (Given/When/Then o checklist).

---
### ❓ Preguntas:

**❓ Contexto de Negocio**
¿Cuál es el objetivo de negocio? ¿Por qué es importante esta feature?

**❓ Dependencias**
¿Esta task depende de algo? ¿Hay otras cards que deben completarse primero?

---
### 🤖 Sugerencias de IA (Copiar/Pegar):

**📝 Descripción Sugerida:**
```markdown
## Objetivo
[¿Qué problema resuelve esta task?]

## User Story
Como [tipo de usuario]
Quiero [capacidad/funcionalidad]
Para [beneficio/objetivo de negocio]

## Criterios de Aceptación
### Given
- [Contexto inicial]

### When
- [Acción del usuario o sistema]

### Then
- [Resultado esperado]

## Definición de Done
- [ ] Código implementado
- [ ] Tests unitarios
- [ ] Tests de integración (si aplica)
- [ ] Documentación actualizada
- [ ] Code review aprobado
```

**✅ Criterios de Aceptación Sugeridos:**
```markdown
- [ ] La funcionalidad principal está implementada
- [ ] Los casos edge están manejados
- [ ] No hay regresiones en funcionalidad existente
- [ ] El código sigue los estándares del proyecto
```

---
### 💡 Sugerencias:

**💡 Sugerencia: Formato User Story**
Considera usar: "Como [rol], quiero [acción], para [beneficio]"

**💡 Definición de Done**
Agrega qué significa "terminado" para esta card (tests, docs, deploy, etc.)

---
_Review generado automáticamente por Task Tracker - Backlog Reviewer_
```

---

## ⚙️ **Configuración**

El script usa la misma configuración de Trello que el task-tracker principal:

```json
{
  "apis": {
    "trello": {
      "apiKey": "...",
      "apiToken": "...",
      "boards": ["STrhmjpz"]
    }
  }
}
```

---

## 🤖 **Features de IA**

El sistema genera sugerencias automáticas basadas en el tipo de card:

### **Tipos de Cards Detectadas:**

| Tipo | Keywords | Plantilla |
|------|----------|-----------|
| **Feature** | `feature`, `add`, `new` | User Story + Criterios + Notas técnicas |
| **Bug/Fix** | `fix`, `bug`, `error` | Bug description + Expected behavior + Steps to reproduce |
| **Default** | (otros) | Objetivo + User Story + Given/When/Then + DoD |

### **Criterios de Aceptación por Contexto:**

| Contexto | Criterios Generados |
|----------|---------------------|
| `login` | Validación de credenciales, redirección, errores |
| `form` | Validación de campos, mensajes de error, submit |
| `api` | HTTP codes, validación, timeouts, schema |
| `ui` | Responsive, design system, animaciones, accesibilidad |
| `default` | Funcionalidad principal, edge cases, estándares |

### **Workflow con IA:**

1. El script detecta que falta descripción o criterios
2. Genera una plantilla contextual basada en el nombre/tipo de card
3. Incluye la plantilla en el comentario de Trello
4. El PO/desarrollador **copia, pega y adapta** la sugerencia

---

## 📧 **Email Alerts**

**Regla importante:** Los emails solo se envían para cards en listas **"Ready"** con score < 50.

| Lista | Score < 50 | Acción |
|-------|------------|--------|
| **Backlog** | Sí | ✅ Comentario con sugerencias, ❌ NO email |
| **Ready for Development** | Sí | ✅ Comentario + ✅ Email alert |
| **Ready / To Do** | Sí | ✅ Comentario + ✅ Email alert |
| **In Progress** | Sí | ✅ Comentario, ❌ NO email |
| **Otras listas** | Sí | ✅ Comentario, ❌ NO email |

**Racional:** El backlog es espacio para mejorar, es normal que las cards estén incompletas. Pero si una card está marcada como "Ready for Development", debería estar bien documentada.

### Configurar SendGrid:

Edita `config.json` y agrega tus credenciales:

```json
{
  "apis": {
    "sendgrid": {
      "apiKey": "SG.xxxxxxxxxxxxxxxxxxxxx.xxx...",
      "fromEmail": "noreply@yourdomain.com",
      "toEmail": "admin@yourdomain.com"
    }
  }
}
```

### Obtener API Key de SendGrid:

1. Ve a https://app.sendgrid.com
2. Settings → API Keys
3. Create API Key (Full Access o Restricted)
4. Copia la API key y pégala en `config.json`

### Email Template:

El email incluye:
- Lista de cards con score < 50
- Score de cada card
- Issues detectados
- Links directos a Trello

---

## 🤖 **Próximamente: LLM Real**

La arquitectura está lista para integrar con un LLM real (OpenAI, Anthropic, etc.) para generar sugerencias más inteligentes.

Para activar LLM real en el futuro:
1. Agregar la API key del proveedor en `config.json`
2. Reemplazar `generateSuggestedDescription()` con un call a la API del LLM
3. Reemplazar `generateAcceptanceCriteria()` con un call a la API del LLM

---

## 🛠️ **Personalización**

Para ajustar los criterios de análisis, edita `review-backlog.js`:

```javascript
// Ajustar umbrales
const MIN_DESC_LENGTH = 50;  // Mínimo caracteres en descripción
const SCORE_ISSUE = 30;      // Puntos que resta un issue crítico
const SCORE_WARNING = 15;    // Puntos que resta un warning

// Agregar nuevos criterios
if (!desc.includes('tu-criterio')) {
  analysis.issues.push({...});
}
```

### **Agregar Nuevas Plantillas de IA:**

```javascript
const templates = {
  'tu-tipo': `## Tu plantilla personalizada\n\n- [ ] Tu criterio`,
  // ...
};

const keywords = {
  'tu-keyword': ['- [ ] Tu criterio específico'],
  // ...
};
```

---

## 📈 **Métricas de Calidad**

Puedes trackear la calidad del backlog over time:

```bash
# Ver promedio de score por semana
cat reports/backlog-review.json | jq '.avgScore'
```

**Objetivo:** Mantener el avg score > 70

---

## 🤝 **Workflow Recomendado**

1. **Lunes, Miércoles y Viernes 10 AM:** Backlog Reviewer ejecuta automáticamente
2. **PO/PM:** Revisa los comentarios y responde preguntas
3. **Equipo:** Cards con score < 70 no pasan a "Ready for Development"
4. **Email Alerts:** Si hay cards < 50, el PO recibe email automáticamente
5. **Mejora Continua:** Monitorear avg score semanal

---

**Creado:** 2026-03-07  
**Versión:** 1.0.0
