const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── HILFSFUNKTIONEN ──────────────────────────────────────────────────────────

function formatDate() {
  return new Date().toLocaleString('de-DE');
}

// ─── AUTH ROUTEN ──────────────────────────────────────────────────────────────

// POST /api/register – Neuen Kunden registrieren
app.post('/api/register', async (req, res) => {
  try {
    const { vorname, nachname, email, telefon, passwort, datenschutz } = req.body;

    if (!vorname || !nachname || !email || !passwort) {
      return res.status(400).json({ success: false, error: 'Pflichtfelder fehlen.' });
    }

    // Prüfen ob E-Mail bereits existiert
    const existing = db.prepare('SELECT id FROM kunden WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ success: false, error: 'Diese E-Mail-Adresse ist bereits registriert.' });
    }

    const hashedPassword = await bcrypt.hash(passwort, 10);
    const id = uuidv4();
    const name = `${vorname} ${nachname}`.trim();

    db.prepare(`
      INSERT INTO kunden (id, vorname, nachname, name, email, telefon, passwort, datenschutz, erstellt_am)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, vorname, nachname, name, email.toLowerCase().trim(), telefon || '', hashedPassword, datenschutz || 'Akzeptiert', formatDate());

    res.json({
      success: true,
      user: { id, name, email: email.toLowerCase().trim(), phone: telefon || '', role: 'customer' }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Serverfehler bei der Registrierung.' });
  }
});

// POST /api/login – Einloggen (Kunde, Mitarbeiter oder Admin)
app.post('/api/login', async (req, res) => {
  try {
    const { email, passwort } = req.body;

    if (!email || !passwort) {
      return res.status(400).json({ success: false, error: 'E-Mail und Passwort erforderlich.' });
    }

    const emailTrimmed = email.trim().toLowerCase();

    // Admin-Login
    if (emailTrimmed.includes('admin') || emailTrimmed === 'diaa') {
      if (passwort === '3074') {
        return res.json({ success: true, role: 'admin', user: { name: 'Salon Admin', role: 'admin' } });
      } else {
        return res.status(401).json({ success: false, error: 'Falsches Admin-Passwort.' });
      }
    }

    // Mitarbeiter-Login (nach Name oder ID)
    const staff = db.prepare(`
      SELECT * FROM mitarbeiter WHERE LOWER(name) = ? OR LOWER(id) = ?
    `).get(emailTrimmed, emailTrimmed);

    if (staff) {
      // Mitarbeiter-Passwort prüfen (falls gesetzt)
      if (staff.passwort && staff.passwort.trim() !== '') {
        if (passwort !== staff.passwort && !(await bcrypt.compare(passwort, staff.passwort).catch(() => false))) {
          return res.status(401).json({ success: false, error: 'Falsches Passwort.' });
        }
      }
      return res.json({
        success: true,
        role: 'staff',
        user: { id: staff.id, name: staff.name, role: 'staff' }
      });
    }

    // Kunden-Login
    const customer = db.prepare('SELECT * FROM kunden WHERE email = ?').get(emailTrimmed);
    if (customer) {
      const passwordMatch = await bcrypt.compare(passwort, customer.passwort);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, error: 'Falsches Passwort.' });
      }
      return res.json({
        success: true,
        role: 'customer',
        user: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.telefon,
          role: 'customer'
        }
      });
    }

    return res.status(404).json({ success: false, error: 'Konto nicht gefunden. Bitte registrieren Sie sich zuerst.' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Serverfehler beim Login.' });
  }
});

// ─── KUNDEN ROUTEN ────────────────────────────────────────────────────────────

// GET /api/kunden – Alle Kunden abrufen
app.get('/api/kunden', (req, res) => {
  try {
    const kunden = db.prepare('SELECT id, vorname, nachname, name, email, telefon, erstellt_am FROM kunden').all();
    res.json(kunden);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen der Kunden.' });
  }
});

// ─── MITARBEITER ROUTEN ───────────────────────────────────────────────────────

// GET /api/mitarbeiter – Alle Mitarbeiter abrufen
app.get('/api/mitarbeiter', (req, res) => {
  try {
    const staff = db.prepare('SELECT id, name, fachgebiet FROM mitarbeiter').all();
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen der Mitarbeiter.' });
  }
});

// POST /api/mitarbeiter – Neuen Mitarbeiter hinzufügen
app.post('/api/mitarbeiter', (req, res) => {
  try {
    const { name, fachgebiet, passwort } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name erforderlich.' });

    const id = req.body.id || `MA${Date.now()}`;
    db.prepare('INSERT OR REPLACE INTO mitarbeiter (id, name, fachgebiet, passwort) VALUES (?, ?, ?, ?)').run(
      id, name, fachgebiet || '', passwort || ''
    );
    res.json({ success: true, id, name });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/mitarbeiter/:id – Mitarbeiter löschen
app.delete('/api/mitarbeiter/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM mitarbeiter WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── LEISTUNGEN ROUTEN ────────────────────────────────────────────────────────

// GET /api/leistungen – Alle Leistungen abrufen
app.get('/api/leistungen', (req, res) => {
  try {
    const leistungen = db.prepare('SELECT * FROM leistungen ORDER BY kategorie, bezeichnung').all();
    res.json(leistungen);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen der Leistungen.' });
  }
});

// POST /api/leistungen – Neue Leistung hinzufügen oder aktualisieren
app.post('/api/leistungen', (req, res) => {
  try {
    const { id, kategorie, bezeichnung, arbeitszeit, einwirkzeit, preis } = req.body;
    if (!bezeichnung || !kategorie) return res.status(400).json({ success: false, error: 'Bezeichnung und Kategorie erforderlich.' });

    const serviceId = id || `SV${Date.now()}`;
    db.prepare(`
      INSERT OR REPLACE INTO leistungen (id, kategorie, bezeichnung, arbeitszeit, einwirkzeit, preis)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(serviceId, kategorie, bezeichnung, parseInt(arbeitszeit) || 30, parseInt(einwirkzeit) || 0, preis || '');
    res.json({ success: true, id: serviceId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/leistungen/:id – Leistung löschen
app.delete('/api/leistungen/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM leistungen WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── BUCHUNGEN ROUTEN ─────────────────────────────────────────────────────────

// GET /api/buchungen – Alle Buchungen abrufen
app.get('/api/buchungen', (req, res) => {
  try {
    const buchungen = db.prepare('SELECT * FROM buchungen ORDER BY datum DESC, uhrzeit ASC').all();
    res.json(buchungen);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen der Buchungen.' });
  }
});

// POST /api/buchungen – Neue Buchung erstellen
app.post('/api/buchungen', (req, res) => {
  try {
    const { kunde, telefon, email, datum, uhrzeit, mitarbeiter, dienstleistung, blocks } = req.body;
    if (!kunde || !datum || !uhrzeit || !mitarbeiter) {
      return res.status(400).json({ success: false, error: 'Pflichtfelder fehlen.' });
    }

    const id = `BK${Date.now()}`;
    db.prepare(`
      INSERT INTO buchungen (id, kunde, telefon, email, datum, uhrzeit, mitarbeiter, dienstleistung, status, blocks, erstellt_am)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Offen', ?, ?)
    `).run(id, kunde, telefon || '', email || '', datum, uhrzeit, mitarbeiter, dienstleistung || '', blocks || '', formatDate());

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/buchungen/:id – Buchung aktualisieren
app.put('/api/buchungen/:id', (req, res) => {
  try {
    const { status, storniert, bestaetigt, kunde, telefon, email, datum, uhrzeit, mitarbeiter, dienstleistung, blocks } = req.body;
    const existing = db.prepare('SELECT * FROM buchungen WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Buchung nicht gefunden.' });

    db.prepare(`
      UPDATE buchungen SET
        status = ?, storniert = ?, bestaetigt = ?,
        kunde = ?, telefon = ?, email = ?,
        datum = ?, uhrzeit = ?, mitarbeiter = ?,
        dienstleistung = ?, blocks = ?
      WHERE id = ?
    `).run(
      status ?? existing.status,
      storniert ?? existing.storniert,
      bestaetigt ?? existing.bestaetigt,
      kunde ?? existing.kunde,
      telefon ?? existing.telefon,
      email ?? existing.email,
      datum ?? existing.datum,
      uhrzeit ?? existing.uhrzeit,
      mitarbeiter ?? existing.mitarbeiter,
      dienstleistung ?? existing.dienstleistung,
      blocks ?? existing.blocks,
      req.params.id
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/buchungen/:id – Buchung löschen
app.delete('/api/buchungen/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM buchungen WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── MASTER DATA (für MasterDataManager Kompatibilität) ──────────────────────

// POST /api/masterdata – Kompatibilitäts-Endpunkt für updateMasterData
app.post('/api/masterdata', (req, res) => {
  try {
    const { type, subAction, data } = req.body;

    if (type === 'services') {
      if (subAction === 'delete') {
        db.prepare('DELETE FROM leistungen WHERE id = ? OR bezeichnung = ?').run(data.id || '', data.name || '');
        return res.json({ success: true });
      } else {
        const id = data.id || `SV${Date.now()}`;
        db.prepare(`
          INSERT OR REPLACE INTO leistungen (id, kategorie, bezeichnung, arbeitszeit, einwirkzeit, preis)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, data.category || data.kategorie || 'Damen', data.name || data.bezeichnung, parseInt(data.duration || data.arbeitszeit) || 30, parseInt(data.buffer || data.einwirkzeit) || 0, data.price || data.preis || '');
        return res.json({ success: true, id });
      }
    }

    if (type === 'staff') {
      if (subAction === 'delete') {
        db.prepare('DELETE FROM mitarbeiter WHERE id = ? OR name = ?').run(data.id || '', data.name || '');
        return res.json({ success: true });
      } else {
        const id = data.id || `MA${Date.now()}`;
        db.prepare('INSERT OR REPLACE INTO mitarbeiter (id, name, fachgebiet, passwort) VALUES (?, ?, ?, ?)').run(
          id, data.name, data.specialty || data.fachgebiet || '', data.passwort || ''
        );
        return res.json({ success: true, id });
      }
    }

    res.status(400).json({ success: false, error: 'Unbekannter Typ.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Salon Backend läuft' });
});

app.listen(PORT, () => {
  console.log(`Salon Backend läuft auf Port ${PORT}`);
});
