let map;
let marker;
let polyline;
let path = [];
let directionsService;

// Cargar el mapa con la clave de la API de Google Maps
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

// Inicializar el mapa de Google Maps
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
        strokeColor: '#6F2F9E',
        strokeOpacity: 1.0,
        strokeWeight: 5,
        geodesic: true,
        map: map
    });
}

// Función para limpiar el mapa
function clearMap() {
    polyline.setMap(null); // Remover la polilínea del mapa
    path = []; // Limpiar el array de la ruta
}

// Función para procesar y mostrar los datos históricos en el mapa
function displayHistoricalData(data) {
    clearMap(); // Limpiar el mapa antes de añadir nuevas rutas

    const allPoints = data.map(item => new google.maps.LatLng(item.latitude, item.longitude));

    polyline.setPath(allPoints); // Establecer la ruta de la polilínea

    // Ajustar el zoom para ver toda la ruta
    const bounds = new google.maps.LatLngBounds();
    allPoints.forEach(point => bounds.extend(point));
    map.fitBounds(bounds);
}

// Función para validar que la fecha de inicio es anterior a la fecha de fin
function checkDates(startDate, endDate) {
    return new Date(startDate) < new Date(endDate);
}

// Modificar la parte de fetchHistoricalData para llamar a displayHistoricalData
function fetchHistoricalData(startDate, endDate, startTime, endTime) {
    const query = `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`;
    
    fetch(`/historical_data?${query}`)
        .then(response => {
            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            return response.json();
        })
        .then(data => {
            console.log('Data fetched:', data); // Para fines de depuración
            if (data.length === 0) {
                alert("No routes found");
            } else {
                displayHistoricalData(data);
            }
        })
        .catch(err => {
            console.error('Error fetching historical data:', err);
            alert('Hubo un error al obtener los datos históricos.');
        });
}

// Evento de clic para obtener datos históricos
document.addEventListener('DOMContentLoaded', () => {
    // Cargar los date pickers
    flatpickr("#start-date", {
        dateFormat: "Y-m-d H:i",
        maxDate: new Date(),
        mod: "multiple",
        enableTime: true,
        onClose: (selectedDates, dateStr) => console.log(dateStr)
    });

    flatpickr("#end-date", {
        dateFormat: "Y-m-d H:i",
        maxDate: new Date(),
        mod: "multiple",
        enableTime: true,
        onClose: (selectedDates, dateStr) => console.log(dateStr)
    });

    document.getElementById('fetch-data').addEventListener('click', () => {

        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;

        const correctDates = checkDates(startDate, endDate);
        if (!startDate || !endDate || !startTime || !endTime || !correctDates) {
            return alert("Ensure dates and times are provided and that the start date is earlier than the end date.");
        }

        const date1 = formatDateTime(convertToGlobalTime(`${startDate} ${startTime}`));
        const date2 = formatDateTime(convertToGlobalTime(`${endDate} ${endTime}`));

        clearMap();
        fetchHistoricalData(date1, date2, startTime, endTime);
    });

    // Cargar el mapa al cargar la página
    loadMap();
});





