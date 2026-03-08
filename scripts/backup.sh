#!/bin/bash
# ===========================================
# OpenClaw Workspace - Backup Automático Diario
# ===========================================
# Se ejecuta todos los días a las 3:00 AM
# Solo hace backup si hay cambios
# ===========================================

set -e

# Configuración
WORKSPACE_DIR="/home/admin/.openclaw/workspace"
BACKUP_LOG="/home/admin/.openclaw/workspace/backup.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
DATE_SHORT=$(date '+%Y-%m-%d')

# Función para loguear
log() {
    echo "[$TIMESTAMP] $1" | tee -a "$BACKUP_LOG"
}

# Función para enviar notificación (opcional)
notify() {
    local message="$1"
    # Si hay un sistema de notificaciones, se puede integrar aquí
    # Por ahora solo loguea
    log "NOTIF: $message"
}

# ===========================================
# INICIO DEL BACKUP
# ===========================================

log "=========================================="
log "Iniciando backup diario de OpenClaw"
log "=========================================="

# Cambiar al directorio del workspace
cd "$WORKSPACE_DIR"

# Verificar que estamos en la rama correcta
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "clean-backup" ]; then
    log "⚠️  WARNING: No estás en la rama 'clean-backup'. Rama actual: $CURRENT_BRANCH"
    log "⚠️  Cambiando a clean-backup..."
    git checkout clean-backup 2>/dev/null || {
        log "❌ ERROR: No se pudo cambiar a clean-backup"
        exit 1
    }
fi

# Verificar estado de git
log "Verificando cambios en el workspace..."
GIT_STATUS=$(git status --porcelain)

if [ -z "$GIT_STATUS" ]; then
    log "✅ No hay cambios. Backup omitido."
    log "=========================================="
    exit 0
fi

# Hay cambios - mostrar resumen
log "📝 Cambios detectados:"
echo "$GIT_STATUS" | while read -r line; do
    log "   $line"
done

# Contar archivos cambiados
CHANGED_FILES=$(echo "$GIT_STATUS" | wc -l)
log "📊 Total de archivos modificados: $CHANGED_FILES"

# Agregar todos los cambios
log "Agregando cambios al staging..."
git add -A

# Verificar qué se va a commitear
STAGED=$(git diff --cached --name-only)
if [ -z "$STAGED" ]; then
    log "⚠️  No hay cambios para commitear (posiblemente archivos en .gitignore)"
    log "=========================================="
    exit 0
fi

# Crear commit
COMMIT_MSG="chore: Auto-backup $DATE_SHORT - $CHANGED_FILES archivos modificados"
log "Creando commit: $COMMIT_MSG"
git commit -m "$COMMIT_MSG" || {
    log "⚠️  No se creó commit (posiblemente sin cambios reales)"
    log "=========================================="
    exit 0
}

# Hacer push
log "Subiendo cambios a GitHub..."
PUSH_OUTPUT=$(git push 2>&1) || {
    log "❌ ERROR al hacer push:"
    echo "$PUSH_OUTPUT" | tee -a "$BACKUP_LOG"
    notify "❌ Backup falló - Error al subir a GitHub"
    exit 1
}

# Éxito
log "✅ Backup completado exitosamente"
log "📦 Cambios subidos a: https://github.com/Cesar260993/openclaw"
notify "✅ Backup completado - $CHANGED_FILES archivos actualizados"

# Mostrar último commit
log "Último commit:"
git log --oneline -1 | while read -r line; do
    log "   $line"
done

log "=========================================="
log "Backup finalizado"
log "=========================================="

exit 0
