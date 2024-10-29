import socket
import pymysql
import os

UDP_IP = "0.0.0.0"
UDP_PORT = 5005
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

        # Verificar que haya rpm y speed
        if len(data_values) >= 2:  # Asegurarse de que haya al menos rpm y speed
            rpm, speed = data_values[0:2]  # Obtener rpm y speed
            rpm = float(rpm)
            speed = float(speed)

            # Insertar en la tabla OBD usando NULL para timestamp
            sql = "INSERT INTO OBD (rpm, speed, timestamp) VALUES (%s, %s, NULL)"
            cursor.execute(sql, (rpm, speed))  # No se especifica timestamp, se guardará como NULL
            print(f"Datos insertados en OBD: rpm={rpm}, speed={speed}, timestamp=NULL")

            # Guardar los cambios en la base de datos
            db.commit()

    except Exception as e:
        print(f"Error al procesar los datos: {e}")
        db.rollback()

cursor.close()
db.close()


