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


        latitude = float(data_values[0])         
        longitude = float(data_values[1])        
        timestamp = data_values[2]                
        rpm = float(data_values[3])               
        speed = float(data_values[4])           
        id = int(data_values[5])              

        sql = "INSERT INTO coordinates (latitude, longitude, timestamp, rpm, speed, id) VALUES (%s, %s, %s, %s, %s, %s)"
        cursor.execute(sql, (latitude, longitude, timestamp, rpm, speed, id))
        print(f"Datos insertados en coordinates: latitud={latitude}, longitud={longitude}, timestamp={timestamp}, rpm={rpm}, speed={speed}, id={id}")

        db.commit()

    except Exception as e:
        print(f"Error al procesar los datos: {e}")
        db.rollback()

cursor.close()
db.close()
