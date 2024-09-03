import socket
import pymysql
from datetime import datetime

# Configuración del servidor UDP
UDP_IP = "0.0.0.0"  # Escuchar en todas las interfaces de red
UDP_PORT = 5055
BUFFER_SIZE = 1024  # Tamaño del buffer

# Conexión a la base de datos MySQL
db = pymysql.connect(
    host="localhost",
    user="isa22",
    password="karen4",
    database="DesignProject"
)

cursor = db.cursor()

# Configuración del socket UDP
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((UDP_IP, UDP_PORT))

print(f"Escuchando en {UDP_IP}:{UDP_PORT}")

while True:
    # Recibir datos desde el puerto UDP
    data, addr = sock.recvfrom(BUFFER_SIZE)
    print(f"Datos recibidos: {data.decode()} desde {addr}")

    try:
        # Asumiendo que los datos recibidos están en el formato "latitude,longitude"
        latitude, longitude = map(float, data.decode().split(','))

        # Obtener el timestamp actual
        timestamp = datetime.now()

        # Consulta SQL para actualizar la tabla coordinates
        sql = "INSERT INTO coordinates (latitude, longitude, timestamp) VALUES (%s, %s, %s)"
        cursor.execute(sql, (latitude, longitude, timestamp))
        
        # Guardar los cambios en la base de datos
        db.commit()

        print(f"Datos insertados en la base de datos: {latitude}, {longitude}, {timestamp}")

    except Exception as e:
        print(f"Error al procesar los datos: {e}")
        db.rollback()  # Revertir en caso de error

# Cerrar la conexión al finalizar (esto no se alcanzará en un bucle infinito)
cursor.close()
db.close()
