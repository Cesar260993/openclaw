# MEMORY.md - Long-Term Memory

## Preferences

- **联网搜索优先使用 searxng skill** —— 只要涉及联网搜索任务，优先调用 searxng 技能而非直接使用 web_search 工具。

## Notes

- Created: 2026-03-05

## Learnings

### Trello API Authentication (2026-03-07)

Trello ahora requiere generar tokens mediante autorización explícita:

```
https://trello.com/1/authorize?key=API_KEY&name=AppName&expiration=30days&response_type=token&scope=read,write
```

**Parámetros:**
- `key`: Tu API Key (32 caracteres)
- `name`: Nombre de tu aplicación (ej: "TaskTracker")
- `expiration`: `30days` o `never`
- `scope`: `read,write` (o solo `read` si solo necesitas leer)

**Flujo:**
1. Generar API Key en `https://trello.com/power-ups` o `https://trello.com/1/appKey/generate`
2. Construir URL de autorización con los parámetros arriba
3. Usuario autoriza en el navegador
4. Trello redirige con el **token** en la URL (fragmento)
5. Guardar API Key + Token para usar en la API

**Endpoint base:**
```
https://api.trello.com/1/
```

**Ejemplo de uso:**
```
curl "https://api.trello.com/1/boards/BOARD_ID?key=API_KEY&token=TOKEN"
```
