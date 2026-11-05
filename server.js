const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./unireserve.db', (err) => {
  if (err) console.error('Error al conectar BD:', err.message);
  else console.log('Conectado a SQLite (unireserve.db).');
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS spaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      building TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spaceId TEXT NOT NULL,
      date TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      status TEXT DEFAULT 'Confirmada'
    )
  `);

  db.get("SELECT COUNT(*) AS count FROM spaces", (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare("INSERT INTO spaces VALUES (?, ?, ?, ?, ?)");
      stmt.run('sp-01', 'Aula Magna', 'Auditorio', 120, 'Bloque A');
      stmt.run('sp-02', 'Laboratorio de Software', 'Sala de Informática', 30, 'Bloque B');
      stmt.run('sp-03', 'Aula 204', 'Aula', 40, 'Bloque C');
      stmt.finalize();
      console.log('Datos iniciales de prueba insertados.');
    }
  });
});

app.get('/api/spaces', (req, res) => {
  db.all("SELECT * FROM spaces", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/reservations', (req, res) => {
  const { spaceId, date, startTime, endTime } = req.body;
  if (!spaceId || !date || !startTime || !endTime) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  const sql = `INSERT INTO reservations (spaceId, date, startTime, endTime) VALUES (?, ?, ?, ?)`;
  db.run(sql, [spaceId, date, startTime, endTime], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, spaceId, date, startTime, endTime, status: 'Confirmada' });
  });
});

app.get('/api/reservations', (req, res) => {
  db.all("SELECT * FROM reservations", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.delete('/api/reservations/:id', (req, res) => {
  db.run("DELETE FROM reservations WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Reserva eliminada' });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
