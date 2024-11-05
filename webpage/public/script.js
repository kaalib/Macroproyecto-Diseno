let map;
let marker;

let polyline;
let path = [];
let polylines = [];
let routeCoordinates = [];
let lastTimestamp = null;
let infoWindows = [];
let markers = [];
let results = []; 

//REAL TIME MAP
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
    initAutocomplete();
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
            script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&callback=initMap&libraries=places`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        })
        .catch(err => console.error('Error fetching API key:', err));
}

let shouldFetch = true;

function fetchLatestLocation() {
    if (!shouldFetch) return;
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            const roundedLat = roundToThreeDecimals(data.locationData.latitude);
            const roundedLng = roundToThreeDecimals(data.locationData.longitude);

            document.getElementById('latitude').innerText = roundedLat;
            document.getElementById('longitude').innerText = roundedLng;

            const timestamp = convertToLocalTime(data.locationData.timestamp);
            const [date, time] = timestamp.split(', ');
            document.getElementById('date').innerText = date;
            document.getElementById('time').innerText = time;

            const latLng = new google.maps.LatLng(roundedLat, roundedLng);
            map.setCenter(latLng);
            marker.setPosition(latLng);

            document.getElementById('rpm').innerText = data.locationData.rpm;
            document.getElementById('speed').innerText = data.locationData.speed;
            
            updateRoute(latLng);
        })
        .catch(err => console.error('Error fetching latest location:', err));
}
 

// Función para reactivar fetchLatestLocation
function activateFetchLatestLocation() {
    shouldFetch = true; 
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



//--------------------------------HISTORICAL--------------------------------------------
async function initHistoricalMap() {
    clearMap();
    shouldFetch = false; 
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    const initialPosition = { lat: 10.983831, lng: -74.802631 };

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

    initAutocomplete();
}

function initAutocomplete() {
    const input = document.getElementById('address');
    
    const options = {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'CO' }
    };

    const autocomplete = new google.maps.places.Autocomplete(input, options);

    // Listener para el evento de autocompletado
    autocomplete.addListener('place_changed', function () {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
            console.error("No se pudo encontrar la ubicación");
            return;
        }
        console.log("Sugerencia seleccionada:", place.formatted_address);
    });
}

flatpickr("#startDate", {
    dateFormat: "Y-m-d H:i",
    enableTime: true,
    time_24hr: true,
    maxDate: new Date(),
    onClose: function(dateStr) {
        console.log("Fecha de inicio seleccionada:", dateStr);
    }
});

flatpickr("#endDate", {
    dateFormat: "Y-m-d H:i",
    enableTime: true,
    time_24hr: true,
    maxDate: new Date(),
    onClose: function(dateStr) {
        console.log("Fecha de fin seleccionada:", dateStr);
    }
});

function isSameLocation(coord1, coord2) {
    return Math.round(coord1.lat * 10000) === Math.round(coord2.lat * 10000) &&
           Math.round(coord1.lng * 10000) === Math.round(coord2.lng * 10000);
}

function updateMapAndRouteHistorics(lat, lng, timestamp) {
    console.log(lat, lng);
    const newPosition = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const newTimestamp = new Date(timestamp);

    marker.position = newPosition;
    map.panTo(newPosition);

    if (routeCoordinates.length === 0) {
        routeCoordinates.push(newPosition);
        lastTimestamp = newTimestamp;
    } else {
        const lastPosition = routeCoordinates[routeCoordinates.length - 1];
        const timeDiff = (newTimestamp - lastTimestamp) / (1000 * 60);

        if (!isSameLocation(newPosition, lastPosition) && timeDiff < 1) {
            routeCoordinates.push(newPosition);
            drawPolylineHistorics(lastPosition, newPosition, lastTimestamp);
        } else if (timeDiff >= 1) {
            routeCoordinates = [newPosition];
        }

        lastTimestamp = newTimestamp;
    }
}

function calculateBearing(start, end) {
    const lat1 = (start.lat * Math.PI) / 180;
    const lon1 = (start.lng * Math.PI) / 180;
    const lat2 = (end.lat * Math.PI) / 180;
    const lon2 = (end.lng * Math.PI) / 180;

    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360; // Convertir a ángulo positivo
}

function drawPolylineHistorics(origin, destination, timestamp) {
    const path = [
        new google.maps.LatLng(origin.lat, origin.lng),
        new google.maps.LatLng(destination.lat, destination.lng)
    ];

    // Calcular la rotación de la flecha
    const bearing = calculateBearing(origin, destination);

    const startMarker = new google.maps.Marker({
        position: origin,
        map: map,
        title: "Inicio",
        icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, // Cambiar a flecha
            scale: 3,
            fillColor: '#6F2F9E',
            fillOpacity: 1,
            strokeWeight: 2,
            rotation: bearing // Ajustar la rotación de la flecha según el ángulo calculado
        }
    });

    markers.push(startMarker);

    const adjustedTimestamp = adjustForTimezone(timestamp);

    const infoWindow = new google.maps.InfoWindow({
        content: `<div><strong>Registered Date</strong><br> ${adjustedTimestamp}</div>`,
        maxWidth: 200
    });

    infoWindows.push(infoWindow);

    startMarker.addListener('click', function() {
        infoWindow.open(map, startMarker);
    });

    startMarker.addListener('mouseover', function() {
        infoWindow.open(map, startMarker);
    });

    startMarker.addListener('mouseout', function() {
        infoWindow.close();
    });

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
    const utcDate = new Date(localTime);
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    };
    return utcDate.toLocaleDateString('en-GB', options);
}

function adjustForTimezone(dateTime) {
    const date = new Date(dateTime);
    const adjustedDate = new Date(date.getTime() + (5 * 60 * 60 * 1000)); 

    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    
    return adjustedDate.toLocaleString('en-GB', options); 
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
let drawnCircle; // Variable global para almacenar el círculo

// Función para limpiar el mapa
function clearMap() {
    // Cerrar todas las InfoWindows
    infoWindows.forEach(infoWindow => infoWindow.close());
    infoWindows = []; // Limpiar el array de InfoWindows
    results = [];
    // Eliminar todos los marcadores
    marker.setMap(null);
    markers.forEach(marker => marker.setMap(null));
    markers = []; // Limpiar el array de marcadores

    // Eliminar todas las polilíneas
    polyline.setMap(null);
    polylines.forEach(polyline => polyline.setMap(null));
    polylines = [];
    routeCoordinates = [];
    lastTimestamp = null;

    // Eliminar el círculo si existe
    if (drawnCircle) {
        drawnCircle.setMap(null); // Eliminar el círculo del mapa
        drawnCircle = null; // Restablecer la variable del círculo
    }
}

const addressInput = document.getElementById('address');
const clearAddress = document.getElementById('clearAddress');

addressInput.addEventListener('input', function() {
    if (addressInput.value) {
        clearAddress.style.display = 'block';
    } else {
        clearAddress.style.display = 'none'; 
    }
});

clearAddress.addEventListener('click', function() {
    addressInput.value = ''; 
    clearAddress.style.display = 'none'; 
    addressInput.focus();
});

document.getElementById('startDate').addEventListener('input', () => {
    validarFechas();
});

document.getElementById('endDate').addEventListener('input', () => {
    validarFechas();
});

function validarFechas() {
    let startDate = document.getElementById('startDate').value;
    let endDate = document.getElementById('endDate').value;

    // Si ambos campos tienen valores, procedemos a comparar las fechas
    if (startDate && endDate) {
        const fechaInicio = new Date(startDate);
        const fechaFin = new Date(endDate);

        // Si la fecha de inicio es mayor que la de fin, podemos modificar el campo de fin
        if (fechaInicio > fechaFin) {
            // Establece la fecha final como vacía o puedes fijarla a una fecha válida, como la fecha de inicio
            document.getElementById('endDate').value = ''; // O puedes establecerlo como startDate
        }
    }
}

document.getElementById('gethistorical').addEventListener('click', () => {

    let startDate = document.getElementById('startDate');
    let endDate = document.getElementById('endDate');

    const correctDates = checkDates(startDate.value, endDate.value);
    let isValid = true;

    // Limpiar estilos de error
    startDate.classList.remove('input-error');
    endDate.classList.remove('input-error');

    if (!startDate.value || !endDate.value || !correctDates) {
        isValid = false;

        // Aplicar clase de error a los campos
        if (!startDate.value) {
            startDate.classList.add('input-error');
        }
        if (!endDate.value) {
            endDate.classList.add('input-error');
        }
        if (startDate.value && endDate.value && !correctDates) {
            startDate.classList.add('input-error');
            endDate.classList.add('input-error');
        }
    }

    if (isValid) {
        let formattedStartDate = convertToGlobalTime(startDate.value);
        let formattedEndDate = convertToGlobalTime(endDate.value);

        let date1 = formatDateTime(formattedStartDate);
        let date2 = formatDateTime(formattedEndDate);

        clearMap();

        const url = `/historics?startDate=${encodeURIComponent(date1)}&endDate=${encodeURIComponent(date2)}`;
        console.log("Encoded URL:", url);  
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log('Data fetched:', data);
                results = data;
                if (data.length === 0) {
                    alert("No se encontraron rutas");
                    clearMap();
                } else {
                    data.forEach(data => {
                        updateMapAndRouteHistorics(data.latitude, data.longitude, data.timestamp);
                        document.getElementById('Searchsection').style.display='block';
                    });
                    setupSlider(data.length);
                }
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    }
});


document.getElementById('searchbyaddress').addEventListener('click', () => {
    let startDate = document.getElementById('startDate');
    let endDate = document.getElementById('endDate');
    const address = document.getElementById('address');
    const radius = parseInt(document.getElementById('radius').value) || 500;

    const correctDates = checkDates(startDate.value, endDate.value);
    let isValid = true;

    // Limpiar estilos de error
    startDate.classList.remove('input-error');
    endDate.classList.remove('input-error');
    address.classList.remove('input-error');

    // Validar fechas y dirección
    if (!startDate.value) {
        isValid = false;
        startDate.classList.add('input-error');
    }
    if (!endDate.value) {
        isValid = false;
        endDate.classList.add('input-error');
    }
    if (!address.value) {
        isValid = false;
        address.classList.add('input-error');
    }
    if (startDate.value && endDate.value && !correctDates) {
        isValid = false;
        startDate.classList.add('input-error');
        endDate.classList.add('input-error');
    }

    // Si todos los datos son válidos, proceder con la búsqueda
    if (isValid) {
        const formattedStartDate = convertToGlobalTime(startDate.value);
        const formattedEndDate = convertToGlobalTime(endDate.value);

        const date1 = formatDateTime(formattedStartDate);
        const date2 = formatDateTime(formattedEndDate);

        clearMap();

        // Geocodificación de la dirección
        fetch(`/geocode?address=${encodeURIComponent(address.value)}`)
            .then(response => response.json())
            .then(data => {
                if (data.lat && data.lng) {
                    const lat = data.lat;
                    const lng = data.lng;

                    // Dibujar el círculo de radio
                    drawnCircle = new google.maps.Circle({
                        strokeColor: '#6F2F9E',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: '#6F2F9E',
                        fillOpacity: 0.1,
                        map: map,
                        center: { lat, lng },
                        radius: radius // Radio en metros
                    });

                    // Hacer la búsqueda histórica filtrada por ubicación y fechas
                    const url = `/nearbyhistorics?lat=${lat}&lng=${lng}&radius=${radius}&startDate=${encodeURIComponent(date1)}&endDate=${encodeURIComponent(date2)}`;
                    console.log("Encoded URL:", url);  

                    fetch(url)
                        .then(response => response.json())
                        .then(data => {
                            console.log('Data fetched:', data);
                            results = data;
                            if (data.length === 0) {
                                alert('No routes found');
                                clearMap();
                            } else {
                                data.forEach(item => {
                                    updateMapAndRouteHistorics(item.latitude, item.longitude, item.timestamp);
                                    document.getElementById('slider').style.display ='block';
                                });
                                setupSlider(data.length);
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching data:', error);
                        });
                } else {
                    address.classList.add('input-error'); // Indicar error en la dirección
                }
            })
            .catch(error => {
                console.error('Error fetching geocode data:', error);
            });
    }
});



// Configurar el slider
function setupSlider(maxValue) {
    const slider = document.getElementById('marker-slider');
    slider.max = maxValue - 1; // Establecer el máximo en función de los resultados
    slider.value = 0; // Inicialmente en el primer marcador
    slider.style.display = 'block'; // Mostrar el slider

    // Mover el marcador al primer resultado
    updateMarkerPosition(0);

    // Evento al mover el slider
    slider.addEventListener('input', (event) => {
        const index = parseInt(event.target.value);
        updateMarkerPosition(index);
    });
}

// Actualizar la posición del marcador
function updateMarkerPosition(index) {
    // Eliminar el marcador anterior si existe
    if (marker) {
        marker.setMap(null);
    }
    
    // Crear un nuevo marcador en la posición del índice correspondiente
    const position = new google.maps.LatLng(results[index].latitude, results[index].longitude);
    marker = new google.maps.Marker({
        position: position,
        map: map,
        title: results[index].timestamp // Mostrar la fecha/hora en el marcador
    });

    // Mover el mapa a la nueva posición
    map.panTo(position);
}

// Controlar el estado de visualización
let isHistoricalVisible = false;

document.getElementById('historicalDataBtn').addEventListener('click', function() { 
    initHistoricalMap();
    if (isHistoricalVisible) {
        // Ocultar controles históricos y mostrar tiempo real
        document.getElementById('historicalControls').style.display = 'none';
        document.getElementById('realTimeControls').style.display = '';
    } else {
        // Ocultar tiempo real y mostrar controles históricos
        document.getElementById('realTimeControls').style.display = 'none';
        document.getElementById('historicalControls').style.display = '';
        document.getElementById('realtimeBtn').addEventListener('click', function() {
            clearMap();
            shouldFetch = true;
            initMap();       
        if (isHistoricalVisible) {
            document.getElementById('historicalControls').style.display = '';
            document.getElementById('realTimeControls').style.display = 'none';
        } else {
            // Ocultar tiempo real y mostrar controles históricos
            document.getElementById('realTimeControls').style.display = '';
            document.getElementById('historicalControls').style.display = 'none';

        }
    });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadMap();
    document.getElementById('addressControls').style.display = 'none'; // Ocultar controles de dirección al principio
});