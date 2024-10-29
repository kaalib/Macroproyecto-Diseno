const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const app = express();
const axios = require('axios'); 
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

let obdData = {
    rpm: 'N/A',
    speed: 'N/A'
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

// Función para obtener datos de OBD de la base de datos 
function fetchObdDataFromDatabase() {
    pool.query('SELECT rpm, speed FROM OBD ORDER BY id DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching OBD data:', err);
            return;
        }
        if (results.length > 0) {
            const row = results[0];
            obdData = {
                rpm: row.rpm,
                speed: row.speed
            };
        }
    });
}



// Llama a la función cada 8 segundos
setInterval(fetchDataFromDatabase, 8000);
setInterval(fetchObdDataFromDatabase, 8000);



app.use(express.static(path.join(__dirname, 'public')));

app.get('/data', (req, res) => {
    res.json(locationData);
});

// Endpoint OBD data
app.get('/obd_data', (req, res) => {
    res.json(obdData);
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

app.get('/geocode', async (req, res) => {
    const { address } = req.query;

    if (!address) {
        return res.status(400).json({ error: 'Address parameter is required' });
    }

    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        
        const response = await axios.get(geocodeUrl);
        const data = response.data;

        if (data.status === 'OK' && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            res.json({ lat: location.lat, lng: location.lng });
        } else {
            res.status(404).json({ error: 'Address not found' });
        }
    } catch (error) {
        console.error('Error geocoding address:', error);
        res.status(500).json({ error: 'Error processing request' });
    }
});

app.get('/nearbyhistorics', (req, res) => {
    const { lat, lng, radius = 500, startDate, endDate } = req.query;

    // Validar que se han proporcionado lat, lng, startDate y endDate
    if (!lat || !lng || !startDate || !endDate) {
        return res.status(400).json({ error: 'Lat, Lng, startDate y endDate son parámetros requeridos.' });
    }

    // Consulta SQL para filtrar por ubicación (usando el radio) y por rango de fechas
    const query = `
        SELECT *, 
        (6371000 * acos(cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(latitude)))) AS distance
        FROM coordinates
        WHERE timestamp BETWEEN '${startDate}' AND '${endDate}'
        HAVING distance < ${radius}
        ORDER BY timestamp;
    `;

    pool.query(query, (err, results) => {
        if (err) {
            console.error('Error ejecutando la consulta:', err);
            return res.status(500).json({ error: 'Error al ejecutar la consulta' });
        }
        res.json(results);
    });
});


app.listen(port, () => {
    console.log(`Server running on http://${DDNS_HOST}`);
});