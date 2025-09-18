# api/hardware_manager.py

import serial
import time

# ⚠️ MUITO IMPORTANTE: Verifique se esta porta é a mesma do seu script listen_serial.py
SERIAL_PORT = 'COM3' # <--- CONFIRME SE ESTA É A PORTA CORRETA
BAUD_RATE = 115200

def send_command_to_hardware(command):
    """
    Abre a porta serial, envia um comando e fecha a porta.
    Retorna True se o comando foi enviado com sucesso, False caso contrário.
    """
    try:
        with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1) as ser:
            # Garante que o buffer de saída esteja limpo antes de enviar
            ser.flushOutput()

            # Adiciona o caractere de nova linha '\n', que o ESP8266 espera
            full_command = f"{command}\n"

            # Envia o comando em bytes
            ser.write(full_command.encode('utf-8'))

            print(f"Comando '{command}' enviado para {SERIAL_PORT}")
            return True
    except serial.SerialException as e:
        print(f"Erro ao enviar comando para {SERIAL_PORT}: {e}")
        return False