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

//load date picker for start date
flatpickr("#start-date", {
    dateFormat: "Y-m-d H:i",
    maxDate: new Date(),
    mod: "multiple",
    enableTime: true,
    onClose: function(selectedDates, dateStr, instance) {
        date1 = dateStr; // Save the selected date to the variable
        console.log(date1)
    }
});

//load date picker for end date
flatpickr("#end-date", {
    dateFormat: "Y-m-d H:i",
    maxDate: new Date(),
    mod: "multiple",
    enableTime: true,
    onClose: function(selectedDates, dateStr, instance) {
        date2 = dateStr; // Save the selected date to the variable
        console.log(date2)
    }
});

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

// Función para procesar y mostrar los datos históricos en el mapa
function displayHistoricalData(data) {
    clearMap(); // Limpiar el mapa antes de añadir nuevas rutas

    // Crear un array para almacenar todos los puntos
    const allPoints = [];

    // Extraer latitud y longitud de los datos
    data.forEach(item => {
        const newPoint = new google.maps.LatLng(item.latitude, item.longitude);
        allPoints.push(newPoint); // Agregar cada punto al array
    });

    // Dibujar la polilínea con todos los puntos
    polyline.setPath(allPoints); // Establecer la ruta de la polilínea

    // Ajustar el zoom para ver toda la ruta
    const bounds = new google.maps.LatLngBounds();
    allPoints.forEach(point => bounds.extend(point));
    map.fitBounds(bounds);
}


function clearMap() {
    polyline.setMap(null); // Remover la polilínea del mapa
    path = []; // Limpiar el array de la ruta

}



// Función para validar que la fecha de inicio es anterior a la fecha de fin
function checkDates(startDate, endDate) {
    return new Date(startDate) < new Date(endDate);
}



// Modificar la parte de fetchHistoricalData para llamar a displayHistoricalData
function fetchHistoricalData(startDate, endDate, startTime, endTime) {
    // Construir la cadena de consulta
    const query = `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`;
    
    // Realizar solicitud al servidor usando GET
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
                // Mostrar los datos históricos en el mapa
                displayHistoricalData(data);
            }
        })
        .catch(err => {
            console.error('Error fetching historical data:', err);
            alert('Hubo un error al obtener los datos históricos.');
        });
}


// Evento de clic para obtener datos históricos
document.getElementById('fetch-data').addEventListener('click', () => {
    // Detener la obtención de datos en tiempo real
    clearInterval(live);

    let startDate = document.getElementById('start-date').value;
    let endDate = document.getElementById('end-date').value;
    let startTime = document.getElementById('start-time').value; // Asumiendo que también tienes un campo para la hora de inicio
    let endTime = document.getElementById('end-time').value; // Asumiendo que también tienes un campo para la hora de fin

    // Verificar que se proporcionen todas las fechas y horas requeridas
    const correctDates = checkDates(startDate, endDate);
    if (!startDate || !endDate || !startTime || !endTime || !correctDates) {
        return alert("Ensure dates and times are provided and that the start date is earlier than the end date.");
    }

    // Convertir la fecha y la hora a la zona horaria UTC
    startDate = convertToGlobalTime(`${startDate} ${startTime}`);
    endDate = convertToGlobalTime(`${endDate} ${endTime}`);

    // Convertir las fechas al formato deseado YYYY/MM/DD HH:MM:SS
    const date1 = formatDateTime(startDate);
    const date2 = formatDateTime(endDate);

    // Limpiar el mapa antes de obtener nuevos datos
    clearMap();

    // Llamar a la función para obtener los datos históricos
    fetchHistoricalData(date1, date2, startTime, endTime);
});





// Cargar el mapa al cargar la página
loadMap();




