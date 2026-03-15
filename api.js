/**
 * Salon API Service – ersetzt den Google Sheets Service.
 * Kommuniziert mit dem lokalen Express/SQLite-Backend.
 */

const API_BASE = '/api';

// ─── HILFSFUNKTION ────────────────────────────────────────────────────────────

async function apiCall(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json();
  return data;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const loginUser = async (email, passwort) => {
  return await apiCall('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, passwort })
  });
};

export const registerUser = async (userData) => {
  return await apiCall('/api/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
};

// ─── SALON DATEN ──────────────────────────────────────────────────────────────

export const fetchAllSalonData = async () => {
  try {
    const [leistungen, mitarbeiter] = await Promise.all([
      apiCall('/api/leistungen'),
      apiCall('/api/mitarbeiter')
    ]);

    // Leistungen in das erwartete Format umwandeln
    const frauenOrder = [
      "waschen, schneiden, föhnen",
      "ansatz farbe",
      "strähnen",
      "waschen und föhnen",
      "schneiden"
    ];

    const services = leistungen.map(s => {
      const catLower = (s.kategorie || '').toLowerCase();
      let category = 'Damen';
      if (catLower.includes('kinder')) category = 'Kinder';
      else if (catLower.includes('herren') || catLower.includes('männer')) category = 'Herren';

      return {
        id: s.id,
        category,
        name: s.bezeichnung,
        duration: s.arbeitszeit,
        buffer: s.einwirkzeit,
        price: s.preis,
        priceStr: s.preis
      };
    }).filter(s => s.name && s.name.trim() !== '');

    services.sort((a, b) => {
      if (a.category === 'Damen' && b.category === 'Damen') {
        const idxA = frauenOrder.indexOf(a.name.toLowerCase().trim());
        const idxB = frauenOrder.indexOf(b.name.toLowerCase().trim());
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
      }
      return 0;
    });

    // Mitarbeiter in das erwartete Format umwandeln
    const staffMembers = mitarbeiter.map(m => ({
      id: m.id,
      name: m.name,
      specialty: m.fachgebiet || ''
    }));

    return { services, staffMembers };
  } catch (error) {
    console.error('Fehler beim Laden der Salon-Daten:', error);
    return { services: [], staffMembers: [] };
  }
};

// ─── KUNDEN ───────────────────────────────────────────────────────────────────

export const fetchCustomers = async () => {
  try {
    const kunden = await apiCall('/api/kunden');
    return kunden.map(k => ({
      id: k.id,
      name: k.name,
      firstName: k.vorname,
      lastName: k.nachname,
      email: k.email,
      phone: k.telefon,
      'E-Mail': k.email,
      'Vorname': k.vorname,
      'Nachname': k.nachname,
      'Handynummer': k.telefon
    }));
  } catch (error) {
    console.error('Fehler beim Laden der Kunden:', error);
    return [];
  }
};

export const saveCustomer = async (customerData) => {
  // Diese Funktion wird durch registerUser ersetzt, bleibt aber für Kompatibilität
  return await registerUser({
    vorname: customerData['Vorname'] || '',
    nachname: customerData['Nachname'] || '',
    email: customerData['E-Mail'] || '',
    telefon: customerData['Handynummer'] || '',
    passwort: customerData['Passwort'] || '',
    datenschutz: customerData['Datenschutz'] || 'Akzeptiert'
  });
};

// ─── BUCHUNGEN ────────────────────────────────────────────────────────────────

export const fetchBookings = async () => {
  try {
    const buchungen = await apiCall('/api/buchungen');
    return buchungen.map(b => ({
      id: b.id,
      customerName: b.kunde,
      customerPhone: b.telefon,
      customerEmail: b.email,
      date: b.datum,
      time: b.uhrzeit,
      staffName: b.mitarbeiter,
      serviceName: b.dienstleistung,
      status: b.status,
      storniert: b.storniert,
      bestaetigt: b.bestaetigt,
      blocks: b.blocks
    }));
  } catch (error) {
    console.error('Fehler beim Laden der Buchungen:', error);
    return [];
  }
};

export const saveBooking = async (bookingData) => {
  try {
    return await apiCall('/api/buchungen', {
      method: 'POST',
      body: JSON.stringify({
        kunde: bookingData.customerName || '',
        telefon: bookingData.customerPhone || '',
        email: bookingData.customerEmail || '',
        datum: bookingData.date || '',
        uhrzeit: bookingData.time || '',
        mitarbeiter: bookingData.staffName || '',
        dienstleistung: bookingData.serviceName || '',
        blocks: bookingData.blocks || ''
      })
    });
  } catch (error) {
    console.error('Fehler beim Speichern der Buchung:', error);
    return { success: false, error: error.message };
  }
};

export const updateBooking = async (bookingData) => {
  try {
    return await apiCall(`/api/buchungen/${bookingData.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        kunde: bookingData.customerName,
        telefon: bookingData.customerPhone,
        email: bookingData.customerEmail,
        datum: bookingData.date,
        uhrzeit: bookingData.time,
        mitarbeiter: bookingData.staffName,
        dienstleistung: bookingData.serviceName,
        status: bookingData.status,
        blocks: bookingData.blocks
      })
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Buchung:', error);
    return { success: false, error: error.message };
  }
};

export const deleteBooking = async (bookingId) => {
  try {
    return await apiCall(`/api/buchungen/${bookingId}`, { method: 'DELETE' });
  } catch (error) {
    console.error('Fehler beim Löschen der Buchung:', error);
    return { success: false, error: error.message };
  }
};

// ─── STAMMDATEN ───────────────────────────────────────────────────────────────

export const updateMasterData = async (type, action, data) => {
  try {
    return await apiCall('/api/masterdata', {
      method: 'POST',
      body: JSON.stringify({ type, subAction: action, data })
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Stammdaten:', error);
    return { success: false, error: error.message };
  }
};
