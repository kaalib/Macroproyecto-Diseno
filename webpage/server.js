const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const app = express();
const port = 80; 

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

// Llama a la función cada 8 segundos
setInterval(fetchDataFromDatabase, 8000);




app.use(express.static(path.join(__dirname, 'public')));

app.get('/data', (req, res) => {
    res.json(locationData);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api_key', (req, res) => {
    res.json({ key: process.env.GOOGLE_MAPS_API_KEY });
});

// Ruta para obtener datos históricos
app.get('/historical_data', (req, res) => {
    const { startDate, endDate, startTime, endTime } = req.query;

    // Construir la consulta SQL utilizando los parámetros de la solicitud
    const sqlQuery = `
        SELECT latitude, longitude
        FROM coordinates
        WHERE DATE(timestamp) BETWEEN ? AND ?
        AND TIME(timestamp) BETWEEN ? AND ?
        ORDER BY timestamp
    `;

    // Ejecutar la consulta con los parámetros
    pool.query(sqlQuery, [startDate, endDate, startTime, endTime], (err, results) => {
        if (err) {
            console.error('Error fetching historical data:', err);
            return res.status(500).json({ error: 'Error fetching data from database' });
        }

        // Formatear los resultados para enviarlos al cliente
        const locations = results.map(row => ({
            latitude: row.latitude,
            longitude: row.longitude
        }));

        res.json({ locations }); // Enviar los datos de vuelta al cliente
    });
});





app.listen(port, () => {
    console.log(`Server running on http://${DDNS_HOST}`);
});