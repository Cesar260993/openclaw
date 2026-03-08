# OpenClaw Workspace Backup 🤖

**Backup de configuración de OpenClaw para recuperación en caso de pérdida de datos.**

## 📦 ¿Qué incluye este backup?

### ✅ Archivos de configuración (SÍ incluidos)
- `AGENTS.md` - Instrucciones y comportamiento del agente
- `SOUL.md` - Personalidad y valores del agente
- `USER.md` - Información del usuario
- `IDENTITY.md` - Identidad del agente
- `TOOLS.md` - Notas locales de herramientas
- `MEMORY.md` - Memoria a largo plazo y preferencias
- `HEARTBEAT.md` - Tareas del heartbeat
- `skills/` - Skills instalados (6 skills)
- `hooks/` - Git hooks personalizados

### 🔒 Archivos excluidos (contienen secretos)
- `task-tracker/` - Contiene API keys de Trello, SendGrid, etc.
- `.env` - Variables de entorno con credenciales
- `memory/` - Logs diarios con información personal
- `state.json`, `analysis.json` - Estado runtime
- `.openclaw/`, `.clawdhub/`, `.clawhub/` - Caché y estado local

---

## 🔄 Cómo restaurar este backup

### Prerrequisitos
- Git instalado
- Node.js (para OpenClaw)
- OpenClaw instalado

### Pasos de restauración

```bash
# 1. Clonar el backup
git clone https://github.com/Cesar260993/openclaw.git ~/openclaw-restore
cd ~/openclaw-restore

# 2. Copiar al workspace de OpenClaw
cp -r * ~/.openclaw/workspace/

# 3. Restaurar secretos (desde backup seguro local)
# Copia tus archivos .env y credenciales desde tu backup seguro
cp /path/to/secure/backup/task-tracker/.env ~/.openclaw/workspace/task-tracker/
cp /path/to/secure/backup/.git-credentials ~/.openclaw/workspace/

# 4. Restaurar memoria diaria (opcional)
cp -r /path/to/secure/backup/memory/ ~/.openclaw/workspace/

# 5. Verificar configuración
git config --global user.name "Cesar"
git config --global user.email "cesar.zegarram@gmail.com"

# 6. Reiniciar OpenClaw Gateway
openclaw gateway restart
```

---

## 🛡️ Seguridad

### Archivos sensibles que DEBES guardar por separado

1. **Credenciales de Git**
   ```bash
   ~/.git-credentials
   ```

2. **Task Tracker (.env)**
   - Trello API Key & Token
   - SendGrid API Key
   - Email credentials

3. **Memoria diaria**
   - `memory/YYYY-MM-DD.md` (puede tener info personal)

### Recomendaciones

- ✅ Guarda los secretos en un password manager (1Password, Bitwarden)
- ✅ Haz backup encriptado de tu carpeta `~/.openclaw/` completa
- ✅ Nunca commits secretos a GitHub
- ✅ Rota las API keys si las expusiste accidentalmente

---

## 📊 Estado del backup

| Elemento | Estado | Última actualización |
|----------|--------|---------------------|
| Configuración core | ✅ | 2026-03-08 |
| Skills | ✅ 6 skills | 2026-03-08 |
| Hooks | ✅ | 2026-03-08 |
| Memoria larga | ✅ | 2026-03-08 |
| Secretos | 🔒 Excluidos | - |

---

## 🔧 Mantenimiento

### Actualizar el backup

```bash
cd ~/.openclaw/workspace
git add .
git commit -m "chore: Update backup - $(date +%Y-%m-%d)"
git push
```

### Verificar estado

```bash
cd ~/.openclaw/workspace
git status
git log --oneline -5
```

---

## 📝 Notas

- **Rama principal:** `clean-backup` (sin secretos)
- **Repositorio:** https://github.com/Cesar260993/openclaw
- **Creado:** 2026-03-08
- **Propósito:** Recuperación ante desastres

---

**⚠️ IMPORTANTE:** Este backup NO incluye secretos. Asegúrate de tener un backup seguro y encriptado de:
- `.git-credentials`
- `task-tracker/.env`
- `memory/` (si contiene info sensible)
