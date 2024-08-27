import socket
import pymysql
from datetime import datetime

# Configuración de la conexión TCP
TCP_IP = '0.0.0.0'  # Escuchar en todas las interfaces
TCP_PORT = 12222
BUFFER_SIZE = 1024

# Configuración de la conexión a MySQL
MYSQL_HOST = 'localhost'
MYSQL_USER = 'isa22'
MYSQL_PASSWORD = 'karen4'
MYSQL_DATABASE = 'DesignProject'

# Configuración del servidor TCP
server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server_socket.bind((TCP_IP, TCP_PORT))
server_socket.listen(1)
print(f"Listening for connections on {TCP_IP}:{TCP_PORT}...")

# Conectar a la base de datos MySQL
connection = pymysql.connect(
    host=MYSQL_HOST,
    user=MYSQL_USER,
    password=MYSQL_PASSWORD,
    database=MYSQL_DATABASE
)
cursor = connection.cursor()

try:
    while True:
        # Aceptar una conexión
        client_socket, client_address = server_socket.accept()
        print(f"Connection from {client_address}")

        try:
            # Leer datos del cliente
            data = client_socket.recv(BUFFER_SIZE).decode('utf-8')
            if data:
                # Suponiendo que los datos están en el formato: "latitude,longitude,timestamp"
                print(f"Received data: {data}")

                # Parsear los datos
                latitude, longitude, timestamp_str = data.split(',')
                latitude = float(latitude)
                longitude = float(longitude)
                timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")

                # Actualizar la base de datos
                update_query = """
                INSERT INTO coordinates (latitude, longitude, timestamp)
                VALUES (%s, %s, %s)
                """
                cursor.execute(update_query, (latitude, longitude, timestamp))
                connection.commit()
                print("Data updated in database.")
            else:
                print("No data received.")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            client_socket.close()

finally:
    cursor.close()
    connection.close()
    server_socket.close()
