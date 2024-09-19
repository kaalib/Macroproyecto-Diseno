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

    // Inicializa la polilínea que seguirá la ruta personalizada
    polyline = new google.maps.Polyline({
        path: path,
        strokeColor: '#6F2F9E', // Color morado
        strokeOpacity: 1.0,
        strokeWeight: 5,
        map: map
    });

    fetchLatestLocation(); // Llama a la función que obtiene la ubicación
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

loadMap();

// Función que obtiene la última ubicación del usuario
function fetchLatestLocation() {
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            document.getElementById('latitude').innerText = data.latitude;
            document.getElementById('longitude').innerText = data.longitude;

            const timestamp = convertToLocalTime(data.timestamp);
            const [date, time] = timestamp.split(', ');
            document.getElementById('date').innerText = date;
            document.getElementById('time').innerText = time;

            const latLng = new google.maps.LatLng(data.latitude, data.longitude);
            map.setCenter(latLng);
            marker.setPosition(latLng);

            // Añade el nuevo punto a la ruta
            path.push(latLng);
            
            // Actualiza la polilínea con la nueva ruta
            polyline.setPath(path);

            // Si la ruta tiene más de 2 puntos, ajusta el zoom para que se vea toda la ruta
            if (path.length > 2) {
                const bounds = new google.maps.LatLngBounds();
                path.forEach(point => bounds.extend(point));
                map.fitBounds(bounds);
            }
        })
        .catch(err => console.error('Error fetching latest location:', err));
}

// Función para convertir UTC a la hora local
function convertToLocalTime(utcDateString) {
    const localDate = new Date(utcDateString);
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'UTC'
    };

    const formattedDate = new Intl.DateTimeFormat('en-GB', options).format(localDate);
    return formattedDate;
}

// Actualiza la ubicación cada 10 segundos
setInterval(fetchLatestLocation, 10000);