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
});

flatpickr("#endDate", {
    dateFormat: "Y-m-d H:i",  // Formato de fecha y hora
    enableTime: true,         // Habilitar selección de hora
    time_24hr: true,          // Formato de 24 horas
    maxDate: new Date(),      // No permitir seleccionar una fecha futura
});

// Inicializa el mapa
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

function updateMapAndRouteHistorics(lat, lng, timestamp) {
    const newPosition = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const newTimestamp = new Date(timestamp);

    // Actualiza la posición del marcador y centra el mapa en la nueva ubicación
    marker.position = newPosition;
    map.panTo(newPosition);
}

// Evento para obtener datos históricos
document.getElementById('obtenerHistoricos').addEventListener('click', () => {
    let startDate = document.getElementById('startDate').value;
    let endDate = document.getElementById('endDate').value;

    if (startDate && endDate) {
        const url = `/historics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.length === 0) {
                    alert("No se encontraron rutas");
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
        alert("Asegúrate de proporcionar las fechas de inicio y fin.");
    }
});

// Evento para buscar ubicación por dirección
document.getElementById('buscarUbicacion').addEventListener('click', () => {
    const direccion = document.getElementById('direccion').value;

    if (direccion) {
        const url = `/ubicacion?direccion=${encodeURIComponent(direccion)}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.length === 0) {
                    document.getElementById('resultadoUbicacion').innerText = "No se encontraron registros para esta dirección.";
                } else {
                    const fechaHora = new Date(data[0].timestamp).toLocaleString(); // Convertir timestamp a formato legible
                    document.getElementById('resultadoUbicacion').innerText = `La última vez que estuvo en esta ubicación fue el ${fechaHora}.`;
                    
                    // Si se desea, se puede agregar un marcador en la ubicación encontrada
                    const latLng = { lat: data[0].latitude, lng: data[0].longitude };
                    marker.position = latLng;
                    map.panTo(latLng);
                }
            })
            .catch(error => {
                console.error('Error fetching location data:', error);
            });
    } else {
        alert("Por favor, ingresa una dirección.");
    }
});

// Cargar el mapa al inicio
document.addEventListener('DOMContentLoaded', loadMap);
