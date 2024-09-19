let map;
let marker;
let polyline;  
let path = [];
let directionsService;
let directionsRenderer;

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
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map)

    // Inicializa la polilínea que seguirá la ruta personalizada
    polyline = new google.maps.Polyline({
        path: path,
        strokeColor: '6F2F9E', // Color morado
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
            script.src = https://maps.googleapis.com/maps/api/js?key=${data.key}&callback=initMap;
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
            const date = timestamp.split(', ')[0];
            const time = timestamp.split(', ')[1];
            document.getElementById('date').innerText = date;
            document.getElementById('time').innerText = time;

            const latLng = new google.maps.LatLng(data.latitude, data.longitude);
            map.setCenter(latLng);
            marker.setPosition(latLng);

            if (path.length === 0) {
                // Si es el primer punto, simplemente agrega al array de la polilínea
                path.push(latLng);
                polyline.setPath(path); // Dibuja la polilínea inicial
            } else {
                // Calcula la ruta entre el último punto y la nueva ubicación
                const lastPoint = path[path.length - 1]; // Último punto de la ruta

                const request = {
                    origin: lastPoint,
                    destination: latLng,
                    travelMode: 'DRIVING' // Calcula la ruta por las calles
                };

                directionsService.route(request, (result, status) => {
                    if (status === 'OK') {
                        const route = result.routes[0].overview_path;

                        // Añade la ruta calculada al array de la polilínea
                        path = path.concat(route);
                        polyline.setPath(path); // Actualiza la polilínea en el mapa
                    } else {
                        console.error('Error al obtener la ruta:', status);
                    }
                });
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


