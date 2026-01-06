# Evaluador de Soldadura - Aplicación Web

## Descripción General

Esta aplicación web progresiva está diseñada para evaluar la destreza de participantes en clases de soldadura utilizando los sensores y la cámara de sus dispositivos móviles. La herramienta permite medir parámetros críticos como la distancia al patrón de soldadura, el ángulo de desplazamiento y la velocidad de movimiento, proporcionando una evaluación objetiva y detallada del desempeño de cada participante.

La aplicación está construida utilizando tecnologías web modernas que incluyen HTML5, CSS3 y JavaScript puro, sin necesidad de frameworks complejos. Esto garantiza una implementación ligera, rápida y compatible con la mayoría de dispositivos móviles actuales. La integración con Google Forms permite almacenar los datos de manera sencilla sin requerir una base de datos compleja del lado del servidor.

---

## Características Principales

### Funcionalidades de Evaluación

La aplicación ofrece un conjunto completo de herramientas para evaluar las habilidades de soldadura de los participantes. El sistema de medición utiliza el giroscopio y el acelerómetro del dispositivo móvil para detectar la posición y el movimiento del celular mientras el participante realiza la soldadura sobre un patrón impreso. Los datos recopilados incluyen la distancia promedio al patrón, la cual debe mantenerse entre 10 y 15 centímetros para una soldadura óptima, el ángulo de inclinación que debe aproximarse a los 45 grados con una tolerancia de 15 grados, y la velocidad de desplazamiento que debe mantenerse constante dentro de un rango de 2 a 8 centímetros por segundo.

El algoritmo de evaluación procesa todos los datos recopilados durante el tiempo de prueba, que por defecto es de 30 segundos, y genera una puntuación final de 0 a 100 puntos. Esta puntuación se basa en la desviación de los valores medidos respecto a los parámetros óptimos establecidos, penalizando las inconsistencias y desviaciones significativas. El resultado final se clasifica como Aprobado para puntuaciones de 80 o más puntos, Needs Improvement para puntuaciones entre 60 y 79, o Reprobado para puntuaciones inferiores a 60.

### Interfaz de Usuario

La interfaz de usuario está diseñada específicamente para dispositivos móviles, con botones grandes y claramente etiquetados, texto legible y retroalimentación visual inmediata durante la evaluación. El flujo de la aplicación guía al usuario a través de cinco pantallas principales: la pantalla de bienvenida con información sobre los requisitos, el formulario de registro de datos personales, la pantalla de calibración donde se ajustan los sensores, la pantalla de evaluación en tiempo real, y finalmente la pantalla de resultados con el informe completo.

Cada pantalla incluye instrucciones claras y consejos útiles para garantizar que el participante pueda completar la evaluación sin dificultades. Durante la evaluación, los valores de los sensores se actualizan en tiempo real con indicadores visuales que muestran si los parámetros se encuentran dentro de los rangos óptimos mediante colores verde, amarillo o rojo.

### Almacenamiento de Datos

La integración con Google Forms permite que todos los datos de registro y evaluación se guarden automáticamente en una hoja de cálculo de Google Sheets. Esto elimina la necesidad de configurar servidores o bases de datos complejas, aprovechando la infraestructura gratuita y familiar de Google. Cada formulario genera una entrada en la hoja de cálculo con marca de tiempo, datos del participante y todos los parámetros medidos durante la evaluación.

---

## Requisitos del Sistema

### Compatibilidad de Dispositivos

Para utilizar esta aplicación, el participante debe contar con un dispositivo móvil que incluya un giroscopio y un acelerómetro, sensores presentes en la mayoría de los smartphones fabricados después de 2015. Además, el dispositivo debe tener una cámara funcional, preferiblemente la cámara trasera, para capturar el patrón de soldadura durante la evaluación. El dispositivo debe ejecutar un sistema operativo moderno como Android 7.0 o superior, o iOS 13 o superior, versiones que soportan las APIs de sensores requeridas.

Es importante mencionar que algunos dispositivos Android de gama baja pueden tener sensores de menor precisión, lo que podría afectar la exactitud de las mediciones. En dispositivos iOS, es necesario otorgar permisos explícitos para acceder a los sensores del dispositivo, permiso que se solicita automáticamente al iniciar la calibración.

### Navegadores Soportados

La aplicación funciona correctamente en los navegadores Chrome, Firefox, Safari y Edge en sus versiones más recientes. Se recomienda utilizar Chrome en dispositivos Android para una mejor compatibilidad con las APIs de sensores. En iOS Safari, algunas funcionalidades pueden estar limitadas debido a las restricciones del sistema operativo, pero la aplicación está diseñada para funcionar de manera aceptable en este entorno.

---

## Instalación y Configuración

### Paso 1: Crear los Formularios de Google Forms

El primer paso consiste en crear dos formularios de Google Forms que recibirán los datos de la aplicación. El primer formulario, llamado «Registro de Participantes», debe contener las siguientes preguntas en el orden indicado:

```
1. Nombre completo (Texto corto) - Obligatorio
2. Cargo/Posición (Texto corto) - Obligatorio
3. Teléfono (Texto corto) - Obligatorio
4. Correo electrónico (Texto corto) - Obligatorio
5. Empresa (Texto corto) - Opcional
```

El segundo formulario, llamado «Registro de Evaluaciones», debe contener estas preguntas:

```
1. ID de sesión (Texto corto)
2. Nombre del participante (Texto corto)
3. Fecha (Fecha automática)
4. Hora (Hora automática)
5. Distancia promedio (Texto corto)
6. Distancia mínima (Texto corto)
7. Distancia máxima (Texto corto)
8. Ángulo promedio (Texto corto)
9. Ángulo mínimo (Texto corto)
10. Ángulo máximo (Texto corto)
11. Velocidad promedio (Texto corto)
12. Velocidad mínima (Texto corto)
13. Velocidad máxima (Texto corto)
14. Tiempo total (Texto corto)
15. Distancia dentro del rango (Opción múltiple: Sí, No)
16. Ángulo dentro del rango (Opción múltiple: Sí, No)
17. Velocidad constante (Opción múltiple: Sí, No)
18. Resultado final (Opción múltiple: Aprobado, Reprobado, Needs Improvement)
19. Puntuación (Escala 1-100)
20. Comentarios (Texto largo) - Opcional
```

Una vez creados los formularios, debe obtener los «entry IDs» de cada pregunta. Para hacerlo, acceda al formulario en modo edición, haga clic en el icono de tres puntos junto a cada pregunta y seleccione «Obtener enlace previamente relleno». El enlace contendrá los códigos de entrada en el formato «entry.XXXXXXXXX». Anote estos códigos ya que los necesitará configurar en el archivo app.js.

### Paso 2: Configurar los entry IDs

Abra el archivo app.js en un editor de texto y localice la sección «CONFIGURACIÓN DE LA APLICACIÓN» al inicio del archivo. Reemplace los valores de placeholder «XXXXXX» y «XXXXXXXXX» con los URLs y entry IDs reales de sus formularios de Google Forms:

```javascript
googleForms: {
    register: {
        url: 'https://docs.google.com/forms/d/e/XXXXXXXXX/formResponse',
        entries: {
            name: 'entry.XXXXXXXXX',
            position: 'entry.XXXXXXXXX',
            phone: 'entry.XXXXXXXXX',
            email: 'entry.XXXXXXXXX',
            company: 'entry.XXXXXXXXX'
        }
    },
    evaluation: {
        url: 'https://docs.google.com/forms/d/e/XXXXXXXXX/formResponse',
        entries: {
            sessionId: 'entry.XXXXXXXXX',
            name: 'entry.XXXXXXXXX',
            // ... continuar con todos los entry IDs
        }
    }
}
```

### Paso 3: Personalizar Parámetros de Evaluación (Opcional)

Si desea ajustar los rangos óptimos de soldadura, puede modificar los valores en la sección «CONFIG.welding» del archivo app.js:

```javascript
welding: {
    minDistance: 10,    // Distancia mínima en cm
    maxDistance: 15,    // Distancia máxima en cm
    optimalAngle: 45,   // Ángulo óptimo en grados
    angleTolerance: 15, // Tolerancia de ángulo (+/- grados)
    minVelocity: 2,     // Velocidad mínima en cm/s
    maxVelocity: 8,     // Velocidad máxima en cm/s
    evalTime: 30        // Tiempo de evaluación en segundos
}
```

### Paso 4: Desplegar la Aplicación

La aplicación puede desplegarse de forma gratuita en GitHub Pages, Netlify, Vercel o cualquier hosting que soporte sitios web estáticos. Para desplegar en GitHub Pages:

1. Cree un repositorio nuevo en GitHub con el nombre que prefiera, por ejemplo «soldadura-evaluator».
2. Subir todos los archivos del proyecto al repositorio.
3. Ir a Settings > Pages > Source y seleccionar la rama «main» o «master».
4. Hacer clic en Save y esperar unos minutos para que la página se publique.
5. La aplicación estará disponible en «https://su-usuario.github.io/soldadura-evaluator/».

---

## Uso de la Aplicación

### Preparación Previa a la Evaluación

Antes de iniciar las evaluaciones, asegúrese de tener preparado un patrón de soldadura impreso. Este patrón consiste en una serie de líneas paralelas que el participante debe seguir con su celular durante la evaluación. El patrón debe ser lo suficientemente grande como para que quepa completamente en el campo de visión de la cámara del dispositivo móvil cuando se sostiene a una distancia de 10 a 15 centímetros.

El instructor o evaluador debe tener preparado el enlace de la aplicación y verificar que los participantes tengan sus dispositivos cargados y con suficiente espacio de almacenamiento. Es recomendable realizar una evaluación de prueba antes de comenzar con los participantes reales para verificar que todo funciona correctamente.

### Flujo de Evaluación para el Participante

El participante debe seguir estos pasos para completar la evaluación. Primero, accede al enlace de la aplicación desde su navegador móvil y lee la información de la pantalla de bienvenida. Luego, hace clic en «Iniciar Evaluación» y completa el formulario con sus datos personales: nombre completo, cargo o posición en la empresa, número de teléfono de contacto, correo electrónico y opcionalmente el nombre de la empresa donde trabaja.

Después de enviar el formulario, el participante será dirigido a la pantalla de calibración. Aquí debe posicionar su celular paralelo al patrón de soldadura a una distancia aproximada de 12.5 centímetros, que es el punto medio del rango óptimo. El sistema tomará múltiples muestras de los sensores durante unos segundos para establecer una línea base de calibración.

Una vez completada la calibración, comienza la evaluación propiamente dicha. El participante debe sostener su celular de manera que la cámara apunte al patrón de soldadura y mantenerlo a una distancia constante entre 10 y 15 centímetros del patrón. Debe desplazar el celular siguiendo las líneas del patrón a una velocidad constante, manteniendo un ángulo de aproximadamente 45 grados respecto a la superficie del patrón. La evaluación dura 30 segundos por defecto, tiempo durante el cual el sistema recopila datos de todos los sensores.

Al finalizar el tiempo de evaluación, se muestra automáticamente la pantalla de resultados con el informe completo de desempeño. El participante o instructor puede entonces guardar los resultados en Google Forms haciendo clic en el botón correspondiente, o compartir los resultados directamente mediante las opciones de compartir del dispositivo.

---

## Archivo del Proyecto

La estructura completa del proyecto es la siguiente:

```
soldadura-evaluator/
├── index.html          # Estructura principal de la aplicación
├── styles.css          # Estilos y diseño responsivo
├── app.js              # Lógica de la aplicación y sensores
├── manifest.json       # Configuración PWA
├── sw.js               # Service Worker para offline
├── README.md           # Documentación del proyecto
├── icon-192.png        # Icono de la aplicación (192x192)
└── icon-512.png        # Icono de la aplicación (512x512)
```

---

## Consideraciones Técnicas

### Funcionamiento de los Sensores

La aplicación utiliza dos tipos de sensores del dispositivo móvil para realizar las mediciones. El giroscopio, a través de la API DeviceOrientation, proporciona los valores de orientación del dispositivo en tres ejes: alpha (rotación en el eje Z), beta (rotación en el eje X) y gamma (rotación en el eje Y). El valor beta es el principal indicador del ángulo de inclinación del dispositivo respecto al patrón de soldadura.

El acelerómetro, a través de la API DeviceMotion, mide las aceleraciones aplicadas al dispositivo, incluyendo la aceleración de la gravedad. Al analizar las variaciones en las lecturas del acelerómetro, la aplicación puede estimar la velocidad de desplazamiento del dispositivo sobre el patrón de soldadura. La combinación de ambos sensores permite calcular todos los parámetros necesarios para la evaluación.

### Limitaciones y Precisión

Es importante entender que las mediciones realizadas por esta aplicación tienen una precisión limitada comparada con equipos de medición profesionales especializados en soldadura. Los sensores de los smartphones están diseñados para uso general y no para mediciones industriales precisas. Sin embargo, la aplicación proporciona una aproximación suficientemente útil para evaluar la técnica general de los participantes y detectar desviaciones significativas de los parámetros óptimos.

La precisión de la medición de distancia es particularmente dependiente de la calibración inicial y de la estabilidad con que el participante sostenga el dispositivo. Se recomienda mantener el dispositivo lo más paralelo posible al patrón durante toda la evaluación para obtener mediciones más consistentes.

### Optimización para Dispositivos Móviles

La aplicación está optimizada para funcionar en dispositivos móviles con pantallas de diferentes tamaños. El diseño responsivo se adapta a teléfonos inteligentes pequeños, tablets y también funciona aceptablemente en navegadores de escritorio. Los botones y elementos interactivos están dimensionados para facilitar su uso con toques táctiles, y las áreas de visualización de la cámara están maximizadas para proporcionar la mejor experiencia de evaluación posible.

---

## Solución de Problemas Comunes

### El dispositivo no detecta los sensores

Si al intentar iniciar la evaluación aparece un mensaje indicando que el dispositivo no soporta los sensores necesarios, verifique que el navegador tenga permisos para acceder a los sensores. En iOS, es necesario otorgar permisos explícitamente cuando se soliciten. En Android, asegúrese de que los permisos de cámara y sensores estén habilitados en la configuración de la aplicación.

### La cámara no se activa

Si la cámara no se activa correctamente, verifique que el sitio tenga permisos para acceder a la cámara. Algunos navegadores pueden bloquear el acceso si el sitio no está servido mediante HTTPS, aunque GitHub Pages proporciona HTTPS automáticamente. Intente recargar la página y reiniciar la aplicación.

### Los valores de sensores parecen incorrectos

Si las mediciones parecen fuera de lo normal, intente realizar la calibración nuevamente asegurándose de mantener el dispositivo completamente estable durante el proceso. Verifique que no haya objetos metálicos cerca que puedan interferir con los sensores del dispositivo. También puede probar reiniciar la aplicación o el dispositivo.

### Los datos no se guardan en Google Forms

Si los datos no aparecen en la hoja de cálculo de Google Forms, verifique que los entry IDs en el archivo app.js coincidan exactamente con los de sus formularios. Recuerde que el modo «no-cors» utilizado para enviar los datos a Google Forms no proporciona respuesta de éxito o error, por lo que cualquier problema de configuración solo se mostrará en la consola del navegador.

---

## Personalización Avanzada

### Agregar Más Métricas de Evaluación

Si desea agregar métricas adicionales a la evaluación, puede modificar la función «generateResults» en el archivo app.js. Por ejemplo, puede agregar el análisis de la estabilidad del ángulo calculando la desviación estándar de las mediciones de ángulo, o incluir el análisis de la consistencia de la distancia de manera similar a como se hace con la velocidad.

### Integración con Otros Sistemas

Si necesita integrar los datos con otros sistemas además de Google Forms, puede modificar las funciones «submitRegisterForm» y «submitEvaluationForm» en el objeto «GoogleFormsIntegration» para enviar los datos a otras APIs o servicios de su elección.

### Cambiar la Duración de la Evaluación

Para modificar la duración de la evaluación, cambie el valor de «evalTime» en la configuración CONFIG.welding. Tenga en cuenta que evaluaciones más largas proporcionarán datos más representativos del desempeño real del participante, pero también pueden ser más demandantes en términos de atención y estabilidad.

---

## Licencia y Uso

Esta aplicación fue desarrollada para fins educativos y de evaluación en entornos de formación en soldadura. Puede ser utilizada, modificada y distribuida libremente bajo los términos de la licencia MIT. Se recomienda realizar pruebas exhaustivas antes de utilizar la aplicación en evaluaciones formales que tengan consecuencias significativas para los participantes.

---

## Soporte y Contribución

Si encuentra problemas técnicos o tiene sugerencias para mejorar la aplicación, puede reportarlos a través del repositorio de GitHub donde se aloja el proyecto. Las contribuciones son bienvenidas y pueden incluir mejoras en la precisión de las mediciones, nuevas funcionalidades o correcciones de errores.

---

## future Desarrollos Potenciales

Algunas ideas para futuras versiones de la aplicación incluyen la integración con visión por computadora para detectar automáticamente el patrón de soldadura en la imagen de la cámara, soporte para múltiples idiomas, capacidad de generar reportes en PDF directamente desde la aplicación, y la posibilidad de comparar resultados entre múltiples sesiones de evaluación del mismo participante para medir su progreso a lo largo del tiempo.
