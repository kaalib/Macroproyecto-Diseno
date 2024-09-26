let map;
let marker;
let polyline;
let path = [];

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 0, lng: 0 },
        zoom: 14
    });
    
    marker = new google.maps.Marker({
        position: { lat: 0, lng: 0 },
        map: map
    });

    polyline = new google.maps.Polyline({
        path: path,
        strokeColor: '#6F2F9E',
        strokeOpacity: 1.0,
        strokeWeight: 5,
        geodesic: true,
        map: map
    });
}

function loadMap() {
    fetch('/api_key')
        .then(response => response.json())
        .then(data => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&callback=initMap`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        })
        .catch(err => console.error('Error fetching API key:', err));
}

function getHistoricalData(startDate, endDate) {
    const url = `/historics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
    console.log('Requesting historical data from:', url);

    fetch(url)
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Data received:', data);
            if (Array.isArray(data) && data.length > 0) {
                displayHistoricalData(data);
            } else {
                console.log('No data received or empty array');
                alert('No se encontraron datos para el rango de fechas especificado.');
            }
        })
        .catch(error => {
            console.error('Error details:', error);
            alert('Error al obtener datos históricos. Consulta la consola para más detalles.');
        });
}

function displayHistoricalData(data) {
    path = [];

    data.forEach(location => {
        const lat = parseFloat(location.latitude);
        const lng = parseFloat(location.longitude);
        const timestamp = new Date(location.timestamp);
        
        if (!isNaN(lat) && !isNaN(lng) && !isNaN(timestamp.getTime())) {
            path.push({ 
                lat, 
                lng, 
                timestamp: timestamp.toLocaleString() // Convert to local time string
            });
        } else {
            console.warn('Invalid data point:', location);
        }
    });

    polyline.setPath(path);

    if (path.length > 0) {
        map.setCenter(path[0]);
        marker.setPosition(path[0]);
        
        // Add info window to the marker
        const infoWindow = new google.maps.InfoWindow({
            content: `Última posición: ${path[0].timestamp}`
        });
        infoWindow.open(map, marker);
    }

    if (path.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        path.forEach(point => bounds.extend(point));
        map.fitBounds(bounds);
    }

    console.log('Ruta actualizada en el mapa');
}   

document.getElementById('obtenerHistoricos').addEventListener('click', () => {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    getHistoricalData(startDate, endDate);
});

document.addEventListener('DOMContentLoaded', loadMap);










