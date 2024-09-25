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


app.get('/historical-data', (req, res) => {
    const { dateRange, timeRange } = req.query;

    // Validar que se haya recibido un rango válido
    if (!dateRange || !timeRange) {
        return res.status(400).json({ error: "Invalid date or time range" });
    }

    // Procesar el rango de fechas y horas
    const [startDate, endDate] = dateRange.split(' to ');
    const [startTime, endTime] = timeRange.split(' to ');

    // Consulta a la base de datos para obtener los datos históricos
    const query = `
        SELECT latitude, longitude, timestamp
        FROM coordinates
        WHERE timestamp BETWEEN ? AND ?
        ORDER BY timestamp ASC
    `;

    const startTimestamp = `${startDate} ${startTime}`;
    const endTimestamp = `${endDate} ${endTime}`;

    pool.query(query, [startTimestamp, endTimestamp], (err, results) => {
        if (err) {
            console.error('Error fetching historical data:', err);
            return res.status(500).json({ error: 'Error fetching historical data' });
        }
        res.json(results);
    });
});

app.listen(port, () => {
    console.log(`Server running on http://${DDNS_HOST}`);
});