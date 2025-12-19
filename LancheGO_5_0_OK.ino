/**
 * @file project_fingerprint_lunch.ino
 * @brief Sistema de Controle de Lanches com Leitor Biométrico ESP8266
 * @version 4.1 (Estável - Identificação não bloqueante + Cadastro guiado)
 */

#include <Wire.h>
#include <SSD1306Wire.h>
#include <Adafruit_Fingerprint.h>
#include <SoftwareSerial.h>

// --- Conexões Hardware ---
#define OLED_SDA_PIN 12 
#define OLED_SCL_PIN 14 
#define FINGERPRINT_RX_PIN 4
#define FINGERPRINT_TX_PIN 5
#define TOUCH_PIN 13

// --- Objetos ---
SSD1306Wire display(0x3C, OLED_SDA_PIN, OLED_SCL_PIN, GEOMETRY_128_64);
SoftwareSerial mySerial(FINGERPRINT_RX_PIN, FINGERPRINT_TX_PIN);
Adafruit_Fingerprint finger(&mySerial);

// --- Variáveis de Estado ---
bool modoCadastro = false;
volatile bool touch_flag = false;
bool waiting_removal = false; // garante apenas 1 leitura por toque
unsigned long lastMessageTime = 0;
bool showingTempMessage = false;

// --- Protótipos ---
void processCommand(String cmd);
void processIdentify();
void processEnroll();
void showShort(const char* top, const char* bottom);
void showDefaultScreen();
int getNextFreeID();

// --- ISR do sensor de toque ---
void IRAM_ATTR touchISR() {
  static unsigned long last_touch_ms = 0;
  if (millis() - last_touch_ms < 500) return; // debounce
  last_touch_ms = millis();
  if (!waiting_removal) touch_flag = true;
}

// --- SETUP ---
void setup() {
  Serial.begin(115200);
  delay(200);

  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
  display.init();
  display.flipScreenVertically();

  mySerial.begin(57600);
  delay(500);
  if (finger.verifyPassword()) {
    showShort("Sensor OK", "");
    delay(500);
  } else {
    Serial.println("ERRO:SENSOR");
    showShort("ERRO NO SENSOR", "");
    while (true) { delay(100); }
  }

  pinMode(TOUCH_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(TOUCH_PIN), touchISR, FALLING);

  Serial.println("STATUS:PRONTO");
}

// --- LOOP ---
void loop() {
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) processCommand(line);
  }

  if (touch_flag) {
    touch_flag = false;
    waiting_removal = true; // bloqueia até retirar dedo
    if (modoCadastro) {
      processEnroll();
    } else {
      processIdentify();
    }
  }

  // Libera para novo toque quando dedo for retirado
  if (waiting_removal && finger.getImage() == FINGERPRINT_NOFINGER) {
    waiting_removal = false;
  }

  // Gerenciador do Display
  if (showingTempMessage && millis() - lastMessageTime > 1000) {
    showingTempMessage = false;
  }
  if (!showingTempMessage) {
    showDefaultScreen();
  }
}

// --- Display ---
void showShort(const char* top, const char* bottom) {
  display.clear();
  display.setFont(ArialMT_Plain_16);
  display.setTextAlignment(TEXT_ALIGN_LEFT);
  
  // --- Top no meio vertical ---
  int textHeight = 16; // altura aproximada da fonte ArialMT_Plain_16
  int y = (64 - textHeight) / 2; // centralizado vertical
  
  display.drawString(0, y, top);  // X=0 → esquerda
  display.setFont(ArialMT_Plain_10);
  display.drawString(0, y + 20, bottom); // opcional: linha abaixo
  display.display();

  lastMessageTime = millis();
  showingTempMessage = true;
}

void showDefaultScreen() {
  display.clear();
  display.setFont(ArialMT_Plain_16);
  display.setTextAlignment(TEXT_ALIGN_CENTER);
  display.drawString(64, 25, "Aguardando...");
  display.display();
}

// --- Identificação ---
void processIdentify() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) {
    Serial.println("ERRO:LEITURA");
    showShort("Tente Novamente", "");
    return;
  }

  finger.image2Tz();
  p = finger.fingerFastSearch();

  if (p == FINGERPRINT_OK) {
    char buf[16];
    snprintf(buf, sizeof(buf), "MATCH:%d", finger.fingerID);
    Serial.println(buf);
    showShort("Liberado", "");
  } else {
    Serial.println("NAO_ENCONTRADO");
    showShort("Nao Cadastrado", "");
  }
}

// --- Cadastro guiado ---
void processEnroll() {
  int id = getNextFreeID();
  if (id == -1) {
    Serial.println("CADASTRO_ERRO:CHEIO");
    showShort("Memória Cheia", "");
    modoCadastro = false; // Retorna ao modo padrão
    return;
  }

  char buf[20];
  uint8_t p; // variável usada para os retornos do sensor

  // 1ª digital
  Serial.println("INFO: Posicione o dedo no sensor");
  showShort("Posicione o Dedo", "(1/2)");
  while (finger.getImage() != FINGERPRINT_OK) { delay(50); }

  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    Serial.println("CADASTRO_ERRO:LEITURA_1");
    showShort("Erro na Leitura", "");
    modoCadastro = false;
    return;
  }
  Serial.println("INFO: Imagem obtida");
  showShort("OK!", "Remova o dedo");

  // Remover dedo
  Serial.println("INFO: Retire o dedo");
  while (finger.getImage() != FINGERPRINT_NOFINGER) { delay(50); }
  delay(500);

  // 2ª digital
  Serial.println("INFO: Posicione o mesmo dedo novamente");
  showShort("Pressione Novamente", "(2/2)");
  while (finger.getImage() != FINGERPRINT_OK) { delay(50); }

  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    Serial.println("CADASTRO_ERRO:LEITURA_2");
    showShort("Erro na Leitura", "");
    modoCadastro = false;
    return;
  }

  // Criar modelo
  p = finger.createModel();
  if (p != FINGERPRINT_OK) {
    Serial.println("CADASTRO_ERRO:DEDOS_DIFERENTES");
    showShort("Digitais Diferentes", "");
    modoCadastro = false;
    return;
  }

  // Salvar
  p = finger.storeModel(id);
  if (p != FINGERPRINT_OK) {
    Serial.println("CADASTRO_ERRO:SALVAR");
    showShort("Erro ao Salvar", "");
    modoCadastro = false;
    return;
  }

  snprintf(buf, sizeof(buf), "CADASTRO_OK:%d", id);
  Serial.println(buf);
  showShort("Salvo com Sucesso!", "");
  modoCadastro = false; // Retorna ao modo de identificação
}

// --- Comandos ---
void processCommand(String cmd) {
  if (cmd == "IDENTIFICAR") {
    modoCadastro = false;
    Serial.println("MODO:IDENTIFICAR");
    showShort("Modo Identificar", "");
  } else if (cmd == "CADASTRO") {
    modoCadastro = true;
    Serial.println("MODO:CADASTRO");
    showShort("Modo Cadastro", "Toque para iniciar");
  } else if (cmd.startsWith("DELETAR:")) {
    int id = cmd.substring(8).toInt();
    if (id > 0 && finger.deleteModel(id) == FINGERPRINT_OK) {
      char buf[16];
      snprintf(buf, sizeof(buf), "DELETAR_OK:%d", id);
      Serial.println(buf);
      showShort("ID Apagado", "");
    } else {
      char buf[16];
      snprintf(buf, sizeof(buf), "DELETAR_ERRO:%d", id);
      Serial.println(buf);
      showShort("Erro ao Apagar", "");
    }
  } else if (cmd == "LIMPAR") {
    if (finger.emptyDatabase() == FINGERPRINT_OK) {
      Serial.println("LIMPAR_OK");
      showShort("Memória Limpa", "");
    } else {
      Serial.println("LIMPAR_ERRO");
      showShort("Erro na Limpeza", "");
    }
  }
}

int getNextFreeID() {
  for (int i = 1; i <= 1000; i++) {
    if (finger.loadModel(i) != FINGERPRINT_OK) {
      return i;
    }
  }
  return -1;
}
