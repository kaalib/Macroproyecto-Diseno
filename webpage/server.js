require('dotenv').config(); // Carga las variables de entorno desde el archivo .env
const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const app = express();
const port = 80;

// Usa las variables de entorno
const DDNS_HOST = process.env.DDNS_HOST; 

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

let locationData = {
    latitude: 'N/A',
    longitude: 'N/A',
    timestamp: 'N/A'
};

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

setInterval(fetchDataFromDatabase, 8000);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/data', (req, res) => {
    res.json(locationData);
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on http://${DDNS_HOST}`);
});

