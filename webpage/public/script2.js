let map;
let marker;
let polylines = [];
let routeCoordinates = [];
let lastTimestamp = null;

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

    // Inicialización de Flatpickr para seleccionar tanto fecha como hora
    flatpickr("#startDate", {
        dateFormat: "Y-m-d H:i",  // Formato de fecha y hora
        enableTime: true,         // Habilitar selección de hora
        time_24hr: true,          // Formato de 24 horas
        maxDate: new Date(),      // No permitir seleccionar una fecha futura
        onClose: function(selectedDates, dateStr, instance) {
            console.log("Fecha de inicio seleccionada:", dateStr);
        }
    });

    flatpickr("#endDate", {
        dateFormat: "Y-m-d H:i",  // Formato de fecha y hora
        enableTime: true,         // Habilitar selección de hora
        time_24hr: true,          // Formato de 24 horas
        maxDate: new Date(),      // No permitir seleccionar una fecha futura
        onClose: function(selectedDates, dateStr, instance) {
            console.log("Fecha de fin seleccionada:", dateStr);
        }
    });

async function initMap() {
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    const initialPosition = { lat: 0, lng: 0 };

    map = new Map(document.getElementById("map"), {
        zoom: 14,
        center: initialPosition,
        mapId: "DEMO_MAP_ID"
    });

    marker = new AdvancedMarkerElement({
        map: map,
        position: initialPosition,
        title: "Current Location"
    });
}

function isSameLocation(coord1, coord2) {
    return Math.round(coord1.lat * 10000) === Math.round(coord2.lat * 10000) &&
           Math.round(coord1.lng * 10000) === Math.round(coord2.lng * 10000);
}

function updateMapAndRouteHistorics(lat, lng, timestamp) {
    console.log(lat, lng);
    const newPosition = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const newTimestamp = new Date(timestamp);

    // Actualiza la posición del marcador y centra el mapa en la nueva ubicación
    marker.position = newPosition;
    map.panTo(newPosition);

    if (routeCoordinates.length === 0) {
        routeCoordinates.push(newPosition);
        lastTimestamp = newTimestamp;
    } else {
        const lastPosition = routeCoordinates[routeCoordinates.length - 1];
        const timeDiff = (newTimestamp - lastTimestamp) / (1000 * 60); // Diferencia en minutos

        if (!isSameLocation(newPosition, lastPosition) && timeDiff < 1) {
            routeCoordinates.push(newPosition);
            drawPolylineHistorics(lastPosition, newPosition);
        } else if (timeDiff >= 1) {
            // Si la diferencia de tiempo es mayor o igual a 1 minuto, comienza una nueva ruta
            routeCoordinates = [newPosition];
        }

        lastTimestamp = newTimestamp;
    }
}

function drawPolylineHistorics(origin, destination) {
    const path = [
        new google.maps.LatLng(origin.lat, origin.lng),
        new google.maps.LatLng(destination.lat, destination.lng)
    ];

    const polyline = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#6F2F9E',
        strokeOpacity: 1.0,
        strokeWeight: 5
    });

    polyline.setMap(map);
    polylines.push(polyline);
    console.log("Polyline drawn successfully");
}

function convertToGlobalTime(localTime) {
    return localTime;  // Ya no convierte, simplemente retorna la hora tal como está
}


function formatDateTime(dateTime) {
    const [date, time] = dateTime.split(', ');
    const [day, month, year] = date.split('/');
    return `${year}-${month}-${day} ${time}`;
}

function checkDates(dateStart, dateEnd) {
    let start = new Date(dateStart);
    let end = new Date(dateEnd);
    return start < end;
}

function clearMap() {
    polylines.forEach(polyline => polyline.setMap(null));
    polylines = [];
    routeCoordinates = [];
    lastTimestamp = null;
    colorIndex = 0;
}

document.getElementById('obtenerHistoricos').addEventListener('click', () => {
    let startDate = document.getElementById('startDate').value;
    let endDate = document.getElementById('endDate').value;

    const correctDates = checkDates(startDate, endDate); // Verifica si la fecha de inicio es anterior a la de fin
    if (startDate && endDate && correctDates) {
        startDate = convertToGlobalTime(startDate); // Convierte la fecha a UTC
        endDate = convertToGlobalTime(endDate); // Convierte la fecha a UTC

        date1 = formatDateTime(startDate); // Formato: YYYY-MM-DD HH:MM:SS
        date2 = formatDateTime(endDate); // Formato: YYYY-MM-DD HH:MM:SS

        clearMap(); // Limpia el mapa antes de cargar nuevas rutas

        const url = `/historics?startDate=${encodeURIComponent(date1)}&endDate=${encodeURIComponent(date2)}`;
        console.log("Encoded URL:", url);  
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log('Data fetched:', data);
                if (data.length === 0) {
                    alert("No routes found");
                } else {
                    data.forEach(data => {
                        updateMapAndRouteHistorics(data.latitude, data.longitude, data.timestamp);
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    } else {
        alert("Ensure dates are provided and the start date is earlier than the end date.");
    }
});

document.addEventListener('DOMContentLoaded', loadMap);
