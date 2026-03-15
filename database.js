const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'salon.db');
const db = new Database(DB_PATH);

// Verzeichnis erstellen, falls es nicht existiert
const fs = require('fs');
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Pragmas für bessere Performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── TABELLEN ERSTELLEN ────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS kunden (
    id          TEXT PRIMARY KEY,
    vorname     TEXT NOT NULL,
    nachname    TEXT NOT NULL,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    telefon     TEXT,
    passwort    TEXT NOT NULL,
    datenschutz TEXT DEFAULT 'Akzeptiert',
    erstellt_am TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mitarbeiter (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    fachgebiet  TEXT DEFAULT '',
    passwort    TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS leistungen (
    id          TEXT PRIMARY KEY,
    kategorie   TEXT NOT NULL,
    bezeichnung TEXT NOT NULL,
    arbeitszeit INTEGER DEFAULT 30,
    einwirkzeit INTEGER DEFAULT 0,
    preis       TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS buchungen (
    id              TEXT PRIMARY KEY,
    kunde           TEXT NOT NULL,
    telefon         TEXT DEFAULT '',
    email           TEXT DEFAULT '',
    datum           TEXT NOT NULL,
    uhrzeit         TEXT NOT NULL,
    mitarbeiter     TEXT NOT NULL,
    dienstleistung  TEXT DEFAULT '',
    status          TEXT DEFAULT 'Offen',
    storniert       TEXT DEFAULT '',
    bestaetigt      TEXT DEFAULT '',
    blocks          TEXT DEFAULT '',
    erstellt_am     TEXT NOT NULL
  );
`);

// ─── STANDARD-MITARBEITER EINFÜGEN (falls noch nicht vorhanden) ───────────────
const insertStaff = db.prepare(`
  INSERT OR IGNORE INTO mitarbeiter (id, name, fachgebiet, passwort)
  VALUES (?, ?, ?, ?)
`);

const defaultStaff = [
  { id: 'MA001', name: 'Diaa', fachgebiet: 'Damen & Herren', passwort: '3074' },
  { id: 'MA002', name: 'Mitarbeiter 2', fachgebiet: 'Damen', passwort: '' },
];

defaultStaff.forEach(s => insertStaff.run(s.id, s.name, s.fachgebiet, s.passwort));

// ─── STANDARD-LEISTUNGEN EINFÜGEN (falls noch nicht vorhanden) ────────────────
const insertService = db.prepare(`
  INSERT OR IGNORE INTO leistungen (id, kategorie, bezeichnung, arbeitszeit, einwirkzeit, preis)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const defaultServices = [
  // Damen
  { id: 'SV001', kategorie: 'Damen', bezeichnung: 'Waschen, Schneiden, Föhnen', arbeitszeit: 60, einwirkzeit: 0, preis: '45' },
  { id: 'SV002', kategorie: 'Damen', bezeichnung: 'Ansatz Farbe', arbeitszeit: 30, einwirkzeit: 30, preis: '55' },
  { id: 'SV003', kategorie: 'Damen', bezeichnung: 'Strähnen', arbeitszeit: 60, einwirkzeit: 45, preis: '75' },
  { id: 'SV004', kategorie: 'Damen', bezeichnung: 'Waschen und Föhnen', arbeitszeit: 45, einwirkzeit: 0, preis: '35' },
  { id: 'SV005', kategorie: 'Damen', bezeichnung: 'Schneiden', arbeitszeit: 30, einwirkzeit: 0, preis: '30' },
  // Herren
  { id: 'SV006', kategorie: 'Herren', bezeichnung: 'Herrenhaarschnitt', arbeitszeit: 30, einwirkzeit: 0, preis: '25' },
  { id: 'SV007', kategorie: 'Herren', bezeichnung: 'Bart Trimmen', arbeitszeit: 20, einwirkzeit: 0, preis: '15' },
  { id: 'SV008', kategorie: 'Herren', bezeichnung: 'Haarschnitt + Bart', arbeitszeit: 45, einwirkzeit: 0, preis: '35' },
  // Kinder
  { id: 'SV009', kategorie: 'Kinder', bezeichnung: 'Kinderhaarschnitt', arbeitszeit: 30, einwirkzeit: 0, preis: '20' },
];

defaultServices.forEach(s => insertService.run(s.id, s.kategorie, s.bezeichnung, s.arbeitszeit, s.einwirkzeit, s.preis));

module.exports = db;
