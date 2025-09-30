import serial
import time
from api.management.commands.listen_serial import find_serial_port_by_hwid

BAUD_RATE = 115200

def send_command_to_hardware(command):
    """
    Detecta a porta serial automaticamente, envia um comando e fecha a porta.
    Retorna True se o comando foi enviado com sucesso, False caso contrário.
    """
    # --- MUDANÇA: A porta não é mais fixa, é detectada ---
    serial_port = find_serial_port_by_hwid()

    if not serial_port:
        print("Erro: Dispositivo LancheGO não encontrado. O comando não foi enviado.")
        return False

    try:
        with serial.Serial(serial_port, BAUD_RATE, timeout=2) as ser:
            time.sleep(2) # Espera o dispositivo reiniciar após a conexão
            ser.flushOutput()

            full_command = f"{command}\n"
            ser.write(full_command.encode('utf-8'))

            print(f"Comando '{command}' enviado para a porta detectada {serial_port}")
            return True
            
    except serial.SerialException as e:
        print(f"Erro ao enviar comando para {serial_port}: {e}")
        return False