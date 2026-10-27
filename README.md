# StageMedia · Marketinški autopilot

Upišete link ili naziv klijenta, a aplikacija istraži internet i web stranicu, analizira brend, napravi SEO pregled te napiše plan objava za 2 tjedna, 3 gotove objave i 3 oglasa (HR / EN).

## Pokretanje

```bash
npm install
cp .env.example .env.local   # pa upišite ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Bez API ključa radi samo **"Pogledaj primjer"** (snimljeni demo izvještaj).

## Varijable okruženja

| Varijabla | Obavezno | Opis |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | da | Ključ s console.anthropic.com |
| `ACCESS_CODE` | ne | Ako je postavljen, aplikacija radi samo s linkom `?kod=<kod>` (štiti API ključ na javnom linku) |
| `CLAUDE_MODEL` | ne | Zadano `claude-opus-5-5` |
| `CLAUDE_EFFORT` | ne | `low` (zadano), `medium` ili `high` |
| `CLAUDE_FAST` | ne | `0` isključuje fast mode |
| `STAGEMEDIA_URL` | ne | Adresa web aplikacije za linkove iz MCP servera (zadano `http://localhost:3000`) |

## MCP server (Claude Desktop / Claude Code)

`npm run mcp` pokreće MCP server (`mcp/server.mts`) koji Claudeu daje alate za čitanje stranice i spremanje izvještaja, bez API ključa. Izvještaji se spremaju u `reports/` i otvaraju na `/izvjestaj/<id>` dok `npm run dev` radi na istom računalu. `.mcp.json` ga već registrira za Claude Code.

## Provjere

```bash
npm run lint
npx tsc --noEmit
npm run build
```
