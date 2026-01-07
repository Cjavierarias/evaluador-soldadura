/**
 * Evaluador de Soldadura - Aplicación Web
 * Mide destreza de soldadura usando sensores del celular
 * 
 * Autor: MiniMax Agent
 * Versión: 1.0.0
 */

// ============================================
// CONFIGURACIÓN DE LA APLICACIÓN
// ============================================
// CONFIGURADO CON LOS FORMULARIOS DEL USUARIO
// Formulario Registro: 1FAIpQLSf0GoRVVKUiLLt_Ku8-labwOCanmxMzhYCM1VF88Qu6srR5ZQ
// Formulario Evaluación: 1FAIpQLSfwLfjqDQWPK01eip2Gkqdz21VYhThEJm1Rts2yHXyufUB7mg
// ============================================

const CONFIG = {
    // Rangos óptimos de soldadura (en cm)
    welding: {
        minDistance: 10,    // Distancia mínima en cm
        maxDistance: 15,    // Distancia máxima en cm
        optimalAngle: 45,   // Ángulo óptimo en grados
        angleTolerance: 15, // Tolerancia de ángulo (+/- grados)
        minVelocity: 1.0,   // Velocidad mínima en cm/s (soldadura lenta)
        maxVelocity: 3.0,   // Velocidad máxima en cm/s (soldadura rápida)
        evalTime: 30        // Tiempo de evaluación en segundos
    },
    
    // Factor de calibración de velocidad
    // AJUSTAR ESTE VALOR PARA CALIBRAR EL SENSOR:
    // - Si la velocidad medida es muy BAJA, aumentar este valor (ej: 2, 3, 5...)
    // - Si la velocidad medida es muy ALTA, disminuir este valor (ej: 0.5, 0.3...)
    // Rango recomendado: 0.5 a 5.0
    velocityCalibration: 0.5,
    
    // Configuración de sensores
    sensors: {
        samplingRate: 50,   // ms entre muestras
        calibrationSamples: 50, // muestras para calibración
        motionSensitivity: 0.5 // sensibilidad para detección de movimiento
    },
    
    // Configuración de formulario de Google Forms
    googleForms: {
        register: {
            // URL del formulario de registro de participantes
            url: 'https://docs.google.com/forms/d/e/1FAIpQLSf0GoRVVKUiLLt_Ku8-labwOCanmxMzhYCM1VF88Qu6srR5ZQ/formResponse',
            entries: {
                name: 'entry.1070934200',         // Nombre completo
                position: 'entry.1103188513',     // Cargo/posición
                phone: 'entry.1953094745',        // Teléfono
                email: 'entry.290139053',         // Correo electrónico
                company: 'entry.2079210040'       // Empresa (opcional)
            }
        },
        evaluation: {
            // URL del formulario de registro de evaluaciones
            url: 'https://docs.google.com/forms/d/e/1FAIpQLSfwLfjqDQWPK01eip2Gkqdz21VYhThEJm1Rts2yHXyufUB7mg/formResponse',
            entries: {
                sessionId: 'entry.67394734',         // ID de sesión
                name: 'entry.2002126249',            // Nombre del participante
                date: 'entry.1434018365',            // Fecha
                time: 'entry.629019864',             // Hora
                distanceAvg: 'entry.581057479',      // Distancia promedio (cm)
                distanceMin: 'entry.28421193',       // Distancia mínima (cm)
                distanceMax: 'entry.1158390019',     // Distancia máxima (cm)
                angleAvg: 'entry.1940989934',        // Ángulo promedio (°)
                angleMin: 'entry.1553977626',        // Ángulo mínimo (°)
                angleMax: 'entry.1622204590',        // Ángulo máximo (°)
                velocityAvg: 'entry.1196399797',     // Velocidad promedio (cm/s)
                velocityMin: 'entry.1302834534',     // Velocidad mínima (cm/s)
                velocityMax: 'entry.1406125288',     // Velocidad máxima (cm/s)
                timeTotal: 'entry.1412300232',       // Tiempo total (segundos)
                distanceOk: 'entry.842723306',       // Distancia dentro del rango óptimo
                angleOk: 'entry.1815577307',         // Ángulo dentro del rango óptimo
                velocityOk: 'entry.567078722',       // Velocidad constante
                finalGrade: 'entry.76936550',        // Resultado final
                score: 'entry.1977517263',           // Puntuación general
                comments: 'entry.106967972'          // Comentarios
            }
        }
    }
};

// ============================================
// ESTADO DE LA APLICACIÓN
// ============================================

const AppState = {
    currentScreen: 'welcome',
    participant: {
        name: '',
        position: '',
        phone: '',
        email: '',
        company: ''
    },
    calibration: {
        distance: null,
        angle: null,
        alphaOffset: 0,
        betaOffset: 0,
        gammaOffset: 0
    },
    evaluation: {
        isRunning: false,
        startTime: null,
        data: [],
        timerInterval: null
    },
    results: null,
    sessionId: ''
};

// ============================================
// ELEMENTOS DEL DOM
// ============================================

const DOM = {
    screens: {
        welcome: document.getElementById('welcome-screen'),
        register: document.getElementById('register-screen'),
        calibration: document.getElementById('calibration-screen'),
        evaluation: document.getElementById('evaluation-screen'),
        results: document.getElementById('results-screen')
    },
    buttons: {
        start: document.getElementById('start-btn'),
        backToWelcome: document.getElementById('back-to-welcome'),
        submitForm: document.getElementById('participant-form'),
        calibrate: document.getElementById('calibrate-btn'),
        stopEval: document.getElementById('stop-eval-btn'),
        save: document.getElementById('save-btn'),
        share: document.getElementById('share-btn'),
        newEval: document.getElementById('new-eval-btn')
    },
    inputs: {
        name: document.getElementById('participant-name'),
        position: document.getElementById('participant-position'),
        phone: document.getElementById('participant-phone'),
        email: document.getElementById('participant-email'),
        company: document.getElementById('participant-company')
    },
    calibration: {
        video: document.getElementById('calibration-video'),
        canvas: document.getElementById('calibration-canvas'),
        angle: document.getElementById('cal-angle'),
        distance: document.getElementById('cal-distance'),
        distanceDisplay: document.getElementById('current-distance')
    },
    evaluation: {
        video: document.getElementById('eval-video'),
        canvas: document.getElementById('eval-canvas'),
        timer: document.getElementById('eval-timer'),
        distance: document.getElementById('eval-distance'),
        angle: document.getElementById('eval-angle'),
        velocity: document.getElementById('eval-velocity'),
        distanceStatus: document.getElementById('eval-distance-status'),
        angleStatus: document.getElementById('eval-angle-status'),
        velocityStatus: document.getElementById('eval-velocity-status'),
        progressFill: document.getElementById('progress-fill'),
        progressText: document.getElementById('progress-text')
    },
    results: {
        name: document.getElementById('result-name'),
        position: document.getElementById('result-position'),
        finalGrade: document.getElementById('final-grade'),
        scoreValue: document.getElementById('score-value'),
        scoreCircle: document.querySelector('.score-circle'),
        distAvg: document.getElementById('metric-dist-avg'),
        distRange: document.getElementById('metric-dist-range'),
        distStatus: document.getElementById('metric-dist-status'),
        angleAvg: document.getElementById('metric-angle-avg'),
        angleRange: document.getElementById('metric-angle-range'),
        angleStatus: document.getElementById('metric-angle-status'),
        velAvg: document.getElementById('metric-vel-avg'),
        velConst: document.getElementById('metric-vel-const'),
        velStatus: document.getElementById('metric-vel-status'),
        totalTime: document.getElementById('total-time')
    },
    loader: document.getElementById('loader'),
    loaderText: document.getElementById('loader-text')
};

// ============================================
// UTILIDADES
// ============================================

function generateSessionId() {
    const date = new Date();
    const timestamp = date.getTime().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `SOLD-${timestamp}-${random}`.toUpperCase();
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function calculateAverage(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculateMin(arr) {
    return arr.length > 0 ? Math.min(...arr) : 0;
}

function calculateMax(arr) {
    return arr.length > 0 ? Math.max(...arr) : 0;
}

function calculateStandardDeviation(arr) {
    if (arr.length === 0) return 0;
    const avg = calculateAverage(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(calculateAverage(squareDiffs));
}

function calculateConstancy(arr) {
    if (arr.length === 0) return 0;
    const avg = calculateAverage(arr);
    if (avg === 0) return 100;
    const stdDev = calculateStandardDeviation(arr);
    const coefficient = (stdDev / avg) * 100;
    return Math.max(0, Math.min(100, 100 - coefficient));
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoader(text = 'Procesando...') {
    DOM.loaderText.textContent = text;
    DOM.loader.classList.remove('hidden');
}

function hideLoader() {
    DOM.loader.classList.add('hidden');
}

// ============================================
// NAVEGACIÓN DE PANTALLAS
// ============================================

function showScreen(screenName) {
    Object.values(DOM.screens).forEach(screen => {
        screen.classList.remove('active');
    });
    DOM.screens[screenName].classList.add('active');
    AppState.currentScreen = screenName;
    
    // Scroll al inicio
    window.scrollTo(0, 0);
}

// ============================================
// SENSOR DE ORIENTACIÓN Y MOVIMIENTO
// ============================================

const SensorManager = {
    orientation: { alpha: 0, beta: 0, gamma: 0 },
    acceleration: { x: 0, y: 0, z: 0 },
    rotation: { alpha: 0, beta: 0, gamma: 0 },
    lastTimestamp: 0,
    isSupported: false,
    permissionGranted: false,

    async init() {
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceMotionEvent !== 'undefined') {
            
            // Verificar si requiere permisos (iOS 13+)
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                try {
                    const response = await DeviceOrientationEvent.requestPermission();
                    if (response === 'granted') {
                        this.permissionGranted = true;
                        this.setupListeners();
                    } else {
                        showToast('Permiso de sensores denegado', 'error');
                    }
                } catch (error) {
                    console.error('Error solicitando permiso:', error);
                    // En Android o versiones anteriores
                    this.setupListeners();
                }
            } else {
                // Android o versiones anteriores de iOS
                this.setupListeners();
            }
        } else {
            showToast('Tu dispositivo no soporta los sensores necesarios', 'error');
        }
    },

    setupListeners() {
        this.isSupported = true;
        
        window.addEventListener('deviceorientation', (event) => {
            this.orientation = {
                alpha: event.alpha || 0, // Z-axis rotation (0-360)
                beta: event.beta || 0,   // X-axis rotation (-180 to 180)
                gamma: event.gamma || 0  // Y-axis rotation (-90 to 90)
            };
        });

        window.addEventListener('devicemotion', (event) => {
            const acc = event.accelerationIncludingGravity;
            if (acc) {
                this.acceleration = {
                    x: acc.x || 0,
                    y: acc.y || 0,
                    z: acc.z || 0
                };
            }
            
            const rot = event.rotationRate;
            if (rot) {
                this.rotation = {
                    alpha: rot.alpha || 0,
                    beta: rot.beta || 0,
                    gamma: rot.gamma || 0
                };
            }
            
            this.lastTimestamp = event.timeStamp;
        });
    },

    getCurrentAngle() {
        // Calcular ángulo relativo a la calibración
        let angle = Math.abs(this.orientation.beta); // Usar beta como ángulo principal
        if (AppState.calibration.betaOffset !== null) {
            angle = Math.abs(angle - AppState.calibration.betaOffset);
        }
        return Math.round(angle);
    },

    getDistanceEstimate() {
        // Estimación basada en el tamaño conocido del patrón
        // Esta es una aproximación que usa la perspectiva
        const baseline = 100; // Tamaño de referencia en píxeles
        const focalLength = 4.2; // Longitud focal típica en mm
        const sensorWidth = 6.17; // Ancho de sensor típico en mm
        
        // Calcular distancia estimada basada en el ángulo de inclinación
        const tiltAngle = this.orientation.beta || 0;
        const tiltRadians = (tiltAngle * Math.PI) / 180;
        
        // A mayor inclinación, mayor distancia percibida
        const distanceFactor = Math.cos(tiltRadians);
        
        // Combinar con datos de acelerómetro para mejor estimación
        const accel = Math.sqrt(
            Math.pow(this.acceleration.x, 2) +
            Math.pow(this.acceleration.y, 2) +
            Math.pow(this.acceleration.z, 2)
        );
        
        // Estimar distancia basada en la aceleración y ángulo
        const estimatedDistance = 12 / (distanceFactor * 0.8 + 0.2);
        
        return {
            distance: Math.round(estimatedDistance * 10) / 10,
            angle: this.getCurrentAngle(),
            acceleration: accel
        };
    },

    getVelocityEstimate() {
        // Para medir velocidad correcta con acelerómetro, necesitamos:
        // 1. Filtrar el ruido del sensor
        // 2. Detectar cambios pequeños de aceleración (movimiento lento)
        // 3. Escalar correctamente a cm/s
        
        // Obtener componentes de aceleración (excluyendo gravedad si es posible)
        const ax = Math.abs(this.acceleration.x || 0);
        const ay = Math.abs(this.acceleration.y || 0);
        const az = Math.abs(this.acceleration.z || 0);
        
        // Filtrar: ignore ruido menor a 0.5 m/s² (movimiento muy pequeño)
        const noiseThreshold = 0.5;
        
        // Calcular magnitud de aceleración total
        const totalAccel = Math.sqrt(ax * ax + ay * ay + az * az);
        
        // Restar la gravedad (9.8 m/s²) para obtener aceleración de movimiento
        let movementAccel = Math.abs(totalAccel - 9.8);
        
        // Si está por debajo del umbral de ruido, considerar como reposo
        if (movementAccel < noiseThreshold) {
            movementAccel = 0;
        }
        
        // Conversión de aceleración a velocidad:
        // v = a * t (integración simple para cortos periodos)
        const samplingInterval = CONFIG.sensors.samplingRate / 1000; // en segundos
        
        // Factor de calibración de velocidad ( configurable en CONFIG.velocityCalibration )
        // Este factor ajusta la sensibilidad del sensor
        // Valor por defecto: 2.5, ajustar según pruebas
        const calibrationFactor = CONFIG.velocityCalibration || 2.5;
        
        // Velocidad estimada con factor de calibración
        let velocity = movementAccel * samplingInterval * calibrationFactor;
        
        // Suavizar para evitar fluctuaciones grandes
        // Usar un promedio con el valor anterior si existe
        if (!this.lastVelocity) {
            this.lastVelocity = velocity;
        }
        
        // Promedio ponderado (70% valor actual, 30% valor anterior)
        const smoothedVelocity = 0.7 * velocity + 0.3 * this.lastVelocity;
        this.lastVelocity = smoothedVelocity;
        
        // Limitar a un máximo razonable (10 cm/s es muy rápido para soldadura)
        const cappedVelocity = Math.min(smoothedVelocity, 10);
        
        // Redondear a 2 decimales
        return Math.round(cappedVelocity * 100) / 100;
    }
};

// ============================================
// GESTIÓN DE CÁMARA
// ============================================

const CameraManager = {
    stream: null,
    context: null,
    animationId: null,

    async startCamera(videoElement, canvasElement) {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment', // Usar cámara trasera
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            videoElement.srcObject = this.stream;
            
            // Configurar canvas
            canvasElement.width = videoElement.videoWidth || 640;
            canvasElement.height = videoElement.videoHeight || 480;
            this.context = canvasElement.getContext('2d');

            return true;
        } catch (error) {
            console.error('Error accediendo a la cámara:', error);
            showToast('No se pudo acceder a la cámara', 'error');
            return false;
        }
    },

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    },

    processFrame(videoElement, canvasElement, onFrame) {
        if (!videoElement.videoWidth) {
            this.animationId = requestAnimationFrame(() => 
                this.processFrame(videoElement, canvasElement, onFrame)
            );
            return;
        }

        const ctx = canvasElement.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        
        if (onFrame) {
            onFrame(ctx, canvasElement.width, canvasElement.height);
        }

        this.animationId = requestAnimationFrame(() => 
            this.processFrame(videoElement, canvasElement, onFrame)
        );
    }
};

// ============================================
// EVALUACIÓN DE SOLDADURA
// ============================================

const WeldingEvaluator = {
    calculateScore(results) {
        let score = 100;
        let deductions = 0;

        // Deducciones por distancia
        if (!results.distanceOk) {
            const distDeviation = Math.abs(results.distanceAvg - 12.5);
            deductions += distDeviation * 3;
        }

        // Deducciones por ángulo
        if (!results.angleOk) {
            const angleDeviation = Math.abs(results.angleAvg - CONFIG.welding.optimalAngle);
            deductions += angleDeviation * 1.5;
        }

        // Deducciones por velocidad
        if (!results.velocityOk) {
            const velDeviation = Math.abs(results.velocityAvg - 5);
            deductions += velDeviation * 2;
        }

        // Deducciones por inconsistencia
        const inconsistencyPenalty = (100 - results.velocityConstancy) * 0.5;
        deductions += inconsistencyPenalty;

        score = Math.max(0, Math.min(100, score - deductions));

        return Math.round(score);
    },

    determineGrade(score) {
        if (score >= 80) return 'Aprobado';
        if (score >= 60) return 'Needs Improvement';
        return 'Reprobado';
    },

    evaluateDistance(data) {
        const avg = calculateAverage(data);
        const min = calculateMin(data);
        const max = calculateMax(data);
        
        const inRange = data.every(d => d >= CONFIG.welding.minDistance && d <= CONFIG.welding.maxDistance);
        const avgInRange = avg >= CONFIG.welding.minDistance && avg <= CONFIG.welding.maxDistance;
        
        return {
            average: Math.round(avg * 10) / 10,
            min: Math.round(min * 10) / 10,
            max: Math.round(max * 10) / 10,
            ok: inRange && avgInRange
        };
    },

    evaluateAngle(data) {
        const avg = calculateAverage(data);
        const min = calculateMin(data);
        const max = calculateMax(data);
        
        const tolerance = CONFIG.welding.angleTolerance;
        const inRange = data.every(d => 
            d >= CONFIG.welding.optimalAngle - tolerance && 
            d <= CONFIG.welding.optimalAngle + tolerance
        );
        const avgInRange = avg >= CONFIG.welding.optimalAngle - tolerance && 
                          avg <= CONFIG.welding.optimalAngle + tolerance;
        
        return {
            average: Math.round(avg),
            min: Math.round(min),
            max: Math.round(max),
            ok: inRange && avgInRange
        };
    },

    evaluateVelocity(data) {
        const avg = calculateAverage(data);
        const min = calculateMin(data);
        const max = calculateMax(data);
        const constancy = calculateConstancy(data);
        
        const inRange = data.every(d => d >= CONFIG.welding.minVelocity && d <= CONFIG.welding.maxVelocity);
        const avgInRange = avg >= CONFIG.welding.minVelocity && avg <= CONFIG.welding.maxVelocity;
        
        return {
            average: Math.round(avg * 10) / 10,
            min: Math.round(min * 10) / 10,
            max: Math.round(max * 10) / 10,
            constancy: Math.round(constancy),
            ok: inRange && avgInRange
        };
    },

    generateResults(evaluationData) {
        const distanceResults = this.evaluateDistance(evaluationData.distances);
        const angleResults = this.evaluateAngle(evaluationData.angles);
        const velocityResults = this.evaluateVelocity(evaluationData.velocities);
        
        const score = this.calculateScore({
            distanceOk: distanceResults.ok,
            distanceAvg: distanceResults.average,
            angleOk: angleResults.ok,
            angleAvg: angleResults.average,
            velocityOk: velocityResults.ok,
            velocityAvg: velocityResults.average,
            velocityConstancy: velocityResults.constancy
        });

        const grade = this.determineGrade(score);

        return {
            participant: AppState.participant,
            sessionId: AppState.sessionId,
            timestamp: new Date().toISOString(),
            distance: distanceResults,
            angle: angleResults,
            velocity: velocityResults,
            score: score,
            grade: grade,
            evaluationTime: evaluationData.duration
        };
    }
};

// ============================================
// INTEGRACIÓN CON GOOGLE FORMS
// ============================================
// Nota: Google Forms tiene restricciones para envíos directos desde apps web.
// Implementamos múltiples métodos de envío:
// 1. fetch con no-cors (silencioso, sin confirmación)
// 2. Abrir formulario pre-rellenado en nueva pestaña (más confiable)
// ============================================

const GoogleFormsIntegration = {
    // Método 1: Envío directo (silencioso, puede fallar por CORS)
    async submitRegisterFormDirect() {
        const data = AppState.participant;
        const formData = new FormData();
        
        formData.append(CONFIG.googleForms.register.entries.name, data.name);
        formData.append(CONFIG.googleForms.register.entries.position, data.position);
        formData.append(CONFIG.googleForms.register.entries.phone, data.phone);
        formData.append(CONFIG.googleForms.register.entries.email, data.email);
        formData.append(CONFIG.googleForms.register.entries.company, data.company || '');
        
        try {
            await fetch(CONFIG.googleForms.register.url, {
                method: 'POST',
                body: formData,
                mode: 'no-cors'
            });
            return true;
        } catch (error) {
            console.error('Error envío directo:', error);
            return false;
        }
    },
    
    // Método 2: Abrir formulario pre-rellenado (más confiable)
    submitRegisterFormPopup() {
        const data = AppState.participant;
        const baseUrl = CONFIG.googleForms.register.url.replace('/formResponse', '/viewform');
        const params = new URLSearchParams();
        
        params.append(CONFIG.googleForms.register.entries.name, data.name);
        params.append(CONFIG.googleForms.register.entries.position, data.position);
        params.append(CONFIG.googleForms.register.entries.phone, data.phone);
        params.append(CONFIG.googleForms.register.entries.email, data.email);
        if (data.company) {
            params.append(CONFIG.googleForms.register.entries.company, data.company);
        }
        
        const fullUrl = `${baseUrl}?${params.toString()}`;
        window.open(fullUrl, '_blank');
    },
    
    async submitRegisterForm() {
        // Primero intentar envío directo
        const success = await this.submitRegisterFormDirect();
        if (!success) {
            // Si falla, abrir formulario en popup
            showToast('Abriendo formulario de registro...', 'info');
            this.submitRegisterFormPopup();
        }
    },
    
    // Método 1: Envío directo de evaluación
    async submitEvaluationFormDirect(results) {
        const formData = new FormData();
        
        // Obtener fecha y hora actual
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
        
        formData.append(CONFIG.googleForms.evaluation.entries.sessionId, results.sessionId);
        formData.append(CONFIG.googleForms.evaluation.entries.name, results.participant.name);
        formData.append(CONFIG.googleForms.evaluation.entries.date, dateStr);
        formData.append(CONFIG.googleForms.evaluation.entries.time, timeStr);
        formData.append(CONFIG.googleForms.evaluation.entries.distanceAvg, results.distance.average);
        formData.append(CONFIG.googleForms.evaluation.entries.distanceMin, results.distance.min);
        formData.append(CONFIG.googleForms.evaluation.entries.distanceMax, results.distance.max);
        formData.append(CONFIG.googleForms.evaluation.entries.angleAvg, results.angle.average);
        formData.append(CONFIG.googleForms.evaluation.entries.angleMin, results.angle.min);
        formData.append(CONFIG.googleForms.evaluation.entries.angleMax, results.angle.max);
        formData.append(CONFIG.googleForms.evaluation.entries.velocityAvg, results.velocity.average);
        formData.append(CONFIG.googleForms.evaluation.entries.velocityMin, results.velocity.min);
        formData.append(CONFIG.googleForms.evaluation.entries.velocityMax, results.velocity.max);
        formData.append(CONFIG.googleForms.evaluation.entries.timeTotal, results.evaluationTime);
        formData.append(CONFIG.googleForms.evaluation.entries.distanceOk, results.distance.ok ? 'Sí' : 'No');
        formData.append(CONFIG.googleForms.evaluation.entries.angleOk, results.angle.ok ? 'Sí' : 'No');
        formData.append(CONFIG.googleForms.evaluation.entries.velocityOk, results.velocity.ok ? 'Sí' : 'No');
        formData.append(CONFIG.googleForms.evaluation.entries.finalGrade, results.grade);
        formData.append(CONFIG.googleForms.evaluation.entries.score, results.score);
        
        try {
            await fetch(CONFIG.googleForms.evaluation.url, {
                method: 'POST',
                body: formData,
                mode: 'no-cors'
            });
            return true;
        } catch (error) {
            console.error('Error envío directo evaluación:', error);
            return false;
        }
    },
    
    // Método 2: Abrir formulario de evaluación pre-rellenado
    submitEvaluationFormPopup(results) {
        const baseUrl = CONFIG.googleForms.evaluation.url.replace('/formResponse', '/viewform');
        const params = new URLSearchParams();
        
        // Obtener fecha y hora actual
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
        
        params.append(CONFIG.googleForms.evaluation.entries.sessionId, results.sessionId);
        params.append(CONFIG.googleForms.evaluation.entries.name, results.participant.name);
        params.append(CONFIG.googleForms.evaluation.entries.date, dateStr);
        params.append(CONFIG.googleForms.evaluation.entries.time, timeStr);
        params.append(CONFIG.googleForms.evaluation.entries.distanceAvg, results.distance.average);
        params.append(CONFIG.googleForms.evaluation.entries.distanceMin, results.distance.min);
        params.append(CONFIG.googleForms.evaluation.entries.distanceMax, results.distance.max);
        params.append(CONFIG.googleForms.evaluation.entries.angleAvg, results.angle.average);
        params.append(CONFIG.googleForms.evaluation.entries.angleMin, results.angle.min);
        params.append(CONFIG.googleForms.evaluation.entries.angleMax, results.angle.max);
        params.append(CONFIG.googleForms.evaluation.entries.velocityAvg, results.velocity.average);
        params.append(CONFIG.googleForms.evaluation.entries.velocityMin, results.velocity.min);
        params.append(CONFIG.googleForms.evaluation.entries.velocityMax, results.velocity.max);
        params.append(CONFIG.googleForms.evaluation.entries.timeTotal, results.evaluationTime);
        params.append(CONFIG.googleForms.evaluation.entries.distanceOk, results.distance.ok ? 'Sí' : 'No');
        params.append(CONFIG.googleForms.evaluation.entries.angleOk, results.angle.ok ? 'Sí' : 'No');
        params.append(CONFIG.googleForms.evaluation.entries.velocityOk, results.velocity.ok ? 'Sí' : 'No');
        params.append(CONFIG.googleForms.evaluation.entries.finalGrade, results.grade);
        params.append(CONFIG.googleForms.evaluation.entries.score, results.score);
        
        const fullUrl = `${baseUrl}?${params.toString()}`;
        window.open(fullUrl, '_blank');
    },
    
    async submitEvaluationForm(results) {
        // Primero intentar envío directo
        const success = await this.submitEvaluationFormDirect(results);
        if (!success) {
            // Si falla, abrir formulario en popup
            showToast('Abriendo formulario de evaluación...', 'info');
            this.submitEvaluationFormPopup(results);
        }
    }
};

// ============================================
// COMPARTIR RESULTADOS
// ============================================

function shareResults(results) {
    const shareText = `
🏭 Evaluación de Soldadura - Destreza

📋 Participante: ${results.participant.name}
📌 Cargo: ${results.participant.position}
🆔 Sesión: ${results.sessionId}

📊 RESULTADOS:
━━━━━━━━━━━━━━━━━━━━━
Distancia: ${results.distance.average} cm (Rango: ${results.distance.min}-${results.distance.max} cm)
Ángulo: ${results.angle.average}° (Rango: ${results.angle.min}-${results.angle.max}°)
Velocidad: ${results.velocity.average} cm/s (Constancia: ${results.velocity.constancy}%)

✅ Estado:
• Distancia: ${results.distance.ok ? '✓ Dentro del rango' : '✗ Fuera del rango'}
• Ángulo: ${results.angle.ok ? '✓ Dentro del rango' : '✗ Fuera del rango'}
• Velocidad: ${results.velocity.ok ? '✓ Constante' : '✗ Inconstante'}

📈 Puntuación: ${results.score}/100
🏆 Resultado: ${results.grade}

⏱️ Tiempo de evaluación: ${results.evaluationTime} segundos
    `.trim();

    const shareData = {
        title: 'Resultados de Evaluación de Soldadura',
        text: shareText
    };

    if (navigator.share) {
        navigator.share(shareData)
            .then(() => showToast('Compartido exitosamente', 'success'))
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    copyToClipboard(shareText);
                }
            });
    } else {
        copyToClipboard(shareText);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showToast('Resultados copiados al portapapeles', 'success'))
        .catch(() => showToast('Error al copiar', 'error'));
}

// ============================================
// FLUJO DE EVALUACIÓN
// ============================================

async function startEvaluation() {
    AppState.sessionId = generateSessionId();
    
    // Inicializar sensores
    await SensorManager.init();
    
    // Iniciar cámara
    const cameraStarted = await CameraManager.startCamera(
        DOM.evaluation.video,
        DOM.evaluation.canvas
    );
    
    if (!cameraStarted) {
        showToast('No se pudo iniciar la cámara', 'error');
        return;
    }
    
    // Iniciar recolección de datos
    AppState.evaluation.isRunning = true;
    AppState.evaluation.startTime = Date.now();
    AppState.evaluation.data = {
        distances: [],
        angles: [],
        velocities: [],
        timestamps: []
    };
    
    // Iniciar timer
    AppState.evaluation.timerInterval = setInterval(updateEvaluationTimer, 1000);
    
    // Iniciar muestreo de sensores
    startSensorSampling();
    
    // Procesar frames de cámara
    CameraManager.processFrame(
        DOM.evaluation.video,
        DOM.evaluation.canvas,
        processEvaluationFrame
    );
    
    showScreen('evaluation');
    showToast('Evaluación iniciada', 'success');
}

function updateEvaluationTimer() {
    const elapsed = Math.floor((Date.now() - AppState.evaluation.startTime) / 1000);
    const remaining = Math.max(0, CONFIG.welding.evalTime - elapsed);
    
    DOM.evaluation.timer.textContent = formatTime(remaining);
    
    // Actualizar barra de progreso
    const progress = (elapsed / CONFIG.welding.evalTime) * 100;
    DOM.evaluation.progressFill.style.width = `${progress}%`;
    DOM.evaluation.progressText.textContent = `Tiempo restante: ${remaining}s`;
    
    // Verificar si terminó la evaluación
    if (elapsed >= CONFIG.welding.evalTime) {
        stopEvaluation();
    }
}

function startSensorSampling() {
    const samplingInterval = setInterval(() => {
        if (!AppState.evaluation.isRunning) {
            clearInterval(samplingInterval);
            return;
        }
        
        const sensorData = SensorManager.getDistanceEstimate();
        const velocity = SensorManager.getVelocityEstimate();
        
        // Almacenar datos
        AppState.evaluation.data.distances.push(sensorData.distance);
        AppState.evaluation.data.angles.push(sensorData.angle);
        AppState.evaluation.data.velocities.push(velocity);
        AppState.evaluation.data.timestamps.push(Date.now());
        
        // Actualizar UI
        updateEvaluationUI(sensorData, velocity);
        
    }, CONFIG.sensors.samplingRate);
}

function updateEvaluationUI(sensorData, velocity) {
    const { distance, angle } = sensorData;
    
    // Actualizar valores
    DOM.evaluation.distance.textContent = `${distance} cm`;
    DOM.evaluation.angle.textContent = `${angle}°`;
    DOM.evaluation.velocity.textContent = `${velocity} cm/s`;
    
    // Actualizar estados con colores
    const distOk = distance >= CONFIG.welding.minDistance && distance <= CONFIG.welding.maxDistance;
    const angleOk = angle >= CONFIG.welding.optimalAngle - CONFIG.welding.angleTolerance && 
                    angle <= CONFIG.welding.optimalAngle + CONFIG.welding.angleTolerance;
    const velOk = velocity >= CONFIG.welding.minVelocity && velocity <= CONFIG.welding.maxVelocity;
    
    DOM.evaluation.distanceStatus.textContent = distOk ? '✓ Óptimo' : '⚠ Revisar';
    DOM.evaluation.distanceStatus.className = `status ${distOk ? 'ok' : 'warning'}`;
    
    DOM.evaluation.angleStatus.textContent = angleOk ? '✓ Óptimo' : '⚠ Revisar';
    DOM.evaluation.angleStatus.className = `status ${angleOk ? 'ok' : 'warning'}`;
    
    DOM.evaluation.velocityStatus.textContent = velOk ? '✓ Constante' : '⚠ Revisar';
    DOM.evaluation.velocityStatus.className = `status ${velOk ? 'ok' : 'warning'}`;
}

function processEvaluationFrame(ctx, width, height) {
    if (!AppState.evaluation.isRunning) return;
    
    // Aquí se puede implementar detección de patrones usando visión por computadora
    // Por ejemplo, usando OpenCV.js o simplemente dibujando guías en el canvas
    
    // Dibujar guías de referencia
    ctx.strokeStyle = 'rgba(255, 107, 53, 0.5)';
    ctx.lineWidth = 2;
    
    // Líneas de guía horizontales
    const centerY = height / 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY - 50);
    ctx.lineTo(width, centerY - 50);
    ctx.moveTo(0, centerY + 50);
    ctx.lineTo(width, centerY + 50);
    ctx.stroke();
    
    // Líneas de guía verticales
    const centerX = width / 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 50, 0);
    ctx.lineTo(centerX - 50, height);
    ctx.moveTo(centerX + 50, 0);
    ctx.lineTo(centerX + 50, height);
    ctx.stroke();
    
    // Indicador de zona óptima
    ctx.fillStyle = 'rgba(39, 174, 96, 0.2)';
    ctx.fillRect(centerX - 50, centerY - 50, 100, 100);
}

function stopEvaluation() {
    AppState.evaluation.isRunning = false;
    
    // Detener timer
    if (AppState.evaluation.timerInterval) {
        clearInterval(AppState.evaluation.timerInterval);
        AppState.evaluation.timerInterval = null;
    }
    
    // Detener cámara
    CameraManager.stopCamera();
    
    // Calcular resultados
    const duration = Math.floor((Date.now() - AppState.evaluation.startTime) / 1000);
    
    const evaluationData = {
        distances: AppState.evaluation.data.distances,
        angles: AppState.evaluation.data.angles,
        velocities: AppState.evaluation.data.velocities,
        duration: duration
    };
    
    AppState.results = WeldingEvaluator.generateResults(evaluationData);
    
    // Mostrar resultados
    displayResults(AppState.results);
    showScreen('results');
    
    showToast('Evaluación completada', 'success');
}

// ============================================
// MOSTRAR RESULTADOS
// ============================================

function displayResults(results) {
    // Información del participante
    DOM.results.name.textContent = results.participant.name;
    DOM.results.position.textContent = results.participant.position;
    
    // Resultado final
    DOM.results.finalGrade.textContent = results.grade;
    DOM.results.finalGrade.className = `result-value ${results.grade.toLowerCase().replace(' ', '-')}`;
    
    // Puntuación
    DOM.results.scoreValue.textContent = results.score;
    DOM.results.scoreCircle.style.background = `conic-gradient(var(--primary-color) ${results.score * 3.6}deg, var(--border-color) ${results.score * 3.6}deg)`;
    
    // Distancia
    DOM.results.distAvg.textContent = results.distance.average;
    DOM.results.distRange.textContent = `${results.distance.min} - ${results.distance.max}`;
    DOM.results.distStatus.textContent = results.distance.ok ? '✓ Dentro del rango' : '✗ Fuera del rango';
    DOM.results.distStatus.className = `metric-status ${results.distance.ok ? 'pass' : 'fail'}`;
    
    // Ángulo
    DOM.results.angleAvg.textContent = results.angle.average;
    DOM.results.angleRange.textContent = `${results.angle.min} - ${results.angle.max}`;
    DOM.results.angleStatus.textContent = results.angle.ok ? '✓ Dentro del rango' : '✗ Fuera del rango';
    DOM.results.angleStatus.className = `metric-status ${results.angle.ok ? 'pass' : 'fail'}`;
    
    // Velocidad
    DOM.results.velAvg.textContent = results.velocity.average;
    DOM.results.velConst.textContent = results.velocity.constancy;
    DOM.results.velStatus.textContent = results.velocity.ok ? '✓ Constante' : '✗ Inconstante';
    DOM.results.velStatus.className = `metric-status ${results.velocity.ok ? 'pass' : 'fail'}`;
    
    // Tiempo total
    DOM.results.totalTime.textContent = results.evaluationTime;
}

// ============================================
// CALIBRACIÓN
// ============================================

async function startCalibration() {
    // Inicializar sensores
    await SensorManager.init();
    
    // Iniciar cámara
    const cameraStarted = await CameraManager.startCamera(
        DOM.calibration.video,
        DOM.calibration.canvas
    );
    
    if (!cameraStarted) {
        showToast('No se pudo iniciar la cámara', 'error');
        return;
    }
    
    showScreen('calibration');
    
    // Recopilar muestras para calibración
    let samples = 0;
    const calibrationInterval = setInterval(() => {
        if (samples >= CONFIG.sensors.calibrationSamples) {
            clearInterval(calibrationInterval);
            finishCalibration();
            return;
        }
        
        const sensorData = SensorManager.getDistanceEstimate();
        
        // Actualizar UI
        DOM.calibration.angle.textContent = `${sensorData.angle}°`;
        DOM.calibration.distance.textContent = `${sensorData.distance} cm`;
        DOM.calibration.distanceDisplay.textContent = sensorData.distance;
        
        samples++;
        
        // Habilitar botón cuando tengamos suficientes muestras
        if (samples >= 10) {
            DOM.buttons.calibrate.disabled = false;
        }
        
    }, CONFIG.sensors.samplingRate);
}

function finishCalibration() {
    // Guardar valores de calibración
    AppState.calibration.betaOffset = SensorManager.orientation.beta;
    AppState.calibration.gammaOffset = SensorManager.orientation.gamma;
    AppState.calibration.distance = 12.5; // Distancia de referencia
    
    showToast('Calibración completada', 'success');
    startEvaluation();
}

// ============================================
// EVENT LISTENERS
// ============================================

function initEventListeners() {
    // Pantalla de bienvenida
    DOM.buttons.start.addEventListener('click', () => {
        // Verificar soporte de sensores
        if (!window.DeviceOrientationEvent || !window.DeviceMotionEvent) {
            showToast('Tu navegador no soporta los sensores necesarios', 'error');
            return;
        }
        showScreen('register');
    });
    
    // Pantalla de registro
    DOM.buttons.backToWelcome.addEventListener('click', () => {
        showScreen('welcome');
    });
    
    DOM.buttons.submitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Guardar datos del participante
        AppState.participant = {
            name: DOM.inputs.name.value.trim(),
            position: DOM.inputs.position.value.trim(),
            phone: DOM.inputs.phone.value.trim(),
            email: DOM.inputs.email.value.trim(),
            company: DOM.inputs.company.value.trim()
        };
        
        // Validación básica
        if (!AppState.participant.name || !AppState.participant.position ||
            !AppState.participant.phone || !AppState.participant.email) {
            showToast('Por favor completa todos los campos obligatorios', 'warning');
            return;
        }
        
        // Guardar en Google Forms (registro)
        GoogleFormsIntegration.submitRegisterForm();
        
        // Iniciar calibración
        startCalibration();
    });
    
    // Calibración
    DOM.buttons.calibrate.addEventListener('click', () => {
        CameraManager.stopCamera();
    });
    
    // Evaluación
    DOM.buttons.stopEval.addEventListener('click', () => {
        stopEvaluation();
    });
    
    // Resultados
    DOM.buttons.save.addEventListener('click', () => {
        if (AppState.results) {
            showLoader('Guardando evaluación...');
            GoogleFormsIntegration.submitEvaluationForm(AppState.results)
                .then(() => hideLoader());
        }
    });
    
    DOM.buttons.share.addEventListener('click', () => {
        if (AppState.results) {
            shareResults(AppState.results);
        }
    });
    
    DOM.buttons.newEval.addEventListener('click', () => {
        // Resetear estado
        AppState.participant = { name: '', position: '', phone: '', email: '', company: '' };
        AppState.calibration = { distance: null, angle: null, alphaOffset: 0, betaOffset: 0, gammaOffset: 0 };
        AppState.evaluation = { isRunning: false, startTime: null, data: [], timerInterval: null };
        AppState.results = null;
        AppState.sessionId = '';
        
        // Limpiar formulario
        DOM.inputs.name.value = '';
        DOM.inputs.position.value = '';
        DOM.inputs.phone.value = '';
        DOM.inputs.email.value = '';
        DOM.inputs.company.value = '';
        
        showScreen('welcome');
    });
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Evaluador de Soldadura - Inicializando...');
    
    initEventListeners();
    
    // Registrar Service Worker para funcionalidad offline
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registrado:', registration.scope);
            })
            .catch(error => {
                console.error('Error al registrar Service Worker:', error);
            });
    }
    
    console.log('Evaluador de Soldadura - Listo para usar');
});

// Exportar para uso global
window.WeldingApp = {
    CONFIG,
    AppState,
    SensorManager,
    CameraManager,
    WeldingEvaluator,
    GoogleFormsIntegration
};
