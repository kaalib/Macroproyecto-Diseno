const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const app = express();
const port = 3000;

// Configurar la conexión a la base de datos
const pool = mysql.createPool({
    host: 'localhost',
    user: 'isa22',
    password: 'karen4',
    database: 'DesignProject'
});

let locationData = {
    latitude: 'N/A',
    longitude: 'N/A',
    timestamp: 'N/A'
};

// Función para obtener datos de la base de datos
function fetchDataFromDatabase() {
    pool.query('SELECT latitude, longitude, timestamp FROM coordinates ORDER BY timestamp DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return;
        }
        if (results.length > 0) {
            const row = results[0];
            locationData = {
                latitude: row.latitude,
                longitude: row.longitude,
                timestamp: row.timestamp
            };
        }
    });
}

// Actualizar datos cada segundo
setInterval(fetchDataFromDatabase, 1000);

// Configurar la carpeta pública para servir archivos estáticos de la aplicación React
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para obtener datos de ubicación
app.get('/data', (req, res) => {
    res.json(locationData);
});

// Ruta para enviar todos los demás requests a la aplicación React
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
