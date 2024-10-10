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
    path.push(newPoint);  // Añade el nuevo punto al array `path`
    polyline.setPath(path);  // Actualiza la polilínea con la nueva ruta
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

// Evento para cambiar a la pestaña de datos históricos
document.getElementById('historicalDataBtn').addEventListener('click', (event) => {
    openTab(event, 'Historico'); // Abre la pestaña de Datos Históricos
});

// Evento para cambiar a la pestaña de mapa actual
document.getElementById('realtimeBtn').addEventListener('click', (event) => {
    openTab(event, 'MapaActual'); // Abre la pestaña de Mapa Actual
});


// Abre la pestaña seleccionada
function openTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none"; // Oculta todo el contenido de las tabs
    }

    const tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", ""); // Elimina la clase "active" de todas las tabs
    }

    document.getElementById(tabName).style.display = "block"; // Muestra la pestaña seleccionada
    evt.currentTarget.className += " active"; // Añade la clase "active" al botón clicado
}

// Cargar el mapa histórico
function loadHistoricalMap() {
    const script = document.createElement('script');
    script.src = 'script2.js'; // Ruta del script2.js
    document.head.appendChild(script);
}


// Carga el mapa en tiempo real al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    loadMap();
    document.getElementsByClassName('tablinks')[0].click(); // Abre la pestaña del Mapa Actual por defecto
});