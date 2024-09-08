import socket
import pymysql


UDP_IP = "0.0.0.0" 
UDP_PORT = 5055
BUFFER_SIZE = 1024 

db = pymysql.connect(
    host="localhost",
    user="isa22",
    password="karen4",
    database="DesignProject"
)

cursor = db.cursor()

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((UDP_IP, UDP_PORT))

print(f"Escuchando en {UDP_IP}:{UDP_PORT}")

while True:
    data, addr = sock.recvfrom(BUFFER_SIZE)
    print(f"Datos recibidos: {data.decode()} desde {addr}")

    try:
        latitude, longitude, timestamp = data.decode().split(',')
        latitude = float(latitude)
        longitude = float(longitude)

        # Consulta SQL para actualizar la tabla coordinates
        sql = "INSERT INTO coordinates (latitude, longitude, timestamp) VALUES (%s, %s, %s)"
        cursor.execute(sql, (latitude, longitude, timestamp))
        
        # Guardar los cambios en la base de datos
        db.commit()

        print(f"Datos insertados en la base de datos: {latitude}, {longitude}, {timestamp}")

    except Exception as e:
        print(f"Error al procesar los datos: {e}")
        db.rollback() 
        
cursor.close()
db.close()
