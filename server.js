const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();
const PORT = process.env.PORT || 3000;

// Autoriser les requêtes cross-origin (depuis ton front GitHub Pages)
app.use(cors());
app.use(express.json());

// --- MQTT vers le broker cloud ---
const MQTT_URL = 'mqtt://broker.emqx.io:1883';

const mqttClient = mqtt.connect(MQTT_URL);

mqttClient.on('connect', () => {
  console.log('✅ Connecté à MQTT broker.emqx.io');
});

mqttClient.on('error', (err) => {
  console.error('❌ Erreur MQTT :', err.message);
});

// Pour le moment on stocke juste en mémoire si les tâches sont faites
let tasksDone = false;

// --- API pour gérer les tâches ---

// Reset des tâches (par ex. début de journée)
app.post('/api/tasks/reset', (req, res) => {
  tasksDone = false;
  res.json({ ok: true, tasksDone });
});

// Marquer toutes les tâches comme faites (on raffinera plus tard)
app.post('/api/tasks/complete', (req, res) => {
  tasksDone = true;
  res.json({ ok: true, tasksDone });
});

// Récupérer l’état des tâches
app.get('/api/tasks/status', (req, res) => {
  res.json({ tasksDone });
});

// --- API pour contrôler une prise ---
// name = nom de la prise (ex : "prise_salon")

app.post('/api/devices/:name/command', (req, res) => {
  const deviceName = req.params.name;
  const { action } = req.body; // "on" | "off" | "logical" | "toggle"

  if (!mqttClient.connected) {
    return res.status(500).json({ error: 'MQTT non connecté' });
  }

  let payload;

  if (action === 'logical') {
    if (!tasksDone) {
      return res.status(403).json({ error: 'Tâches non terminées' });
    }
    payload = '1';
  } else if (action === 'on') {
    payload = '1';
  } else if (action === 'off') {
    payload = '0';
  } else if (action === 'toggle') {
    payload = 'toggle';
  } else {
    return res.status(400).json({ error: 'action invalide' });
  }

  const topic = `tasklist/${deviceName}/1/set`;

  mqttClient.publish(topic, payload);

  return res.json({
    ok: true,
    sent: { topic, payload }
  });
});

app.get("/", (req, res) => {
  res.send("OK backend up");
});

app.listen(PORT, () => {
  console.log(`🚀 Backend démarré sur port ${PORT}`);
});
