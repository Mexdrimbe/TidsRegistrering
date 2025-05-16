## 🧩 Funktioner

- Skapa projekt
- Registrera start och sluttid för arbete
- Kalenderöversikt med summering av tid
- Automatisk lagring till Google Sheets via Apps Script
- Fungerar direkt i webbläsaren, inget konto behövs

## 📦 Teknik

- **Frontend:** HTML, CSS, JavaScript (ingen ramverk)
- **Backend:** Google Apps Script + Google Sheets
- **Hosting:** GitHub Pages

## 🔧 Installera själv

1. Forka eller klona detta repo
2. Aktivera GitHub Pages under `Settings > Pages`
3. Bygg ett Google Sheets med flikarna:
   - `Projects`: med kolumner `ID`, `Name`
   - `Entries`: med kolumner `TimestampStart`, `TimestampEnd`, `ProjectID`
4. Skapa ett Apps Script med stöd för POST/GET/OPTIONS
5. Klistra in din `/exec`-URL i `app.js`

## 📜 Licens

MIT – se LICENSE-filen.

## 💬 Om projektet

Detta projekt byggdes under våren 2025 som en personlig gåva till min mamma.  

