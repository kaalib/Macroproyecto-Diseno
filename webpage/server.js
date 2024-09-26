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

app.get('/historical_data', (req, res) => {
    const { startDate, endDate, startTime, endTime } = req.body;

    // Si no se proporciona la hora, asumimos que el usuario solo seleccionó fechas
    let startDateTime, endDateTime;

    if (startTime && endTime) {
        // Caso 2: Si el usuario selecciona tanto fechas como horas
        startDateTime = `${startDate} ${startTime}`;
        endDateTime = `${endDate} ${endTime}`;
    } else {
        // Caso 1: Solo se seleccionan fechas, se asume todo el día para ambas fechas
        startDateTime = `${startDate} 00:00:00`;
        endDateTime = `${endDate} 23:59:59`;
    }

    // Validación si las fechas/hours están correctamente ingresadas
    if (new Date(startDateTime) > new Date(endDateTime)) {
        return res.status(400).json({ error: 'El rango de fechas o de horas es incorrecto.' });
    }

    const query = `
        SELECT latitude, longitude, timestamp 
        FROM coordinates 
        WHERE timestamp BETWEEN ? AND ?
        ORDER BY timestamp ASC`;

    pool.query(query, [startDateTime, endDateTime], (err, results) => {
        if (err) {
            console.error('Error fetching historical data:', err);
            return res.status(500).json({ error: 'Error fetching historical data' });
        }

        // Enviar las ubicaciones obtenidas al cliente
        res.json({ locations: results });
    });
});



app.listen(port, () => {
    console.log(`Server running on http://${DDNS_HOST}`);
});