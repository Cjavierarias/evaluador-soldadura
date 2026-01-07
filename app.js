/**
 * Evaluador de Soldadura Pro - Aplicación Principal v2.0
 * 
 * Esta aplicación permite evaluar la destreza en soldadura utilizando
 * los sensores del dispositivo móvil (giroscopio, acelerómetro) y la cámara.
 * 
 * Características principales:
 * - Modo práctica y modo examen
 * - Calibración de sensores
 * - Feedback visual en tiempo real
 * - Integración con Google Forms
 * - Historial de evaluaciones
 * - Modo oscuro optimizado para entornos industriales
 */

// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================

const CONFIG = {
  // Google Forms URLs (proporcionados por el usuario)
  FORMS: {
    REGISTRATION: 'https://docs.google.com/forms/d/e/1FAIpQLSf0GoRVVKUiLLt_Ku8-labwOCanmxMzhYCM1VF88Qu6srR5ZQ/viewform',
    EVALUATION: 'https://docs.google.com/forms/d/e/1FAIpQLSfwLfjqDQWPK01eip2Gkqdz21VYhThEJm1Rts2yHXyufUB7mg/formResponse'
  },
  
  // Entry IDs para Google Forms (mapeo de campos)
  ENTRIES: {
    REGISTRATION: {
      NAME: 'entry.1647491836',
      ID: 'entry.1606349898',
      COURSE: 'entry.1165168310',
      ELECTRODE: 'entry.1807387719',
      POSITION: 'entry.2049238669'
    },
    EVALUATION: {
      NAME: 'entry.1070934200',
      ID: 'entry.67394734',
      ELECTRODE: 'entry.1627990674',
      POSITION: 'entry.2056367670',
      WORK_ANGLE_AVG: 'entry.1626957981',
      WORK_ANGLE_MIN: 'entry.1626957981',
      WORK_ANGLE_MAX: 'entry.1626957981',
      TRAVEL_ANGLE_AVG: 'entry.1889960289',
      TRAVEL_ANGLE_MIN: 'entry.1889960289',
      TRAVEL_ANGLE_MAX: 'entry.1889960289',
      VELOCITY_AVG: 'entry.1159738616',
      VELOCITY_MIN: 'entry.1159738616',
      VELOCITY_MAX: 'entry.1159738616',
      STABILITY: 'entry.2137747767',
      SCORE: 'entry.2137747767',
      DURATION: 'entry.1207381543',
      DATE: 'entry.2089801060'
    }
  },
  
  // Rangos óptimos para evaluación
  RANGES: {
    WORK_ANGLE: { MIN: 30, MAX: 60, OPTIMAL: 45 },
    TRAVEL_ANGLE: { MIN: -15, MAX: 15, OPTIMAL: 0 },
    VELOCITY: { MIN: 1.0, MAX: 3.0, OPTIMAL: 2.0 },
    DISTANCE: { MIN: 5, MAX: 30, DEFAULT: 10 }
  },
  
  // Configuración de evaluación
  EVALUATION: {
    DURATION: 30, // segundos
    SAMPLE_RATE: 100, // ms entre muestras
    VELOCITY_SAMPLES: 5 // muestras para promediar velocidad
  },
  
  // Factor de calibración por defecto
  VELOCITY_CALIBRATION: 2.5,
  
  // Umbrales para calificación
  SCORING: {
    PASS: 70,
    EXCELLENT: 90
  }
};

// ==========================================
// ESTADO DE LA APLICACIÓN
// ==========================================

const AppState = {
  currentScreen: 'welcome',
  mode: 'practice', // 'practice' o 'exam'
  isQuickTest: false,
  isEvaluating: false,
  participant: null,
  calibration: {
    betaOffset: null,
    gammaOffset: null,
    velocityFactor: CONFIG.VELOCITY_CALIBRATION,
    distance: CONFIG.RANGES.DISTANCE.DEFAULT,
    isCalibrated: false
  },
  evaluation: {
    startTime: null,
    timerInterval: null,
    data: [],
    results: null
  },
  sensors: {
    beta: 0,    // Ángulo de trabajo (rotación X)
    gamma: 0,   // Ángulo de viaje (rotación Y)
    accelX: 0,
    accelY: 0,
    accelZ: 0,
    velocity: 0
  }
};

// ==========================================
// MANAGER DE SENSORES
// ==========================================

const SensorManager = {
  isSupported: {
    gyroscope: false,
    accelerometer: false,
    deviceMotion: false
  },
  
  listeners: [],
  lastBetaReadings: [],
  lastGammaReadings: [],
  lastVelocityReadings: [],
  filterAlpha: 0.1, // Factor de filtro de paso bajo
  
  /**
   * Inicializa los sensores del dispositivo
   */
  async init() {
    return new Promise((resolve) => {
      // Verificar soporte de sensores
      if (window.DeviceMotionEvent) {
        this.isSupported.deviceMotion = true;
        this.isSupported.accelerometer = true;
      }
      
      if (window.DeviceOrientationEvent) {
        this.isSupported.gyroscope = true;
      }
      
      // Solicitar permisos para iOS 13+
      this.requestPermissions()
        .then(() => {
          this.addListeners();
          resolve(true);
        })
        .catch((err) => {
          console.warn('Error al solicitar permisos de sensores:', err);
          resolve(false);
        });
    });
  },
  
  /**
   * Solicita permisos para sensores en iOS 13+
   */
  async requestPermissions() {
    // iOS 13+ requiere permiso explícito para DeviceOrientation
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Permiso de sensores denegado');
        }
      } catch (err) {
        console.warn('Error solicitando permiso de orientación:', err);
        // No lanzamos el error para permitir continuar en Android
      }
    }
    
    // iOS 13+ también puede requerir permiso para DeviceMotion
    if (typeof DeviceMotionEvent !== 'undefined' && 
        typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission !== 'granted') {
          console.warn('Permiso de movimiento denegado');
        }
      } catch (err) {
        console.warn('Error solicitando permiso de movimiento:', err);
      }
    }
  },
  
  /**
   * Agrega listeners para sensores
   */
  addListeners() {
    window.addEventListener('deviceorientation', (event) => this.handleOrientation(event));
    window.addEventListener('devicemotion', (event) => this.handleMotion(event));
  },
  
  /**
   * Maneja eventos de orientación (giroscopio)
   */
  handleOrientation(event) {
    // Beta: rotación en eje X (-180 a 180) - Ángulo de trabajo
    // Gamma: rotación en eje Y (-90 a 90) - Ángulo de viaje
    
    let beta = event.beta || 0;
    let gamma = event.gamma || 0;
    
    // Aplicar offset de calibración si existe
    if (AppState.calibration.betaOffset !== null) {
      beta = beta - AppState.calibration.betaOffset;
    }
    
    if (AppState.calibration.gammaOffset !== null) {
      gamma = gamma - AppState.calibration.gammaOffset;
    }
    
    // Filtro de paso bajo para suavizar lecturas
    beta = this.lowPassFilter(beta, 'beta');
    gamma = this.lowPassFilter(gamma, 'gamma');
    
    AppState.sensors.beta = this.normalizeAngle(beta, -180, 180);
    AppState.sensors.gamma = this.normalizeAngle(gamma, -90, 90);
    
    // Notificar a listeners
    this.notifyListeners();
  },
  
  /**
   * Maneja eventos de movimiento (acelerómetro)
   */
  handleMotion(event) {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;
    
    AppState.sensors.accelX = acc.x || 0;
    AppState.sensors.accelY = acc.y || 0;
    AppState.sensors.accelZ = acc.z || 0;
    
    // Calcular velocidad basada en aceleración
    this.calculateVelocity();
  },
  
  /**
   * Calcula la velocidad estimada basada en el acelerómetro
   */
  calculateVelocity() {
    // Calcular magnitud de aceleración
    const magnitude = Math.sqrt(
      Math.pow(AppState.sensors.accelX, 2) +
      Math.pow(AppState.sensors.accelY, 2) +
      Math.pow(AppState.sensors.accelZ, 2)
    );
    
    // Filtrar gravedad (asumimos gravedad ~9.8 m/s²)
    const filtered = Math.abs(magnitude - 9.8);
    
    // Aplicar factor de calibración
    const velocity = filtered * AppState.calibration.velocityFactor;
    
    // Guardar lecturas para promediar
    this.lastVelocityReadings.push(velocity);
    if (this.lastVelocityReadings.length > CONFIG.EVALUATION.VELOCITY_SAMPLES) {
      this.lastVelocityReadings.shift();
    }
    
    // Calcular promedio
    if (this.lastVelocityReadings.length > 0) {
      const avg = this.lastVelocityReadings.reduce((a, b) => a + b, 0) / 
                  this.lastVelocityReadings.length;
      // Escalar a cm/s aproximado (ajuste empírico)
      AppState.sensors.velocity = avg * 0.5;
    }
  },
  
  /**
   * Filtro de paso bajo para suavizar lecturas de sensores
   */
  lowPassFilter(value, type) {
    const key = type + 'Filter';
    if (!this[key]) {
      this[key] = value;
    }
    
    this[key] = this.filterAlpha * value + (1 - this.filterAlpha) * this[key];
    return this[key];
  },
  
  /**
   * Normaliza un ángulo a un rango específico
   */
  normalizeAngle(angle, min, max) {
    while (angle > max) angle -= (max - min);
    while (angle < min) angle += (max - min);
    return angle;
  },
  
  /**
   * Agrega un listener para cambios de sensores
   */
  addListener(callback) {
    this.listeners.push(callback);
  },
  
  /**
   * Notifica a todos los listeners
   */
  notifyListeners() {
    this.listeners.forEach(callback => callback(AppState.sensors));
  },
  
  /**
   * Calibra el ángulo beta (trabajo)
   */
  calibrateBeta() {
    AppState.calibration.betaOffset = AppState.sensors.beta;
    AppState.calibration.isCalibrated = true;
    return AppState.calibration.betaOffset;
  },
  
  /**
   * Calibra el ángulo gamma (viaje)
   */
  calibrateGamma() {
    AppState.calibration.gammaOffset = AppState.sensors.gamma;
    AppState.calibration.isCalibrated = true;
    return AppState.calibration.gammaOffset;
  },
  
  /**
   * Restablece la calibración
   */
  resetCalibration() {
    AppState.calibration.betaOffset = null;
    AppState.calibration.gammaOffset = null;
    AppState.calibration.isCalibrated = false;
  },
  
  /**
   * Verifica el estado de los sensores
   */
  checkStatus() {
    const status = {
      gyroscope: this.isSupported.gyroscope && AppState.sensors.beta !== 0,
      accelerometer: this.isSupported.accelerometer && AppState.sensors.accelX !== 0,
      camera: false
    };
    
    return status;
  }
};

// ==========================================
// MANAGER DE CÁMARA
// ==========================================

const CameraManager = {
  stream: null,
  videoElement: null,
  canvasElement: null,
  ctx: null,
  animationFrame: null,
  
  /**
   * Inicializa la cámara
   */
  async init(videoElement, canvasElement) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    
    if (this.canvasElement) {
      this.ctx = this.canvasElement.getContext('2d');
    }
    
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
      }
      
      return true;
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      Toast.show('Error al acceder a la cámara. Verifica los permisos.', 'error');
      return false;
    }
  },
  
  /**
   * Inicia el procesamiento de frames
   */
  startProcessing(callback) {
    if (!this.videoElement || !this.canvasElement) return;
    
    const processFrame = () => {
      if (!this.videoElement.paused && !this.videoElement.ended) {
        // Copiar frame al canvas
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;
        this.ctx.drawImage(this.videoElement, 0, 0);
        
        // Procesar imagen (dibujar guías, etc.)
        if (callback) {
          callback(this.ctx, this.canvasElement.width, this.canvasElement.height);
        }
      }
      
      this.animationFrame = requestAnimationFrame(processFrame);
    };
    
    processFrame();
  },
  
  /**
   * Detiene el procesamiento y la cámara
   */
  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  },
  
  /**
   * Verifica si la cámara está disponible
   */
  isAvailable() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
};

// ==========================================
// EVALUADOR DE SOLDADURA
// ==========================================

const WeldingEvaluator = {
  /**
   * Inicia una nueva evaluación
   */
  start() {
    AppState.evaluation.data = [];
    AppState.evaluation.startTime = Date.now();
    AppState.evaluation.results = null;
    AppState.isEvaluating = true;
    
    // Iniciar timer
    this.startTimer();
    
    // Iniciar captura de sensores
    SensorManager.addListener((sensors) => this.recordSample(sensors));
  },
  
  /**
   * Detiene la evaluación actual
   */
  stop() {
    AppState.isEvaluating = false;
    
    // Detener timer
    if (AppState.evaluation.timerInterval) {
      clearInterval(AppState.evaluation.timerInterval);
      AppState.evaluation.timerInterval = null;
    }
    
    // Detener listener de sensores
    // Nota: No removemos completamente el listener para mantener la actualización de UI
    
    // Calcular resultados
    this.calculateResults();
    
    // Detener cámara
    CameraManager.stop();
    
    // Mostrar resultados
    UIManager.showResults();
  },
  
  /**
   * Inicia el temporizador de evaluación
   */
  startTimer() {
    let remaining = CONFIG.EVALUATION.DURATION;
    
    UIManager.updateTimer(remaining);
    
    AppState.evaluation.timerInterval = setInterval(() => {
      remaining--;
      UIManager.updateTimer(remaining);
      
      if (remaining <= 0) {
        this.stop();
        Toast.show('Evaluación completada', 'success');
      }
    }, 1000);
  },
  
  /**
   * Registra una muestra de sensores
   */
  recordSample(sensors) {
    if (!AppState.isEvaluating) return;
    
    const sample = {
      timestamp: Date.now() - AppState.evaluation.startTime,
      workAngle: sensors.beta,
      travelAngle: sensors.gamma,
      velocity: sensors.velocity,
      stability: this.calculateStability(sensors)
    };
    
    AppState.evaluation.data.push(sample);
    
    // Actualizar UI
    UIManager.updateEvaluationUI(sensors);
    
    // Actualizar progreso
    const progress = (sample.timestamp / (CONFIG.EVALUATION.DURATION * 1000)) * 100;
    UIManager.updateProgress(progress);
  },
  
  /**
   * Calcula la estabilidad basada en la varianza de aceleración
   */
  calculateStability(sensors) {
    const variance = Math.abs(sensors.accelX) + Math.abs(sensors.accelY) + Math.abs(sensors.accelZ);
    // Menor varianza = mayor estabilidad
    return Math.max(0, 100 - variance);
  },
  
  /**
   * Calcula los resultados finales de la evaluación
   */
  calculateResults() {
    const data = AppState.evaluation.data;
    
    if (data.length === 0) {
      AppState.evaluation.results = null;
      return;
    }
    
    // Calcular promedios y rangos
    const workAngles = data.map(d => d.workAngle);
    const travelAngles = data.map(d => d.travelAngle);
    const velocities = data.map(d => d.velocity);
    const stability = data.map(d => d.stability);
    
    const results = {
      workAngle: {
        avg: this.average(workAngles),
        min: Math.min(...workAngles),
        max: Math.max(...workAngles),
        inRange: this.countInRange(workAngles, CONFIG.RANGES.WORK_ANGLE.MIN, CONFIG.RANGES.WORK_ANGLE.MAX)
      },
      travelAngle: {
        avg: this.average(travelAngles),
        min: Math.min(...travelAngles),
        max: Math.max(...travelAngles),
        inRange: this.countInRange(travelAngles, CONFIG.RANGES.TRAVEL_ANGLE.MIN, CONFIG.RANGES.TRAVEL_ANGLE.MAX)
      },
      velocity: {
        avg: this.average(velocities),
        min: Math.min(...velocities),
        max: Math.max(...velocities),
        inRange: this.countInRange(velocities, CONFIG.RANGES.VELOCITY.MIN, CONFIG.RANGES.VELOCITY.MAX)
      },
      stability: {
        avg: this.average(stability),
        deviation: this.standardDeviation(stability)
      },
      duration: (Date.now() - AppState.evaluation.startTime) / 1000,
      samples: data.length
    };
    
    // Calcular puntuación
    results.score = this.calculateScore(results);
    results.grade = this.getGrade(results.score);
    
    AppState.evaluation.results = results;
  },
  
  /**
   * Calcula el promedio de un array
   */
  average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  },
  
  /**
   * Calcula la desviación estándar
   */
  standardDeviation(arr) {
    const avg = this.average(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  },
  
  /**
   * Cuenta elementos dentro de un rango
   */
  countInRange(arr, min, max) {
    return arr.filter(v => v >= min && v <= max).length;
  },
  
  /**
   * Calcula la puntuación final (0-100)
   */
  calculateScore(results) {
    let score = 0;
    
    // Puntuación de ángulo de trabajo (40%)
    const workScore = this.calculateAngleScore(results.workAngle.avg, CONFIG.RANGES.WORK_ANGLE);
    score += workScore * 0.4;
    
    // Puntuación de ángulo de viaje (25%)
    const travelScore = this.calculateAngleScore(results.travelAngle.avg, CONFIG.RANGES.TRAVEL_ANGLE);
    score += travelScore * 0.25;
    
    // Puntuación de velocidad (20%)
    const velocityScore = this.calculateVelocityScore(results.velocity.avg);
    score += velocityScore * 0.20;
    
    // Puntuación de estabilidad (15%)
    const stabilityScore = Math.min(100, results.stability.avg);
    score += stabilityScore * 0.15;
    
    return Math.round(score);
  },
  
  /**
   * Calcula puntuación para ángulos
   */
  calculateAngleScore(avg, range) {
    const optimal = Math.abs(range.OPTIMAL);
    const deviation = Math.abs(avg - optimal);
    const maxDeviation = Math.max(Math.abs(range.MIN), Math.abs(range.MAX));
    
    if (deviation <= 5) return 100;
    if (deviation <= maxDeviation * 0.3) return 90;
    if (deviation <= maxDeviation * 0.6) return 70;
    if (deviation <= maxDeviation) return 50;
    return 20;
  },
  
  /**
   * Calcula puntuación para velocidad
   */
  calculateVelocityScore(avg) {
    if (avg >= CONFIG.RANGES.VELOCITY.MIN && avg <= CONFIG.RANGES.VELOCITY.MAX) {
      const optimal = CONFIG.RANGES.VELOCITY.OPTIMAL;
      const deviation = Math.abs(avg - optimal) / (CONFIG.RANGES.VELOCITY.MAX - CONFIG.RANGES.VELOCITY.MIN);
      return Math.max(60, 100 - deviation * 40);
    }
    
    const distance = avg < CONFIG.RANGES.VELOCITY.MIN 
      ? CONFIG.RANGES.VELOCITY.MIN - avg 
      : avg - CONFIG.RANGES.VELOCITY.MAX;
    
    return Math.max(0, 50 - distance * 20);
  },
  
  /**
   * Determina la calificación según la puntuación
   */
  getGrade(score) {
    if (score >= CONFIG.SCORING.EXCELLENT) return 'EXCELENTE';
    if (score >= CONFIG.SCORING.PASS) return 'APROBADO';
    return 'REPROBADO';
  }
};

// ==========================================
// INTEGRACIÓN CON GOOGLE FORMS
// ==========================================

const GoogleFormsIntegration = {
  /**
   * Envía datos de registro a Google Forms
   */
  async submitRegistration(data) {
    const formUrl = CONFIG.FORMS.REGISTRATION;
    const entries = CONFIG.ENTRIES.REGISTRATION;
    
    const formData = new URLSearchParams();
    formData.append(entries.NAME, data.name);
    formData.append(entries.ID, data.id);
    formData.append(entries.COURSE, data.course);
    formData.append(entries.ELECTRODE, data.electrode);
    formData.append(entries.POSITION, data.position);
    
    return this.submitForm(formUrl, formData);
  },
  
  /**
   * Envía resultados de evaluación a Google Forms
   */
  async submitEvaluation(results, participant) {
    const formUrl = CONFIG.FORMS.EVALUATION;
    const entries = CONFIG.ENTRIES.EVALUATION;
    
    const formData = new URLSearchParams();
    formData.append(entries.NAME, participant.name);
    formData.append(entries.ID, participant.id);
    formData.append(entries.ELECTRODE, participant.electrode);
    formData.append(entries.POSITION, participant.position);
    formData.append(entries.WORK_ANGLE_AVG, results.workAngle.avg.toFixed(2));
    formData.append(entries.WORK_ANGLE_MIN, results.workAngle.min.toFixed(2));
    formData.append(entries.WORK_ANGLE_MAX, results.workAngle.max.toFixed(2));
    formData.append(entries.TRAVEL_ANGLE_AVG, results.travelAngle.avg.toFixed(2));
    formData.append(entries.TRAVEL_ANGLE_MIN, results.travelAngle.min.toFixed(2));
    formData.append(entries.TRAVEL_ANGLE_MAX, results.travelAngle.max.toFixed(2));
    formData.append(entries.VELOCITY_AVG, results.velocity.avg.toFixed(2));
    formData.append(entries.VELOCITY_MIN, results.velocity.min.toFixed(2));
    formData.append(entries.VELOCITY_MAX, results.velocity.max.toFixed(2));
    formData.append(entries.STABILITY, results.stability.avg.toFixed(2));
    formData.append(entries.SCORE, results.score);
    formData.append(entries.DURATION, results.duration.toFixed(2));
    formData.append(entries.DATE, new Date().toLocaleDateString('es-ES'));
    
    return this.submitForm(formUrl, formData);
  },
  
  /**
   * Envía el formulario usando fetch
   */
  async submitForm(url, data) {
    try {
      // Intentar envío con fetch
      const response = await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        body: data
      });
      
      return { success: true, method: 'fetch' };
    } catch (err) {
      console.warn('Fetch falló, intentando método alternativo:', err);
      
      // Método alternativo: abrir formulario pre-llenado
      const fullUrl = url + '?' + data.toString();
      window.open(fullUrl, '_blank');
      
      return { success: true, method: 'alternative' };
    }
  }
};

// ==========================================
// GESTOR DE HISTORIAL
// ==========================================

const HistoryManager = {
  STORAGE_KEY: 'welding_evaluations_history',
  
  /**
   * Guarda una evaluación en el historial
   */
  save(evaluation) {
    const history = this.getHistory();
    
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      participant: evaluation.participant,
      results: evaluation.results,
      mode: evaluation.mode
    };
    
    history.unshift(entry);
    
    // Limitar a últimas 50 entradas
    if (history.length > 50) {
      history.pop();
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    return entry;
  },
  
  /**
   * Obtiene el historial completo
   */
  getHistory() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  /**
   * Obtiene estadísticas del historial
   */
  getStats() {
    const history = this.getHistory();
    
    if (history.length === 0) {
      return { total: 0, avgScore: 0, passRate: 0 };
    }
    
    const total = history.length;
    const avgScore = history.reduce((sum, e) => sum + e.results.score, 0) / total;
    const passed = history.filter(e => e.results.score >= CONFIG.SCORING.PASS).length;
    const passRate = (passed / total) * 100;
    
    return {
      total,
      avgScore: Math.round(avgScore),
      passRate: Math.round(passRate)
    };
  },
  
  /**
   * Elimina el historial completo
   */
  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  },
  
  /**
   * Exporta el historial como JSON
   */
  exportJSON() {
    const history = this.getHistory();
    return JSON.stringify(history, null, 2);
  }
};

// ==========================================
// MANAGER DE INTERFAZ DE USUARIO
// ==========================================

const UIManager = {
  /**
   * Cambia a una pantalla específica
   */
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add('active');
      AppState.currentScreen = screenId;
    }
  },
  
  /**
   * Actualiza el temporizador de evaluación
   */
  updateTimer(seconds) {
    const timerElement = document.getElementById('eval-timer');
    if (timerElement) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      timerElement.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  },
  
  /**
   * Actualiza la UI durante la evaluación
   */
  updateEvaluationUI(sensors) {
    // Actualizar valores de sensores
    const elements = {
      'sensor-work': sensors.beta.toFixed(1) + '°',
      'sensor-travel': sensors.gamma.toFixed(1) + '°',
      'sensor-velocity': sensors.velocity.toFixed(2)
    };
    
    Object.entries(elements).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
    
    // Actualizar gauges
    this.updateGauges(sensors);
    
    // Actualizar estados (colores)
    this.updateSensorStatus('status-work', sensors.beta, CONFIG.RANGES.WORK_ANGLE);
    this.updateSensorStatus('status-travel', sensors.gamma, CONFIG.RANGES.TRAVEL_ANGLE);
    this.updateSensorStatus('status-velocity', sensors.velocity, CONFIG.RANGES.VELOCITY);
    
    // Actualizar indicador de distancia
    const distanceEl = document.getElementById('eval-distance');
    if (distanceEl) {
      distanceEl.textContent = AppState.calibration.distance + ' cm';
    }
  },
  
  /**
   * Actualiza los gauges visuales
   */
  updateGauges(sensors) {
    // work-angle-marker
    const workMarker = document.getElementById('work-angle-marker');
    const workValue = document.getElementById('work-angle-value');
    if (workMarker && workValue) {
      const percent = Math.min(100, Math.max(0, ((sensors.beta + 90) / 180) * 100));
      workMarker.style.left = percent + '%';
      workValue.textContent = sensors.beta.toFixed(1) + '°';
      
      this.updateGaugeMarkerClass(workMarker, sensors.beta, CONFIG.RANGES.WORK_ANGLE);
    }
    
    // travel-angle-marker
    const travelMarker = document.getElementById('travel-angle-marker');
    const travelValue = document.getElementById('travel-angle-value');
    if (travelMarker && travelValue) {
      const percent = Math.min(100, Math.max(0, ((sensors.gamma + 90) / 180) * 100));
      travelMarker.style.left = percent + '%';
      travelValue.textContent = sensors.gamma.toFixed(1) + '°';
      
      this.updateGaugeMarkerClass(travelMarker, sensors.gamma, CONFIG.RANGES.TRAVEL_ANGLE);
    }
    
    // velocity-marker
    const velocityMarker = document.getElementById('velocity-marker');
    const velocityValue = document.getElementById('velocity-value');
    if (velocityMarker && velocityValue) {
      const maxVel = 5;
      const percent = Math.min(100, Math.max(0, (sensors.velocity / maxVel) * 100));
      velocityMarker.style.left = percent + '%';
      velocityValue.textContent = sensors.velocity.toFixed(2) + ' cm/s';
      
      this.updateGaugeMarkerClass(velocityMarker, sensors.velocity, CONFIG.RANGES.VELOCITY);
    }
  },
  
  /**
   * Actualiza la clase del marker según el valor
   */
  updateGaugeMarkerClass(marker, value, range) {
    marker.classList.remove('warning', 'danger');
    
    if (value < range.MIN || value > range.MAX) {
      marker.classList.add('danger');
    } else if (value < range.MIN + 10 || value > range.MAX - 10) {
      marker.classList.add('warning');
    }
  },
  
  /**
   * Actualiza el estado de un sensor
   */
  updateSensorStatus(elementId, value, range) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    el.classList.remove('ok', 'warning', 'error');
    
    if (value >= range.MIN && value <= range.MAX) {
      el.classList.add('ok');
      el.textContent = '✓';
    } else if (value >= range.MIN - 10 && value <= range.MAX + 10) {
      el.classList.add('warning');
      el.textContent = '~';
    } else {
      el.classList.add('error');
      el.textContent = '✗';
    }
  },
  
  /**
   * Actualiza la barra de progreso
   */
  updateProgress(percent) {
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    
    if (fill) fill.style.width = Math.min(100, percent) + '%';
    if (text) text.textContent = `Progreso: ${Math.round(percent)}%`;
  },
  
  /**
   * Muestra la pantalla de resultados
   */
  showResults() {
    const results = AppState.evaluation.results;
    if (!results) {
      Toast.show('No hay datos para mostrar', 'error');
      return;
    }
    
    // Actualizar información del participante
    document.getElementById('result-participant').textContent = AppState.participant?.name || (AppState.isQuickTest ? 'Prueba Rápida' : 'Anónimo');
    document.getElementById('result-date').textContent = new Date().toLocaleDateString('es-ES');
    document.getElementById('result-mode').textContent = AppState.mode === 'exam' ? 'Examen' : 'Práctica';
    
    // Actualizar puntuación
    const scoreValue = document.getElementById('score-value');
    const scoreCircle = document.getElementById('score-circle');
    if (scoreValue) scoreValue.textContent = results.score;
    
    // Actualizar círculo de puntuación
    if (scoreCircle) {
      const percent = (results.score / 100) * 360;
      scoreCircle.style.background = `conic-gradient(
        var(--primary-color) ${percent}deg,
        var(--border-color) ${percent}deg
      )`;
    }
    
    // Actualizar calificación
    const gradeEl = document.getElementById('result-grade');
    if (gradeEl) {
      gradeEl.textContent = results.grade;
      gradeEl.className = 'result-value';
      
      if (results.grade === 'APROBADO') {
        gradeEl.classList.add('approved');
      } else if (results.grade === 'REPROBADO') {
        gradeEl.classList.add('reprobated');
      } else {
        gradeEl.classList.add('needs-improvement');
      }
    }
    
    // Actualizar métricas
    this.updateMetric('work', results.workAngle, CONFIG.RANGES.WORK_ANGLE);
    this.updateMetric('travel', results.travelAngle, CONFIG.RANGES.TRAVEL_ANGLE);
    this.updateMetric('velocity', results.velocity, CONFIG.RANGES.VELOCITY);
    this.updateMetric('stability', results.stability, { MIN: 70, MAX: 100 });
    
    // Actualizar tiempo
    document.getElementById('result-duration').textContent = results.duration.toFixed(1) + ' segundos';
    
    // Mostrar/ocultar grupos de botones según modo
    const withData = document.getElementById('group-with-data');
    const quickTest = document.getElementById('group-quick-test');
    
    if (AppState.isQuickTest) {
      withData?.classList.add('hidden');
      quickTest?.classList.remove('hidden');
    } else {
      withData?.classList.remove('hidden');
      quickTest?.classList.add('hidden');
    }
    
    // Guardar en historial
    if (!AppState.isQuickTest) {
      const saved = HistoryManager.save({
        participant: AppState.participant,
        results: results,
        mode: AppState.mode
      });
      
      if (saved) {
        Toast.show('Evaluación guardada en historial', 'success');
      }
    }
    
    // Cambiar a pantalla de resultados
    this.showScreen('results-screen');
  },
  
  /**
   * Actualiza una métrica en la UI
   */
  updateMetric(type, data, range) {
    document.getElementById(`metric-${type}-avg`).textContent = data.avg.toFixed(1) + (type === 'velocity' ? ' cm/s' : '°');
    document.getElementById(`metric-${type}-range`).textContent = `${data.min.toFixed(1)}° - ${data.max.toFixed(1)}°`;
    
    const status = document.getElementById(`metric-${type}-status`);
    const percentInRange = (data.inRange / data.samples) * 100;
    
    if (percentInRange >= 80) {
      status.textContent = 'Pasó';
      status.className = 'metric-status pass';
    } else {
      status.textContent = 'Necesita mejorar';
      status.className = 'metric-status fail';
    }
  },
  
  /**
   * Actualiza el estado de calibración en UI
   */
  updateCalibrationStatus() {
    const betaStatus = document.getElementById('beta-status');
    const gammaStatus = document.getElementById('gamma-status');
    
    if (AppState.calibration.betaOffset !== null) {
      betaStatus.textContent = `Calibrado: ${AppState.calibration.betaOffset.toFixed(1)}°`;
      betaStatus.classList.add('calibrated');
    } else {
      betaStatus.textContent = 'Sin calibrar - Se usará valor raw';
      betaStatus.classList.remove('calibrated');
    }
    
    if (AppState.calibration.gammaOffset !== null) {
      gammaStatus.textContent = `Calibrado: ${AppState.calibration.gammaOffset.toFixed(1)}°`;
      gammaStatus.classList.add('calibrated');
    } else {
      gammaStatus.textContent = 'Sin calibrar - Se usará valor raw';
      gammaStatus.classList.remove('calibrated');
    }
    
    // Actualizar resumen
    const summary = document.getElementById('calibration-summary-text');
    if (summary) {
      const cal = AppState.calibration;
      summary.innerHTML = `
        <strong>ángulo de trabajo:</strong> ${cal.betaOffset !== null ? cal.betaOffset.toFixed(1) + '° offset' : 'Sin calibrar'}<br>
        <strong>Ángulo de viaje:</strong> ${cal.gammaOffset !== null ? cal.gammaOffset.toFixed(1) + '° offset' : 'Sin calibrar'}<br>
        <strong>Velocidad:</strong> ${cal.velocityFactor}x factor<br>
        <strong>Distancia:</strong> ${cal.distance} cm
      `;
    }
  },
  
  /**
   * Actualiza el estado visual de los sensores
   */
  updateSensorStatusUI(status) {
    const gyroEl = document.getElementById('status-gyro');
    const accelEl = document.getElementById('status-accel');
    const cameraEl = document.getElementById('status-camera');
    
    if (gyroEl) {
      gyroEl.classList.toggle('active', status.gyroscope);
      gyroEl.querySelector('.status-text').textContent = status.gyroscope ? 'Activo' : 'Inactivo';
    }
    
    if (accelEl) {
      accelEl.classList.toggle('active', status.accelerometer);
      accelEl.querySelector('.status-text').textContent = status.accelerometer ? 'Activo' : 'Inactivo';
    }
    
    if (cameraEl) {
      cameraEl.classList.toggle('active', status.camera);
      cameraEl.querySelector('.status-text').textContent = status.camera ? 'Activo' : 'No disponible';
    }
  }
};

// ==========================================
// NOTIFICACIONES TOAST
// ==========================================

const Toast = {
  container: null,
  
  init() {
    this.container = document.getElementById('toast-container');
  },
  
  show(message, type = 'info', duration = 3000) {
    if (!this.container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    this.container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// ==========================================
// INICIALIZACIÓN DE EVENTOS
// ==========================================

function initEventListeners() {
  // Botones de bienvenida
  document.getElementById('btn-new-evaluation')?.addEventListener('click', () => {
    AppState.isQuickTest = false;
    UIManager.showScreen('onboarding-screen');
  });
  
  document.getElementById('btn-quick-test')?.addEventListener('click', () => {
    AppState.isQuickTest = true;
    UIManager.showScreen('onboarding-screen');
  });
  
  document.getElementById('btn-view-history')?.addEventListener('click', () => {
    showHistoryScreen();
  });
  
  // Selector de modo
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.mode = btn.dataset.mode;
      
      // Actualizar badge en pantalla de evaluación
      const badge = document.getElementById('eval-mode-badge');
      if (badge) {
        if (AppState.mode === 'exam') {
          badge.textContent = 'Modo Examen - Feedback Oculto';
          badge.classList.add('exam-mode');
        } else {
          badge.textContent = 'Modo Práctica - Feedback Visible';
          badge.classList.remove('exam-mode');
        }
      }
    });
  });
  
  // Onboarding
  let currentStep = 1;
  const totalSteps = 4;
  
  document.getElementById('btn-next-step')?.addEventListener('click', () => {
    if (currentStep < totalSteps) {
      currentStep++;
      updateOnboardingStep(currentStep);
    } else {
      if (AppState.isQuickTest) {
        startEvaluation();
      } else {
        UIManager.showScreen('register-screen');
      }
    }
  });
  
  document.getElementById('btn-skip-onboarding')?.addEventListener('click', () => {
    if (AppState.isQuickTest) {
      startEvaluation();
    } else {
      UIManager.showScreen('register-screen');
    }
  });
  
  // Registro
  document.getElementById('participant-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    AppState.participant = {
      name: document.getElementById('participant-name').value,
      id: document.getElementById('participant-id').value,
      course: document.getElementById('participant-course').value,
      electrode: document.getElementById('participant-electrode').value,
      position: document.getElementById('participant-position').value
    };
    
    UIManager.showScreen('calibration-screen');
    Toast.show('Datos guardados', 'success');
  });
  
  document.getElementById('btn-cancel-register')?.addEventListener('click', () => {
    UIManager.showScreen('welcome-screen');
  });
  
  // Calibración
  document.getElementById('btn-calibrate-beta')?.addEventListener('click', () => {
    SensorManager.calibrateBeta();
    UIManager.updateCalibrationStatus();
    Toast.show('Ángulo de trabajo calibrado', 'success');
  });
  
  document.getElementById('btn-calibrate-gamma')?.addEventListener('click', () => {
    SensorManager.calibrateGamma();
    UIManager.updateCalibrationStatus();
    Toast.show('Ángulo de viaje calibrado', 'success');
  });
  
  document.getElementById('btn-reset-beta')?.addEventListener('click', () => {
    AppState.calibration.betaOffset = null;
    UIManager.updateCalibrationStatus();
    Toast.show('Calibración de ángulo restaurada', 'info');
  });
  
  document.getElementById('btn-reset-gamma')?.addEventListener('click', () => {
    AppState.calibration.gammaOffset = null;
    UIManager.updateCalibrationStatus();
    Toast.show('Calibración restaurada', 'info');
  });
  
  document.getElementById('btn-test-sensors')?.addEventListener('click', () => {
    const status = SensorManager.checkStatus();
    UIManager.updateSensorStatusUI({
      gyroscope: status.gyroscope,
      accelerometer: status.accelerometer,
      camera: CameraManager.isAvailable()
    });
    Toast.show('Estado de sensores actualizado', 'info');
  });
  
  document.getElementById('velocity-slider')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    AppState.calibration.velocityFactor = value;
    document.getElementById('velocity-factor-value').textContent = value.toFixed(1);
    UIManager.updateCalibrationStatus();
  });
  
  document.getElementById('distance-slider')?.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    AppState.calibration.distance = value;
    document.getElementById('distance-value').textContent = value;
    document.getElementById('distance-display').textContent = value + ' cm';
  });
  
  document.getElementById('btn-back-to-welcome')?.addEventListener('click', () => {
    UIManager.showScreen('welcome-screen');
  });
  
  document.getElementById('btn-start-calibrated')?.addEventListener('click', () => {
    if (!AppState.calibration.isCalibrated && 
        AppState.calibration.betaOffset === null && 
        AppState.calibration.gammaOffset === null) {
      Toast.show('Se recomienda calibrar al menos un sensor', 'warning');
    }
    startEvaluation();
  });
  
  // Evaluación
  document.getElementById('btn-stop-evaluation')?.addEventListener('click', () => {
    WeldingEvaluator.stop();
  });
  
  // Resultados
  document.getElementById('btn-new-test')?.addEventListener('click', () => {
    resetForNewTest();
    UIManager.showScreen('onboarding-screen');
  });
  
  document.getElementById('btn-restart-same')?.addEventListener('click', () => {
    resetForNewTest(false);
    UIManager.showScreen('calibration-screen');
  });
  
  document.getElementById('btn-quick-restart')?.addEventListener('click', () => {
    resetForNewTest(false);
    startEvaluation();
  });
  
  document.getElementById('btn-back-to-home')?.addEventListener('click', () => {
    resetForNewTest(true);
    UIManager.showScreen('welcome-screen');
  });
  
  document.getElementById('btn-share-results')?.addEventListener('click', async () => {
    await shareResults();
  });
  
  // Historial
  document.getElementById('btn-back-from-history')?.addEventListener('click', () => {
    UIManager.showScreen('welcome-screen');
  });
  
  document.getElementById('btn-export-history')?.addEventListener('click', () => {
    exportHistory();
  });
  
  document.getElementById('btn-clear-history')?.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres eliminar todo el historial?')) {
      HistoryManager.clear();
      showHistoryScreen();
      Toast.show('Historial eliminado', 'success');
    }
  });
  
  // Actualizar displays de calibración
  const updateCalibrationDisplays = () => {
    document.getElementById('beta-display').textContent = 
      AppState.sensors.beta.toFixed(1) + '°';
    document.getElementById('gamma-display').textContent = 
      AppState.sensors.gamma.toFixed(1) + '°';
  };
  
  SensorManager.addListener(updateCalibrationDisplays);
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function updateOnboardingStep(step) {
  document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
  document.querySelector(`.onboarding-step[data-step="${step}"]`)?.classList.add('active');
  
  document.querySelectorAll('.progress-dots .dot').forEach((dot, index) => {
    dot.classList.toggle('active', index < step);
  });
  
  const nextBtn = document.getElementById('btn-next-step');
  if (nextBtn) {
    nextBtn.textContent = step === totalSteps ? 'Comenzar' : 'Siguiente';
  }
}

async function startEvaluation() {
  // Verificar permisos de sensores
  await SensorManager.init();
  
  // Verificar estado de sensores
  const status = SensorManager.checkStatus();
  if (!status.gyroscope && !status.accelerometer) {
    Toast.show('Los sensores no están disponibles. Verifica los permisos.', 'error');
    return;
  }
  
  // Mostrar loader
  const loader = document.getElementById('app-loader');
  const loaderText = document.getElementById('loader-text');
  if (loader) loader.classList.remove('hidden');
  if (loaderText) loaderText.textContent = 'Iniciando cámara...';
  
  try {
    // Iniciar cámara
    const video = document.getElementById('eval-video');
    const canvas = document.getElementById('eval-overlay');
    
    const cameraReady = await CameraManager.init(video, canvas);
    
    if (!cameraReady) {
      Toast.show('No se pudo acceder a la cámara. La evaluación funcionará sin vista de cámara.', 'warning');
    }
    
    // Ocultar loader
    if (loader) loader.classList.add('hidden');
    
    // Configurar UI según modo
    const gauges = document.getElementById('gauges-container');
    if (gauges) {
      if (AppState.mode === 'exam') {
        gauges.style.display = 'none';
        document.getElementById('eval-mode-badge').textContent = 'Modo Examen - Feedback Oculto';
        document.getElementById('eval-mode-badge').classList.add('exam-mode');
      } else {
        gauges.style.display = 'block';
        document.getElementById('eval-mode-badge').textContent = 'Modo Práctica - Feedback Visible';
        document.getElementById('eval-mode-badge').classList.remove('exam-mode');
      }
    }
    
    // Iniciar evaluación
    UIManager.showScreen('evaluation-screen');
    WeldingEvaluator.start();
    
    Toast.show('Evaluación iniciada', 'success');
  } catch (err) {
    console.error('Error al iniciar evaluación:', err);
    Toast.show('Error al iniciar la evaluación', 'error');
    if (loader) loader.classList.add('hidden');
  }
}

function resetForNewTest(clearParticipant = false) {
  AppState.evaluation.data = [];
  AppState.evaluation.results = null;
  AppState.isEvaluating = false;
  
  if (clearParticipant) {
    AppState.participant = null;
  }
  
  // Mantener calibración
  // AppState.calibration se mantiene
}

async function showHistoryScreen() {
  const history = HistoryManager.getHistory();
  const stats = HistoryManager.getStats();
  
  // Actualizar estadísticas
  document.getElementById('total-evaluations').textContent = stats.total;
  document.getElementById('avg-score').textContent = stats.avgScore + '%';
  document.getElementById('pass-rate').textContent = stats.passRate + '%';
  
  // Actualizar lista
  const listEl = document.getElementById('history-list');
  if (listEl) {
    if (history.length === 0) {
      listEl.innerHTML = '<p class="empty-history">No hay evaluaciones guardadas aún.</p>';
    } else {
      listEl.innerHTML = history.map(item => `
        <div class="history-item" data-id="${item.id}">
          <div class="history-item-header">
            <span class="history-item-name">${item.participant?.name || 'Anónimo'}</span>
            <span class="history-item-score ${item.results.score >= CONFIG.SCORING.PASS ? 'pass' : 'fail'}">
              ${item.results.score}%
            </span>
          </div>
          <div class="history-item-date">
            ${new Date(item.date).toLocaleDateString('es-ES')} - ${item.results.grade}
          </div>
        </div>
      `).join('');
      
      // Agregar eventos a los items
      listEl.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = parseInt(item.dataset.id);
          const entry = history.find(h => h.id === id);
          if (entry) {
            showHistoryDetail(entry);
          }
        });
      });
    }
  }
  
  UIManager.showScreen('history-screen');
}

function showHistoryDetail(entry) {
  // Guardar temporalmente y mostrar resultados
  AppState.participant = entry.participant;
  AppState.evaluation.results = entry.results;
  UIManager.showResults();
}

function exportHistory() {
  const data = HistoryManager.exportJSON();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `historial-soldadura-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  Toast.show('Historial exportado', 'success');
}

async function shareResults() {
  const results = AppState.evaluation.results;
  if (!results) {
    Toast.show('No hay resultados para compartir', 'error');
    return;
  }
  
  const text = `Evaluación de Soldadura Pro
=============================
Participante: ${AppState.participant?.name || 'Anónimo'}
Fecha: ${new Date().toLocaleDateString('es-ES')}
Puntuación: ${results.score}/100 (${results.grade})
Ángulo de trabajo: ${results.workAngle.avg.toFixed(1)}° (rango: ${results.workAngle.min.toFixed(1)}° - ${results.workAngle.max.toFixed(1)}°)
Ángulo de viaje: ${results.travelAngle.avg.toFixed(1)}° (rango: ${results.travelAngle.min.toFixed(1)}° - ${results.travelAngle.max.toFixed(1)}°)
Velocidad: ${results.velocity.avg.toFixed(2)} cm/s
Estabilidad: ${results.stability.avg.toFixed(1)}%`;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Resultados de Soldadura',
        text: text
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        copyToClipboard(text);
      }
    }
  } else {
    copyToClipboard(text);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    Toast.show('Resultados copiados al portapapeles', 'success');
  }).catch(() => {
    Toast.show('No se pudo copiar al portapapeles', 'error');
  });
}

// ==========================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('Evaluador de Soldadura Pro v2.0 inicializado');
  
  // Inicializar Toast
  Toast.init();
  
  // Inicializar eventos
  initEventListeners();
  
  // Inicializar estado de calibración
  UIManager.updateCalibrationStatus();
  
  // Mostrar pantalla de bienvenida
  UIManager.showScreen('welcome-screen');
  
  console.log('Configuración:', CONFIG);
  console.log('Estado de la aplicación:', AppState);
});

// Exportar para debugging
window.WeldingApp = {
  CONFIG,
  AppState,
  SensorManager,
  CameraManager,
  WeldingEvaluator,
  GoogleFormsIntegration,
  HistoryManager,
  UIManager,
  Toast
};
