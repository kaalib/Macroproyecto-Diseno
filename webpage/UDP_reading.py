import socket
import pymysql
import os

UDP_IP = "0.0.0.0"
UDP_PORT = 5055
BUFFER_SIZE = 1024

db = pymysql.connect(
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_DATABASE")
)

cursor = db.cursor()

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((UDP_IP, UDP_PORT))

print(f"Escuchando en {UDP_IP}:{UDP_PORT}")

while True:
    data, addr = sock.recvfrom(BUFFER_SIZE)
    print(f"Datos recibidos: {data.decode()} desde {addr}")

    try:
        data_values = data.decode().split(',')

        if len(data_values) >= 3:  # Verificar que haya al menos latitud, longitud y timestamp
            latitude, longitude, timestamp = data_values[:3]
            latitude = float(latitude)
            longitude = float(longitude)

            # Insertar en la tabla coordinates
            sql = "INSERT INTO coordinates (latitude, longitude, timestamp) VALUES (%s, %s, %s)"
            cursor.execute(sql, (latitude, longitude, timestamp))
            print(f"Datos insertados en coordinates: latitud={latitude}, longitud={longitude}, timestamp={timestamp}")

        if len(data_values) >= 5:  # Verificar que haya rpm y speed
            rpm, speed = data_values[3:5]
            rpm = float(rpm)
            speed = float(speed)

            # Insertar en la tabla OBD usando el mismo timestamp de coordinates
            sql = "INSERT INTO OBD (rpm, speed, timestamp) VALUES (%s, %s, %s)"
            cursor.execute(sql, (rpm, speed, timestamp))
            print(f"Datos insertados en OBD: rpm={rpm}, speed={speed}, timestamp={timestamp}")

        # Guardar los cambios en la base de datos
        db.commit()

    except Exception as e:
        print(f"Error al procesar los datos: {e}")
        db.rollback()

cursor.close()
db.close()
