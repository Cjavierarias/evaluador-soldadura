/**
 * Evaluador de Soldadura - Aplicación Web v2.0
 * Mide destreza de soldadura usando sensores del celular
 * 
 * Características nuevas v2.0:
 * - Calibración completa de sensores (ángulo, distancia, velocidad)
 * - Modo de prueba rápida (sin registro)
 * - Botón de reinicio para repetir pruebas
 * 
 * Autor: MiniMax Agent
 * Versión: 2.0.0
 */

// ============================================
// CONFIGURACIÓN DE LA APLICACIÓN
// ============================================
// CONFIGURADO CON LOS FORMULARIOS DEL USUARIO (17 de enero 2026)
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
    
    // Factor de calibración de velocidad (AJUSTAR PARA CALIBRAR)
    // Si la velocidad medida es muy BAJA, aumentar este valor
    // Si la velocidad medida es muy ALTA, disminuir este valor
    velocityCalibration: 2.5,
    
    // Configuración de sensores
    sensors: {
        samplingRate: 50,   // ms entre muestras
        calibrationSamples: 50, // muestras para calibración
        motionSensitivity: 0.5 // sensibilidad para detección de movimiento
    },
    
    // Configuración de formulario de Google Forms
    googleForms: {
        register: {
            url: 'https://docs.google.com/forms/d/e/1FAIpQLSf0GoRVVKUiLLt_Ku8-labwOCanmxMzhYCM1VF88Qu6srR5ZQ/formResponse',
            entries: {
                name: 'entry.1070934200',
                position: 'entry.1103188513',
                phone: 'entry.1953094745',
                email: 'entry.290139053',
                company: 'entry.2079210040'
            }
        },
        evaluation: {
            url: 'https://docs.google.com/forms/d/e/1FAIpQLSfwLfjqDQWPK01eip2Gkqdz21VYhThEJm1Rts2yHXyufUB7mg/formResponse',
            entries: {
                sessionId: 'entry.67394734',
                name: 'entry.2002126249',
                date: 'entry.1434018365',
                time: 'entry.629019864',
                distanceAvg: 'entry.581057479',
                distanceMin: 'entry.28421193',
                distanceMax: 'entry.1158390019',
                angleAvg: 'entry.1940989934',
                angleMin: 'entry.1553977626',
                angleMax: 'entry.1622204590',
                velocityAvg: 'entry.1196399797',
                velocityMin: 'entry.1302834534',
                velocityMax: 'entry.1406125288',
                timeTotal: 'entry.1412300232',
                distanceOk: 'entry.842723306',
                angleOk: 'entry.1815577307',
                velocityOk: 'entry.567078722',
                finalGrade: 'entry.76936550',
                score: 'entry.1977517263',
                comments: 'entry.106967972'
            }
        }
    }
};

// ============================================
// ESTADO DE LA APLICACIÓN
// ============================================

const AppState = {
    currentScreen: 'welcome',
    isQuickTest: false,         // Modo prueba rápida (sin registro)
    participant: {
        name: '',
        position: '',
        phone: '',
        email: '',
        company: ''
    },
    // Valores de calibración
    calibration: {
        // Calibración de ángulo (establecer punto de referencia)
        angleOffset: null,      // Valor de beta cuando se estableció 0°
        angleCalibrated: false,
        
        // Calibración de distancia (establecer referencia)
        distanceOffset: null,   // Valor de distancia de referencia
        distanceCalibrated: false,
        
        // Calibración de velocidad
        velocityFactor: CONFIG.velocityCalibration
    },
    evaluation: {
        isRunning: false,
        startTime: null,
        data: [],
        timerInterval: null
    },
    results: null,
    sessionId: '',
    
    // Sensores verificados
    sensorsStatus: {
        gyro: false,
        accel: false,
        camera: false
    }
};

// ============================================
// ELEMENTOS DEL DOM
// ============================================

const DOM = {
    screens: {
        welcome: document.getElementById('welcome-screen'),
        register: document.getElementById('register-screen'),
        settings: document.getElementById('settings-screen'),
        quickCal: document.getElementById('quick-cal-screen'),
        evaluation: document.getElementById('evaluation-screen'),
        results: document.getElementById('results-screen')
    },
    buttons: {
        start: document.getElementById('start-btn'),
        quickTest: document.getElementById('quick-test-btn'),
        settings: document.getElementById('settings-btn'),
        backToWelcome: document.getElementById('back-to-welcome'),
        backFromSettings: document.getElementById('back-from-settings'),
        submitForm: document.getElementById('participant-form'),
        setAngleZero: document.getElementById('set-angle-zero'),
        setDistZero: document.getElementById('set-dist-zero'),
        resetDistZero: document.getElementById('reset-dist-zero'),
        velocitySlider: document.getElementById('velocity-slider'),
        testSensors: document.getElementById('test-sensors-btn'),
        quickCal: document.getElementById('quick-cal-btn'),
        stopEval: document.getElementById('stop-eval-btn'),
        save: document.getElementById('save-btn'),
        share: document.getElementById('share-btn'),
        newEval: document.getElementById('new-eval-btn'),
        quickRestart: document.getElementById('quick-restart-btn'),
        quickNew: document.getElementById('quick-new-btn')
    },
    inputs: {
        name: document.getElementById('participant-name'),
        position: document.getElementById('participant-position'),
        phone: document.getElementById('participant-phone'),
        email: document.getElementById('participant-email'),
        company: document.getElementById('participant-company')
    },
    // Elementos de calibración
    calibration: {
        angleRef: document.getElementById('cal-angle-ref'),
        distRef: document.getElementById('cal-dist-ref'),
        angleStatus: document.getElementById('angle-cal-status'),
        distStatus: document.getElementById('dist-cal-status'),
        velocityDisplay: document.getElementById('velocity-factor-display'),
        statusGyro: document.getElementById('status-gyro'),
        statusAccel: document.getElementById('status-accel'),
        statusCamera: document.getElementById('status-camera')
    },
    // Pantalla de calibración rápida
    quickCal: {
        video: document.getElementById('quick-cal-video'),
        canvas: document.getElementById('quick-cal-canvas'),
        angle: document.getElementById('quick-cal-angle'),
        distance: document.getElementById('quick-cal-distance-display')
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
        progressText: document.getElementById('progress-text'),
        modeIndicator: document.getElementById('eval-mode-indicator')
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
        totalTime: document.getElementById('total-time'),
        participantInfo: document.getElementById('results-participant-info'),
        fullEvalActions: document.getElementById('full-eval-actions'),
        quickTestActions: document.getElementById('quick-test-actions')
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
    lastVelocity: null,

    async init() {
        return new Promise((resolve) => {
            if (typeof DeviceOrientationEvent !== 'undefined' && 
                typeof DeviceMotionEvent !== 'undefined') {
                
                if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                    try {
                        DeviceOrientationEvent.requestPermission()
                            .then(response => {
                                if (response === 'granted') {
                                    this.permissionGranted = true;
                                    this.setupListeners();
                                    AppState.sensorsStatus.gyro = true;
                                    resolve(true);
                                } else {
                                    showToast('Permiso de sensores denegado', 'error');
                                    resolve(false);
                                }
                            })
                            .catch(error => {
                                console.error('Error solicitando permiso:', error);
                                this.setupListeners();
                                AppState.sensorsStatus.gyro = true;
                                resolve(true);
                            });
                    } catch (error) {
                        this.setupListeners();
                        AppState.sensorsStatus.gyro = true;
                        resolve(true);
                    }
                } else {
                    this.setupListeners();
                    AppState.sensorsStatus.gyro = true;
                    resolve(true);
                }
            } else {
                showToast('Tu dispositivo no soporta los sensores necesarios', 'error');
                resolve(false);
            }
        });
    },

    setupListeners() {
        this.isSupported = true;
        
        window.addEventListener('deviceorientation', (event) => {
            this.orientation = {
                alpha: event.alpha || 0,
                beta: event.beta || 0,
                gamma: event.gamma || 0
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
                AppState.sensorsStatus.accel = true;
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
        let angle = Math.abs(this.orientation.beta);
        
        // Aplicar calibración de ángulo
        if (AppState.calibration.angleOffset !== null) {
            angle = Math.abs(angle - AppState.calibration.angleOffset);
        }
        
        return Math.round(angle);
    },

    getDistanceEstimate() {
        const baseline = 100;
        const tiltAngle = this.orientation.beta || 0;
        const tiltRadians = (tiltAngle * Math.PI) / 180;
        const distanceFactor = Math.cos(tiltRadians);
        
        const accel = Math.sqrt(
            Math.pow(this.acceleration.x, 2) +
            Math.pow(this.acceleration.y, 2) +
            Math.pow(this.acceleration.z, 2)
        );
        
        let estimatedDistance = 12 / (distanceFactor * 0.8 + 0.2);
        
        // Aplicar calibración de distancia
        if (AppState.calibration.distanceOffset !== null) {
            estimatedDistance = estimatedDistance - AppState.calibration.distanceOffset + 12.5;
        }
        
        return {
            distance: Math.round(estimatedDistance * 10) / 10,
            angle: this.getCurrentAngle(),
            acceleration: accel
        };
    },

    getVelocityEstimate() {
        const ax = Math.abs(this.acceleration.x || 0);
        const ay = Math.abs(this.acceleration.y || 0);
        const az = Math.abs(this.acceleration.z || 0);
        
        const noiseThreshold = 0.5;
        const totalAccel = Math.sqrt(ax * ax + ay * ay + az * az);
        let movementAccel = Math.abs(totalAccel - 9.8);
        
        if (movementAccel < noiseThreshold) {
            movementAccel = 0;
        }
        
        const samplingInterval = CONFIG.sensors.samplingRate / 1000;
        const calibrationFactor = AppState.calibration.velocityFactor || CONFIG.velocityCalibration;
        
        let velocity = movementAccel * samplingInterval * calibrationFactor;
        
        if (!this.lastVelocity) {
            this.lastVelocity = velocity;
        }
        
        const smoothedVelocity = 0.7 * velocity + 0.3 * this.lastVelocity;
        this.lastVelocity = smoothedVelocity;
        
        const cappedVelocity = Math.min(smoothedVelocity, 10);
        
        return Math.round(cappedVelocity * 100) / 100;
    },

    resetVelocityCache() {
        this.lastVelocity = null;
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
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            videoElement.srcObject = this.stream;
            
            canvasElement.width = videoElement.videoWidth || 640;
            canvasElement.height = videoElement.videoHeight || 480;
            this.context = canvasElement.getContext('2d');
            
            AppState.sensorsStatus.camera = true;
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

        if (!results.distanceOk) {
            const distDeviation = Math.abs(results.distanceAvg - 12.5);
            deductions += distDeviation * 3;
        }

        if (!results.angleOk) {
            const angleDeviation = Math.abs(results.angleAvg - CONFIG.welding.optimalAngle);
            deductions += angleDeviation * 1.5;
        }

        if (!results.velocityOk) {
            const velDeviation = Math.abs(results.velocityAvg - 2);
            deductions += velDeviation * 2;
        }

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

const GoogleFormsIntegration = {
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
        const success = await this.submitRegisterFormDirect();
        if (!success) {
            showToast('Abriendo formulario de registro...', 'info');
            this.submitRegisterFormPopup();
        }
    },
    
    async submitEvaluationFormDirect(results) {
        const formData = new FormData();
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
        
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
    
    submitEvaluationFormPopup(results) {
        const baseUrl = CONFIG.googleForms.evaluation.url.replace('/formResponse', '/viewform');
        const params = new URLSearchParams();
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
        
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
        // Solo enviar si NO es modo prueba rápida
        if (AppState.isQuickTest) {
            showToast('Modo prueba rápida - No se guardará en Google Forms', 'info');
            return;
        }
        
        const success = await this.submitEvaluationFormDirect(results);
        if (!success) {
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

async function startEvaluationFlow(skipRegistration = false) {
    AppState.sessionId = generateSessionId();
    AppState.isQuickTest = skipRegistration;
    
    // Actualizar indicador de modo
    if (skipRegistration) {
        DOM.evaluation.modeIndicator.textContent = 'Modo: Prueba Rápida';
    } else {
        DOM.evaluation.modeIndicator.textContent = 'Modo: Evaluación Completa';
    }
    
    // Inicializar sensores
    await SensorManager.init();
    
    // Iniciar cámara para calibración rápida
    const cameraStarted = await CameraManager.startCamera(
        DOM.quickCal.video,
        DOM.quickCal.canvas
    );
    
    if (!cameraStarted) {
        showToast('No se pudo iniciar la cámara', 'error');
        return;
    }
    
    showScreen('quickCal');
    
    // Actualizar valores en tiempo real durante calibración
    const calInterval = setInterval(() => {
        if (AppState.currentScreen !== 'quickCal') {
            clearInterval(calInterval);
            return;
        }
        
        const sensorData = SensorManager.getDistanceEstimate();
        const angle = SensorManager.getCurrentAngle();
        
        DOM.quickCal.angle.textContent = `${angle}°`;
        DOM.quickCal.distance.textContent = `${sensorData.distance} cm`;
    }, CONFIG.sensors.samplingRate);
    
    // Habilitar botón después de muestra
    setTimeout(() => {
        DOM.buttons.quickCal.disabled = false;
    }, 500);
}

async function startActualEvaluation() {
    SensorManager.resetVelocityCache();
    
    // Iniciar cámara de evaluación
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
    
    const progress = (elapsed / CONFIG.welding.evalTime) * 100;
    DOM.evaluation.progressFill.style.width = `${progress}%`;
    DOM.evaluation.progressText.textContent = `Tiempo restante: ${remaining}s`;
    
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
        
        AppState.evaluation.data.distances.push(sensorData.distance);
        AppState.evaluation.data.angles.push(sensorData.angle);
        AppState.evaluation.data.velocities.push(velocity);
        AppState.evaluation.data.timestamps.push(Date.now());
        
        updateEvaluationUI(sensorData, velocity);
        
    }, CONFIG.sensors.samplingRate);
}

function updateEvaluationUI(sensorData, velocity) {
    const { distance, angle } = sensorData;
    
    DOM.evaluation.distance.textContent = `${distance} cm`;
    DOM.evaluation.angle.textContent = `${angle}°`;
    DOM.evaluation.velocity.textContent = `${velocity} cm/s`;
    
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
    
    ctx.strokeStyle = 'rgba(255, 107, 53, 0.5)';
    ctx.lineWidth = 2;
    
    const centerY = height / 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY - 50);
    ctx.lineTo(width, centerY - 50);
    ctx.moveTo(0, centerY + 50);
    ctx.lineTo(width, centerY + 50);
    ctx.stroke();
    
    const centerX = width / 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 50, 0);
    ctx.lineTo(centerX - 50, height);
    ctx.moveTo(centerX + 50, 0);
    ctx.lineTo(centerX + 50, height);
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(39, 174, 96, 0.2)';
    ctx.fillRect(centerX - 50, centerY - 50, 100, 100);
}

function stopEvaluation() {
    AppState.evaluation.isRunning = false;
    
    if (AppState.evaluation.timerInterval) {
        clearInterval(AppState.evaluation.timerInterval);
        AppState.evaluation.timerInterval = null;
    }
    
    CameraManager.stopCamera();
    
    const duration = Math.floor((Date.now() - AppState.evaluation.startTime) / 1000);
    
    const evaluationData = {
        distances: AppState.evaluation.data.distances,
        angles: AppState.evaluation.data.angles,
        velocities: AppState.evaluation.data.velocities,
        duration: duration
    };
    
    AppState.results = WeldingEvaluator.generateResults(evaluationData);
    
    displayResults(AppState.results);
    showScreen('results');
    
    showToast('Evaluación completada', 'success');
}

// ============================================
// MOSTRAR RESULTADOS
// ============================================

function displayResults(results) {
    // Mostrar u ocultar según el modo
    if (AppState.isQuickTest) {
        DOM.results.participantInfo.style.display = 'none';
        DOM.results.fullEvalActions.classList.add('hidden');
        DOM.results.quickTestActions.classList.remove('hidden');
    } else {
        DOM.results.participantInfo.style.display = 'block';
        DOM.results.fullEvalActions.classList.remove('hidden');
        DOM.results.quickTestActions.classList.add('hidden');
        
        DOM.results.name.textContent = results.participant.name;
        DOM.results.position.textContent = results.participant.position;
    }
    
    DOM.results.finalGrade.textContent = results.grade;
    DOM.results.finalGrade.className = `result-value ${results.grade.toLowerCase().replace(' ', '-')}`;
    
    DOM.results.scoreValue.textContent = results.score;
    DOM.results.scoreCircle.style.background = `conic-gradient(var(--primary-color) ${results.score * 3.6}deg, var(--border-color) ${results.score * 3.6}deg)`;
    
    DOM.results.distAvg.textContent = results.distance.average;
    DOM.results.distRange.textContent = `${results.distance.min} - ${results.distance.max}`;
    DOM.results.distStatus.textContent = results.distance.ok ? '✓ Dentro del rango' : '✗ Fuera del rango';
    DOM.results.distStatus.className = `metric-status ${results.distance.ok ? 'pass' : 'fail'}`;
    
    DOM.results.angleAvg.textContent = results.angle.average;
    DOM.results.angleRange.textContent = `${results.angle.min} - ${results.angle.max}`;
    DOM.results.angleStatus.textContent = results.angle.ok ? '✓ Dentro del rango' : '✗ Fuera del rango';
    DOM.results.angleStatus.className = `metric-status ${results.angle.ok ? 'pass' : 'fail'}`;
    
    DOM.results.velAvg.textContent = results.velocity.average;
    DOM.results.velConst.textContent = results.velocity.constancy;
    DOM.results.velStatus.textContent = results.velocity.ok ? '✓ Constante' : '✗ Inconstante';
    DOM.results.velStatus.className = `metric-status ${results.velocity.ok ? 'pass' : 'fail'}`;
    
    DOM.results.totalTime.textContent = results.evaluationTime;
}

// ============================================
// REINICIAR EVALUACIÓN
// ============================================

function restartEvaluation() {
    // Resetear datos de evaluación pero mantener calibración
    AppState.evaluation.data = [];
    AppState.evaluation.startTime = null;
    SensorManager.resetVelocityCache();
    
    // Iniciar nueva evaluación directamente
    startActualEvaluation();
}

function resetForNewEvaluation() {
    // Resetear todo incluyendo participante
    AppState.participant = { name: '', position: '', phone: '', email: '', company: '' };
    AppState.calibration = { angleOffset: null, angleCalibrated: false, distanceOffset: null, distanceCalibrated: false, velocityFactor: CONFIG.velocityCalibration };
    AppState.evaluation = { isRunning: false, startTime: null, data: [], timerInterval: null };
    AppState.results = null;
    AppState.sessionId = '';
    AppState.isQuickTest = false;
    SensorManager.resetVelocityCache();
    
    // Limpiar formulario
    DOM.inputs.name.value = '';
    DOM.inputs.position.value = '';
    DOM.inputs.phone.value = '';
    DOM.inputs.email.value = '';
    DOM.inputs.company.value = '';
    
    showScreen('welcome');
}

// ============================================
// CONFIGURACIÓN DE SENSORES
// ============================================

function updateSensorStatusDisplay() {
    const gyroStatus = AppState.sensorsStatus.gyro;
    const accelStatus = AppState.sensorsStatus.accel;
    const cameraStatus = AppState.sensorsStatus.camera;
    
    DOM.calibration.statusGyro.innerHTML = `<span class="status-icon">${gyroStatus ? '✓' : '❌'}</span><span>Giroscopio</span>`;
    DOM.calibration.statusGyro.classList.toggle('active', gyroStatus);
    
    DOM.calibration.statusAccel.innerHTML = `<span class="status-icon">${accelStatus ? '✓' : '❌'}</span><span>Acelerómetro</span>`;
    DOM.calibration.statusAccel.classList.toggle('active', accelStatus);
    
    DOM.calibration.statusCamera.innerHTML = `<span class="status-icon">${cameraStatus ? '✓' : '❌'}</span><span>Cámara</span>`;
    DOM.calibration.statusCamera.classList.toggle('active', cameraStatus);
}

async function testSensors() {
    showLoader('Probando sensores...');
    
    // Resetear estado de sensores
    AppState.sensorsStatus.gyro = false;
    AppState.sensorsStatus.accel = false;
    AppState.sensorsStatus.camera = false;
    
    // Inicializar sensores
    await SensorManager.init();
    
    // Probar cámara
    const cameraStarted = await CameraManager.startCamera(
        DOM.quickCal.video,
        DOM.quickCal.canvas
    );
    
    if (cameraStarted) {
        CameraManager.stopCamera();
    }
    
    updateSensorStatusDisplay();
    hideLoader();
    
    const workingSensors = [AppState.sensorsStatus.gyro, AppState.sensorsStatus.accel, AppState.sensorsStatus.camera].filter(Boolean).length;
    showToast(`Sensores: ${workingSensors}/3 funcionando`, workingSensors >= 2 ? 'success' : 'warning');
}

// ============================================
// CALIBRACIÓN DE ÁNGULO
// ============================================

function setAngleZero() {
    const currentAngle = SensorManager.orientation.beta || 0;
    AppState.calibration.angleOffset = currentAngle;
    AppState.calibration.angleCalibrated = true;
    
    // Actualizar UI
    DOM.calibration.angleRef.textContent = `${Math.round(Math.abs(currentAngle))}° (guardado)`;
    DOM.calibration.angleStatus.textContent = '✓ Calibrado';
    DOM.calibration.angleStatus.className = 'cal-status calibrated';
    
    showToast('Ángulo de referencia establecido', 'success');
}

// ============================================
// CALIBRACIÓN DE DISTANCIA
// ============================================

function setDistanceZero() {
    const sensorData = SensorManager.getDistanceEstimate();
    AppState.calibration.distanceOffset = sensorData.distance - 12.5;
    AppState.calibration.distanceCalibrated = true;
    
    // Actualizar UI
    DOM.calibration.distRef.textContent = `${sensorData.distance} cm (guardado)`;
    DOM.calibration.distStatus.textContent = '✓ Calibrado';
    DOM.calibration.distStatus.className = 'cal-status calibrated';
    
    showToast('Distancia de referencia establecida', 'success');
}

function resetDistanceCalibration() {
    AppState.calibration.distanceOffset = null;
    AppState.calibration.distanceCalibrated = false;
    
    // Actualizar UI
    DOM.calibration.distRef.textContent = '-- cm';
    DOM.calibration.distStatus.textContent = 'No calibrado';
    DOM.calibration.distStatus.className = 'cal-status';
    
    showToast('Calibración de distancia restablecida', 'info');
}

// ============================================
// CALIBRACIÓN DE VELOCIDAD
// ============================================

function updateVelocityCalibration(value) {
    AppState.calibration.velocityFactor = parseFloat(value);
    DOM.calibration.velocityDisplay.textContent = value;
    
    // Guardar en localStorage para persistencia
    localStorage.setItem('velocityCalibration', value);
}

function loadVelocityCalibration() {
    const saved = localStorage.getItem('velocityCalibration');
    if (saved) {
        AppState.calibration.velocityFactor = parseFloat(saved);
        DOM.buttons.velocitySlider.value = saved;
        DOM.calibration.velocityDisplay.textContent = saved;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function initEventListeners() {
    // Pantalla de bienvenida
    DOM.buttons.start.addEventListener('click', () => {
        if (!window.DeviceOrientationEvent || !window.DeviceMotionEvent) {
            showToast('Tu navegador no soporta los sensores necesarios', 'error');
            return;
        }
        showScreen('register');
    });
    
    // Botón de prueba rápida
    DOM.buttons.quickTest.addEventListener('click', () => {
        if (!window.DeviceOrientationEvent || !window.DeviceMotionEvent) {
            showToast('Tu navegador no soporta los sensores necesarios', 'error');
            return;
        }
        startEvaluationFlow(true); // true = skip registration
    });
    
    // Botón de configuración
    DOM.buttons.settings.addEventListener('click', () => {
        showScreen('settings');
        loadVelocityCalibration();
    });
    
    // Pantalla de registro
    DOM.buttons.backToWelcome.addEventListener('click', () => {
        showScreen('welcome');
    });
    
    DOM.buttons.submitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        AppState.participant = {
            name: DOM.inputs.name.value.trim(),
            position: DOM.inputs.position.value.trim(),
            phone: DOM.inputs.phone.value.trim(),
            email: DOM.inputs.email.value.trim(),
            company: DOM.inputs.company.value.trim()
        };
        
        if (!AppState.participant.name || !AppState.participant.position ||
            !AppState.participant.phone || !AppState.participant.email) {
            showToast('Por favor completa todos los campos obligatorios', 'warning');
            return;
        }
        
        GoogleFormsIntegration.submitRegisterForm();
        startEvaluationFlow(false); // false = normal mode with registration
    });
    
    // Volver de configuración
    DOM.buttons.backFromSettings.addEventListener('click', () => {
        showScreen('welcome');
    });
    
    // Calibración de ángulo
    DOM.buttons.setAngleZero.addEventListener('click', () => {
        setAngleZero();
    });
    
    // Calibración de distancia
    DOM.buttons.setDistZero.addEventListener('click', () => {
        setDistanceZero();
    });
    
    DOM.buttons.resetDistZero.addEventListener('click', () => {
        resetDistanceCalibration();
    });
    
    // Slider de velocidad
    DOM.buttons.velocitySlider.addEventListener('input', (e) => {
        updateVelocityCalibration(e.target.value);
    });
    
    // Probar sensores
    DOM.buttons.testSensors.addEventListener('click', () => {
        testSensors();
    });
    
    // Calibración rápida y comenzar evaluación
    DOM.buttons.quickCal.addEventListener('click', () => {
        CameraManager.stopCamera();
        startActualEvaluation();
    });
    
    // Evaluación
    DOM.buttons.stopEval.addEventListener('click', () => {
        stopEvaluation();
    });
    
    // Resultados - Evaluación completa
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
        resetForNewEvaluation();
    });
    
    // Resultados - Prueba rápida
    DOM.buttons.quickRestart.addEventListener('click', () => {
        restartEvaluation();
    });
    
    DOM.buttons.quickNew.addEventListener('click', () => {
        resetForNewEvaluation();
    });
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Evaluador de Soldadura v2.0 - Inicializando...');
    
    loadVelocityCalibration();
    initEventListeners();
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registrado:', registration.scope);
            })
            .catch(error => {
                console.error('Error al registrar Service Worker:', error);
            });
    }
    
    console.log('Evaluador de Soldadura v2.0 - Listo para usar');
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
