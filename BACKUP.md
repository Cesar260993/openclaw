# Backup Automático Diario 🔄

## Configuración Actual

| Elemento | Valor |
|----------|-------|
| **Script** | `/home/admin/.openclaw/workspace/scripts/backup.sh` |
| **Schedule** | Todos los días a las 3:00 AM UTC |
| **Log** | `/home/admin/.openclaw/workspace/backup.log` |
| **Repositorio** | https://github.com/Cesar260993/openclaw |
| **Rama** | `clean-backup` |

## Horarios (convertidos)

| Zona Horaria | Hora de Ejecución |
|--------------|-------------------|
| UTC | 03:00 AM |
| Asia/Shanghai (UTC+8) | 11:00 AM |
| America/Montevideo (UTC-3) | 12:00 AM (medianoche) |
| Perú (UTC-5) | 10:00 PM (día anterior) |

⚠️ **Nota:** El cron usa la hora del sistema (UTC). Ajusta si necesitas otra hora.

---

## ¿Qué hace el script?

1. ✅ Verifica que estás en la rama `clean-backup`
2. ✅ Detecta si hay cambios en el workspace
3. ✅ Si **NO hay cambios** → Omite el backup (sin notificación)
4. ✅ Si **HAY cambios** → Crea commit y hace push a GitHub
5. ✅ Registra todo en `backup.log`

---

## Comandos Útiles

### Ver logs del backup
```bash
tail -50 /home/admin/.openclaw/workspace/backup.log
```

### Ver logs en tiempo real
```bash
tail -f /home/admin/.openclaw/workspace/backup.log
```

### Ejecutar backup manual
```bash
/home/admin/.openclaw/workspace/scripts/backup.sh
```

### Ver cron jobs
```bash
crontab -l
```

### Editar cron jobs
```bash
crontab -e
```

### Ver estado del repositorio
```bash
cd /home/admin/.openclaw/workspace
git status
git log --oneline -5
```

---

## Cambiar el Horario

Edita el crontab:
```bash
crontab -e
```

### Ejemplos de horarios

```bash
# 3:00 AM UTC (actual)
0 3 * * * /home/admin/.openclaw/workspace/scripts/backup.sh

# 2:00 AM UTC
0 2 * * * /home/admin/.openclaw/workspace/scripts/backup.sh

# 6:00 AM UTC
0 6 * * * /home/admin/.openclaw/workspace/scripts/backup.sh

# Cada 12 horas
0 */12 * * * /home/admin/.openclaw/workspace/scripts/backup.sh

# Lunes a Viernes a las 3 AM
0 3 * * 1-5 /home/admin/.openclaw/workspace/scripts/backup.sh
```

### Sintaxis de Cron
```
┌───────────── min (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday = 0)
│ │ │ │ │
* * * * * command
```

---

## Archivos que se respaldan

### ✅ Incluidos (sin secretos)
```
AGENTS.md
SOUL.md
USER.md
IDENTITY.md
TOOLS.md
MEMORY.md
HEARTBEAT.md
README.md
BACKUP.md
scripts/backup.sh
skills/ (6 skills)
hooks/
task-tracker/          ✅ AHORA INCLUIDO (con seguridad de env vars)
├── scripts/           ✅ Todos los scripts .js
├── backlog-reviewer/  ✅ Reviewer automático
├── config.json        ✅ Usa ${VAR} placeholders (sin secretos)
├── peru-holidays-2026.json
├── .gitignore
└── README.md
```

### 🔒 Excluidos (contienen secretos o estado runtime)
```
task-tracker/.env              🔴 Credenciales locales
task-tracker/state.json        🔴 Estado runtime
task-tracker/analysis.json     🔴 Análisis temporal
task-tracker/reports/          🔴 Reportes con datos personales
memory/ (logs diarios)         🔴 Información personal
.git-credentials               🔴 Token de GitHub
~/.openclaw/env                🔴 Variables de entorno del sistema
.openclaw/                     🔴 Estado runtime
.clawdhub/                     🔴 Caché
.clawhub/                      🔴 Caché
*.log (excepto backup.log)     🔴 Logs
```

---

## Solución de Problemas

### El backup no se ejecuta
```bash
# Verificar que cron está corriendo
pgrep cron

# Ver logs del sistema
grep CRON /var/log/syslog | tail -20

# Verificar permisos del script
ls -la /home/admin/.openclaw/workspace/scripts/backup.sh
chmod +x /home/admin/.openclaw/workspace/scripts/backup.sh
```

### Error al hacer push
```bash
# Verificar credenciales de Git
cat ~/.git-credentials

# Verificar conexión a GitHub
curl -H "Authorization: token $(cat ~/.git-credentials | cut -d'@' -f1 | cut -d':' -f3)" https://api.github.com/user
```

### Cambios no se detectan
```bash
# Verificar .gitignore
cat /home/admin/.openclaw/workspace/.gitignore

# Ver estado de git
cd /home/admin/.openclaw/workspace
git status
```

---

## 🔐 Variables de Entorno del Sistema

Las credenciales se almacenan fuera del workspace en `~/.openclaw/env`:

```bash
# Ver archivo
cat ~/.openclaw/env

# Cargar en sesión actual
source ~/.openclaw/env

# Cargar permanentemente (agrega a ~/.bashrc)
echo 'source ~/.openclaw/env' >> ~/.bashrc
```

### Backup de Variables de Entorno

**IMPORTANTE:** Este archivo NO está en GitHub. Haz backup manualmente:

```bash
# Opción 1: Password Manager (Recomendado)
# Copia el contenido a 1Password, Bitwarden, etc.

# Opción 2: Backup encriptado
tar -czf ~/openclaw-env-backup.tar.gz ~/.openclaw/env

# Opción 3: Repo privado separado
# Crea un repo privado solo para credenciales
```

### Variables Configuradas

| Variable | Propósito |
|----------|-----------|
| `TRELLO_API_KEY` | API Key de Trello |
| `TRELLO_API_TOKEN` | Token de autorización Trello |
| `TRELLO_BOARD_ID` | Board ID a monitorear |
| `SENDGRID_API_KEY` | API Key de SendGrid |
| `SENDGRID_FROM_EMAIL` | Email remitente |
| `SENDGRID_TO_EMAIL` | Email destinatario |

---

## Última Actualización

- **Creado:** 2026-03-08
- **Actualizado:** 2026-03-08 (task-tracker incluido)
- **Último backup:** Ver `backup.log`
- **Estado:** ✅ Activo
