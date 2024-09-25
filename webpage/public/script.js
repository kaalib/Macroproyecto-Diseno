let map;
let marker;
let polyline;
let path = [];
let directionsService;

// Inicializa el mapa
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

// Función para redondear a 6 decimales
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

// Llama a la función que carga el mapa
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

// Función para actualizar la ruta
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

// Inicializar flatpickr para los selectores de fecha y hora
flatpickr("#datePicker", {
    mode: "range",
    dateFormat: "Y-m-d",
    onClose: function(selectedDates) {
        if (selectedDates.length === 2) {
            const startDate = selectedDates[0];
            const endDate = selectedDates[1];
            if (startDate > endDate) {
                alert("El rango de fechas es incorrecto. La fecha inicial debe ser anterior a la fecha final.");
                return;
            }
            console.log(`Selected date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
        } else if (selectedDates.length === 1) {
            const singleDate = selectedDates[0];
            console.log(`Selected single date: ${singleDate.toISOString().split('T')[0]}`);
        }
    }
});

flatpickr("#timePicker", {
    enableTime: true,
    noCalendar: true,
    dateFormat: "H:i",
    time_24hr: true,
    mode: "range",  // Permite seleccionar un rango de horas
    onClose: function(selectedDates) {
        if (selectedDates.length === 2) {
            const startTime = selectedDates[0];
            const endTime = selectedDates[1];

            if (startTime.getDate() === endTime.getDate() && startTime > endTime) {
                alert("El rango de horas es incorrecto. La hora inicial debe ser anterior a la hora final.");
                return;
            }
            console.log(`Selected time range: ${startTime.toISOString().split('T')[1].split('.')[0]} to ${endTime.toISOString().split('T')[1].split('.')[0]}`);
        }
    }
});

// Función para obtener datos de geolocalización
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function showPosition(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();

    document.getElementById("latitude").innerText = latitude.toFixed(6);
    document.getElementById("longitude").innerText = longitude.toFixed(6);
    document.getElementById("date").innerText = date;
    document.getElementById("time").innerText = time;

    // Aquí puedes agregar la lógica para actualizar el mapa con la nueva posición
}

// Manejo de errores
function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            alert("User denied the request for Geolocation.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            alert("The request to get user location timed out.");
            break;
        case error.UNKNOWN_ERROR:
            alert("An unknown error occurred.");
            break;
    }
}

// Evento para el botón de obtener datos históricos
document.getElementById("fetchHistoricalData").addEventListener("click", function() {
    const dateRange = document.getElementById("datePicker").value;
    const timeRange = document.getElementById("timePicker").value;

    if (!dateRange) {
        alert("Por favor, selecciona un rango de fechas.");
        return;
    }

    if (!timeRange) {
        alert("Por favor, selecciona un rango de horas.");
        return;
    }

    fetch(`/historical-data?dateRange=${encodeURIComponent(dateRange)}&timeRange=${encodeURIComponent(timeRange)}`)
        .then(response => {
            if (!response.ok) {
                // Manejar los errores que devuelve el servidor
                return response.json().then(error => {
                    throw new Error(error.error);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.length === 0) {
                alert("No se encontraron datos para el rango seleccionado.");
                return;
            }

            // Aquí puedes actualizar tu mapa con los datos históricos
            updateMapWithHistoricalData(data);
        })
        .catch(error => {
            // Mostrar el mensaje de error al usuario
            alert(`Error: ${error.message}`);
        });
});

// Función para actualizar el mapa con datos históricos
function updateMapWithHistoricalData(data) {
    // Limpia la polilínea anterior
    polyline.setMap(null);
    path = []; // Reinicia la ruta

    // Dibuja la nueva polilínea con los datos históricos
    const historicalPath = data.map(point => new google.maps.LatLng(point.latitude, point.longitude));
    polyline = new google.maps.Polyline({
        path: historicalPath,
        strokeColor: '#FF0000', // Color rojo para datos históricos
        strokeOpacity: 1.0,
        strokeWeight: 5,
        geodesic: true,
        map: map
    });

    // Ajustar el zoom para ver toda la ruta histórica
    const bounds = new google.maps.LatLngBounds();
    historicalPath.forEach(point => bounds.extend(point));
    map.fitBounds(bounds);
}

// Llamar a la función para obtener la ubicación al cargar la página
window.onload = getLocation;
