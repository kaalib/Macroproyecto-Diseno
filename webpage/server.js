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

let locationData2 = {
    latitude: 'N/A',
    longitude: 'N/A',
    timestamp: 'N/A'
};



function fetchDataFromDatabase() {
    pool.query(
            `(SELECT * 
            FROM coordinates 
            WHERE ID = 1 
            ORDER BY Timestamp DESC 
            LIMIT 1)
            UNION ALL
            (SELECT * 
            FROM coordinates 
            WHERE ID = 2 
            ORDER BY timestamp DESC 
            LIMIT 1);`,
            (err, results) => {
                if (err) {
                    console.error('Error fetching data:', err);
                    return;
            }
            if (results.length > 0) {

                results.forEach(row => {
                    if (row.id === 1) {
                        locationData = {
                            latitude: row.latitude,
                            longitude: row.longitude,
                            timestamp: row.timestamp,
                            rpm: row.rpm,
                            speed: row.speed
                        };
                    } else if (row.id === 2) {
                        locationData2 = {
                            latitude: row.latitude,
                            longitude: row.longitude,
                            timestamp: row.timestamp,
                            rpm: row.rpm,
                            speed: row.speed
                        };
                    }
                });

                console.log('Location Data for Vehicle 1:', locationData);
                console.log('Location Data for Vehicle 2:', locationData2);
            }
        }
    );
}

setInterval(fetchDataFromDatabase, 6000);




app.use(express.static(path.join(__dirname, 'public')));

app.get('/data', (req, res) => {
    res.json({
        locationData
    });
});


app.get('/data2', (req, res) => {
    res.json({
        locationData2
    });
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api_key', (req, res) => {
    res.json({ key: process.env.GOOGLE_MAPS_API_KEY });
});

app.get('/historics', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Please provide both startDate and endDate query parameters.' });
    }
    const query = `SELECT * FROM coordinates WHERE timestamp BETWEEN '${startDate}' AND '${endDate}' AND ID IN (1, 2)`;

    pool.query(query, (err, results) => {
        if (err) throw err;
        res.json(results);
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

    if (!lat || !lng || !startDate || !endDate) {
        return res.status(400).json({ error: 'Lat, Lng, startDate y endDate son parámetros requeridos.' });
    }

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