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
        strokeColor: '#6F2F9E', // Color morado
        strokeOpacity: 1.0,
        strokeWeight: 5,
        geodesic: true,
        map: map
    });

}

// Carga el mapa con la clave de la API de Google Maps
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
    // Limpiar la ruta anterior
    path = [];

    // Procesar los datos y añadirlos a la ruta
    data.forEach(location => {
        const lat = parseFloat(location.Latitude);
        const lng = parseFloat(location.Longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
            path.push({ lat, lng });
        }
    });

    // Actualizar la polilínea con la nueva ruta
    polyline.setPath(path);

    // Centrar el mapa en el primer punto de la ruta
    if (path.length > 0) {
        map.setCenter(path[0]);
        marker.setPosition(path[0]);
    }

    // Ajustar el zoom para que se vea toda la ruta
    if (path.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        path.forEach(point => bounds.extend(point));
        map.fitBounds(bounds);
    }

    console.log('Ruta actualizada en el mapa');
}   

// Ejemplo de cómo usar la función
document.getElementById('obtenerHistoricos').addEventListener('click', () => {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    getHistoricalData(startDate, endDate);
});

// Cargar el mapa cuando la página se cargue
document.addEventListener('DOMContentLoaded', loadMap);










