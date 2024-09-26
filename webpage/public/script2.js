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

    // Cargar los datos históricos al iniciar el mapa
    loadHistoricalData();
}

// Configurar Flatpickr para el rango de fechas
configureFlatpickr("#date-range", {
    mode: "range",
    dateFormat: "Y-m-d", // Formato de la fecha
    allowInput: true // Permitir que el usuario escriba la fecha manualmente si quiere
});

// Configurar Flatpickr para el rango de horas
configureFlatpickr("#time-range", {
    enableTime: true,
    noCalendar: true, // Solo para horas
    dateFormat: "H:i", // Formato de hora 24h
    time_24hr: true,
    mode: "range" // Permite seleccionar un rango de horas
});

// Manejador para el evento de envío
document.getElementById('submit-btn').addEventListener('click', handleSubmit);

// Manejador para el checkbox que muestra/oculta el selector de tiempo
document.getElementById('singleDay').addEventListener('change', toggleTimeRange);

// Manejar el envío de datos
function handleSubmit() {
    const dateRange = document.getElementById('date-range').value;
    const timeRange = document.getElementById('time-range').value;

    // Validar el rango de fechas
    if (!dateRange) {
        alert('Debes seleccionar un rango de fechas.');
        return;
    }

    const [startDate, endDate] = dateRange.split(" to ");
    let startTime = '00:00', endTime = '23:59'; // Asignación de valores por defecto

    // Validar el rango de horas
    if (timeRange) {
        const [start, end] = timeRange.split(" to ");
        startTime = start;
        endTime = end || endTime; // Usa '23:59' como valor por defecto

        if (startDate === endDate && startTime >= endTime) {
            alert('El rango de horas es incorrecto. La hora de inicio debe ser menor que la hora de fin.');
            return;
        }
    }

    // Crear objeto de datos a enviar en la URL
    const query = new URLSearchParams({
        startDate,
        endDate,
        startTime,
        endTime
    }).toString();

    // Log de los datos enviados al servidor
    console.log('Datos enviados al servidor:', query);

    // Enviar la solicitud al servidor
    fetchHistoricalData(query);
}

// Toggle para mostrar/ocultar el selector de tiempo
function toggleTimeRange() {
    const timeRangeContainer = document.getElementById('timeRangeContainer');
    timeRangeContainer.style.display = this.checked ? 'none' : 'block'; // Muestra/oculta el contenedor de tiempo
}

// Función para hacer la solicitud de datos históricos al servidor
function fetchHistoricalData(query) {
    // Realizar solicitud al servidor usando GET
    fetch(`/historical_data?${query}`)
        .then(response => {
            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            return response.json();
        })
        .then(data => {
            displayHistoricalDataOnMap(data.locations); // Mostrar los datos en el mapa
        })
        .catch(err => {
            console.error('Error fetching historical data:', err);
            alert('Hubo un error al obtener los datos históricos.');
        });
}

// Inicializar el mapa de Google Maps
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

// Función para mostrar los datos históricos en el mapa
function displayHistoricalDataOnMap(locations) {
    path = []; // Reiniciar la ruta

    // Recorrer las ubicaciones y agregarlas al mapa
    locations.forEach(loc => {
        const latLng = new google.maps.LatLng(loc.latitude, loc.longitude);
        path.push(latLng);
    });

    if (path.length > 0) {
        // Establecer la polilínea con la nueva ruta
        polyline.setPath(path);

        // Ajustar el zoom para ver toda la ruta
        const bounds = new google.maps.LatLngBounds();
        path.forEach(point => bounds.extend(point));
        map.fitBounds(bounds);

        // Centrar el mapa en la primera ubicación
        map.setCenter(path[0]);

        // Opcional: agregar marcador en la primera ubicación
        marker.setPosition(path[0]);
    }
}

// Cargar el mapa al cargar la página
loadMap();



