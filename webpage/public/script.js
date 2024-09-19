let map;
let marker;
let polyline;
let path = [];
let directionsService;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 0, lng: 0 },
        zoom: 14
    });
    
    marker = new google.maps.Marker({
        position: { lat: 0, lng: 0 },
        map: map
    });

    directionsService = new google.maps.DirectionsService();

    // Inicializa la polilínea que seguirá la ruta personalizada
    polyline = new google.maps.Polyline({
        path: path,
        strokeColor: '#6F2F9E', // Color morado
        strokeOpacity: 1.0,
        strokeWeight: 5,
        geodesic: true,
        map: map
    });

    fetchLatestLocation(); // Llama a la función que obtiene la ubicación
}

// Función para redondear a 3 decimales
function roundToThreeDecimals(num) {
    return Number(num.toFixed(6));
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
            const roundedLat = roundToThreeDecimals(data.latitude);
            const roundedLng = roundToThreeDecimals(data.longitude);

            document.getElementById('latitude').innerText = roundedLat;
            document.getElementById('longitude').innerText = roundedLng;

            const timestamp = convertToLocalTime(data.timestamp);
            const [date, time] = timestamp.split(', ');
            document.getElementById('date').innerText = date;
            document.getElementById('time').innerText = time;

            const latLng = new google.maps.LatLng(roundedLat, roundedLng);
            map.setCenter(latLng);
            marker.setPosition(latLng);

            updateRoute(latLng);
        })
        .catch(err => console.error('Error fetching latest location:', err));
}

function updateRoute(newPoint) {
    if (path.length === 0) {
        path.push(newPoint);
        polyline.setPath(path);
    } else {
        const lastPoint = path[path.length - 1];
        const request = {
            origin: lastPoint,
            destination: newPoint,
            travelMode: 'DRIVING'
        };

        directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                const newPath = result.routes[0].overview_path;
                path = path.concat(newPath);
                polyline.setPath(path);

                // Ajustar el zoom para ver toda la ruta
                const bounds = new google.maps.LatLngBounds();
                path.forEach(point => bounds.extend(point));
                map.fitBounds(bounds);
            } else {
                console.error('Error al obtener la ruta:', status);
                // Si falla la obtención de la ruta, simplemente añadimos el punto
                path.push(newPoint);
                polyline.setPath(path);
            }
        });
    }
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