const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "https://logismart-blweb.vercel.app", 
    methods: ["GET", "POST"]
  }
}); 

// Data storage (for simplicity, we'll use a file)
const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize with default data if file doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  const defaultData = {
    title: "LogiSmart",
    subtitle: "STREAMING STUDIOS",
    playerData: require('./defaultData').initialPlayerData,
    teamData: require('./defaultData').initialTeamData,
    timeStats: require('./defaultData').initialTimeStats,
    timeSlots: ["08:00", "08:30", "09:00", "09:30"],
    feedbackTitle: "Feedback",
    teamTitle: "Team Information",
    timeStatsTitle: "Time Stats",
    footerLeft: "En BJE el GP ya puede mezclar en vivo su propio zapato",
    footerRight: "Bienvenido nuevo BL de 20 minutos 🎉✨",
    timeLabel: "Hora",
    feedbackSections: [
      { id: "teamManager", label: "Team / Shift Manager", score: "1:1", items: ["-", "-", "-"] },
      { id: "shiftLeaders", label: "Shift Leaders", score: "1:1", items: ["-", "-", "-"] },
      { id: "trainers", label: "Trainers", score: "1:1", items: ["-", "-", "-"] }
    ],
    colorConfigs: [
      { code: "B", description: "Blackjack", bgColor: "#BFDBFE", textColor: "#1E40AF" },
      { code: "R", description: "Roulette", bgColor: "#FECACA", textColor: "#991B1B" },
      { code: "P", description: "Poker", bgColor: "#E9D5FF", textColor: "#6B21A8" },
      { code: "G", description: "Game", bgColor: "#BBF7D0", textColor: "#166534" },
      { code: "Y", description: "Yellow", bgColor: "#FEF08A", textColor: "#854D0E" },
      { code: "O", description: "Other", bgColor: "#FED7AA", textColor: "#9A3412" },
      { code: "-", description: "Empty/Default", bgColor: "#F3F4F6", textColor: "#374151" }
    ],
    divideText: "Donde"
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
}

// Read data from file
function readData() {
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data);
}

// Write data to file
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// API endpoint to get all data
app.get('/api/data', (req, res) => {
  const data = readData();
  res.json(data);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Send current data to newly connected client
  socket.emit('initial-data', readData());
  
  // Handle data updates from clients
  socket.on('update-data', (update) => {
    const data = readData();

    if (update.field && update.value !== undefined) {
      const fieldParts = update.field
        .replace(/\[(\d+)\]/g, '.$1') // convierte playerData[0] a playerData.0
        .split('.');

      let target = data;

      // Recorremos hasta el penúltimo campo
      for (let i = 0; i < fieldParts.length - 1; i++) {
        const key = fieldParts[i];

        // Si no existe el camino, lo creamos como objeto
        if (target[key] === undefined || typeof target[key] !== 'object') {
          target[key] = {};
        }

        target = target[key];
      }

      // Último campo que vamos a asignar
      const finalKey = fieldParts[fieldParts.length - 1];
      target[finalKey] = update.value;

      // Guardamos los datos actualizados
      writeData(data);

      // Emitimos el cambio a todos menos al emisor
      socket.broadcast.emit('data-updated', update);
    }
  });

  // Handle complete data replacement
  socket.on('replace-data', (newData) => {
    writeData(newData);
    socket.broadcast.emit('data-replaced', newData);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
