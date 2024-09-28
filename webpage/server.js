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

//Handled GET request to the '/historics' endpoint
app.get('/historics', (req, res) => {
    const { startDate, endDate } = req.query;

    // Validate that both start date and end date are provided
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Please provide both hora1 and hora2 query parameters.' });
    }
    // Construct SQL query to retrieve locations within the specified data range
    const query = `SELECT * FROM coordinates WHERE timestamp BETWEEN '${startDate}' AND '${endDate}'`;
    pool.query(query, (err, results) => {
        if (err) throw err;
        res.json(results)
    });
});


app.listen(port, () => {
    console.log(`Server running on http://${DDNS_HOST}`);
});