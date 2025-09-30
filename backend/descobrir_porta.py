# descobrir_porta.py
import serial.tools.list_ports

def encontrar_dispositivos():
    """Lista todos os dispositivos seriais conectados com detalhes."""
    ports = serial.tools.list_ports.comports()
    
    if not ports:
        print("Nenhum dispositivo serial encontrado.")
        return

    print("Dispositivos seriais encontrados:")
    print("-" * 60)
    for port in ports:
        print(f"Porta: {port.device}")
        print(f"  Descrição: {port.description}")
        print(f"  HWID: {port.hwid}")
        print("-" * 60)

if __name__ == "__main__":
    encontrar_dispositivos()