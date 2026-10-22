# Patricia Tuesta English Classes

Trivia de inglés lista para GitHub Pages: HTML, CSS y JavaScript sin frameworks, instalación de paquetes ni compilación.

Identidad visual: azul `#0B1221`, dorado `#CEA35D` y marca en Times New Roman. La interfaz usa fuentes del sistema y no descarga imágenes ni fuentes externas.

## Empezar

1. Descomprime el proyecto.
2. Para probar en Windows, ejecuta `ABRIR_EN_WINDOWS.bat`. Utiliza Node.js, sin descargar dependencias. También puedes ejecutar `node servidor.mjs` desde la carpeta del proyecto.
3. Abre `http://localhost:8000`.

Como alternativa, abre la carpeta con Live Server de Visual Studio Code o ejecuta `python -m http.server 8000`.

**Usa un servidor local o GitHub Pages.** Abrir `index.html` con doble clic (`file://`) no permite cargar correctamente los módulos JavaScript y los JSON en los navegadores habituales.

## Publicar en GitHub Pages

1. Crea un repositorio y sube **el contenido de la carpeta** del proyecto. `index.html` debe quedar en la raíz del repositorio, junto a `assets/` y `data/`.
2. Conserva también el archivo `.nojekyll`, incluido en el ZIP.
3. Abre **Settings → Pages → Build and deployment → Source → Deploy from a branch**.
4. Selecciona **main** y **/(root)**. Pulsa **Save**.
5. Abre la dirección que GitHub muestre en Pages cuando finalice la publicación.

Las rutas son relativas: funcionan también en sitios publicados bajo el nombre del repositorio. No necesitas PHP, bases de datos, claves, servicios externos ni GitHub Actions propios.

Referencia: [Configurar el origen de publicación — GitHub Docs](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Siete archivos independientes

| Archivo | Nivel | Temas | Preguntas iniciales | Tema con muestra |
| --- | --- | ---: | ---: | --- |
| `data/pre-a1.json` | Inglés desde cero — Pre-A1 | 12 | 24 | Saludos y despedidas |
| `data/a1.json` | Inglés básico inicial — A1 | 14 | 24 | Presente simple |
| `data/a2.json` | Inglés básico superior — A2 | 16 | 24 | Pasado simple |
| `data/b1.json` | Inglés intermedio — B1 | 18 | 24 | Presente perfecto o pasado simple |
| `data/b2.json` | Inglés intermedio superior — B2 | 18 | 24 | Tercer condicional |
| `data/c1.json` | Inglés avanzado — C1 | 16 | 24 | Inversión para énfasis |
| `data/c2.json` | Dominio avanzado — C2 | 8 | 24 | Dominio de registros |

Total: **102 temas, 306 subtemas y 168 preguntas originales de muestra**. Cada muestra incluye 18 preguntas de opción múltiple y 6 de verdadero/falso. Los otros temas contienen su estructura y se identifican como “Por ampliar”; no se presentan como bancos completos.

La pantalla inicial solo carga metadatos pequeños de navegación (`assets/catalog.js`). El JSON de un nivel se descarga **al seleccionarlo**, sin precargar los otros seis. Se conserva una caché de como máximo dos niveles durante la visita. Los conteos de preguntas y la disponibilidad de cada tema se calculan desde el JSON leído.

## Lo que puedes hacer

- Elegir nivel → tema → todos sus subtemas o un subtema concreto.
- Hacer un examen de **20 preguntas distintas**, elegidas aleatoriamente del conjunto seleccionado.
- Mezclar el orden de las opciones de elección múltiple sin alterar la corrección. Verdadero y falso mantienen su orden habitual.
- Navegar, cambiar o quitar respuestas y marcar preguntas para revisar. El examen no revela la corrección hasta entregar.
- Elegir examen sin límite o con cronómetro; al agotarse el tiempo se entrega automáticamente.
- Usar el modo práctica: compruebas cada respuesta y aparece su explicación. Las respuestas ya comprobadas quedan fijadas.
- Practicar con menos de 20 preguntas cuando un subtema es pequeño. El modo examen exige siempre suficientes preguntas y nunca las duplica para completar el número.
- Ver nota sobre 20, porcentaje, errores, omitidas, tiempo y desglose por subtema; revisar las explicaciones y hacer otra ronda.
- Retomar una sesión con su orden original, respuestas, marcas y respuestas comprobadas.
- Consultar los últimos 50 resultados guardados en el navegador.

Las sesiones cronometradas usan una fecha límite real: el reloj sigue corriendo al salir, cambiar de pestaña o cerrar la página. Un nuevo intento puede compartir preguntas con otro intento, pero no contiene duplicados en sí mismo.

## Ampliar contenido sin tocar el HTML

Edita únicamente el JSON del nivel correspondiente. Puedes añadir preguntas a cualquier tema ya definido, agregar nuevos temas o subtemas y deshabilitar preguntas con `enabled: false`. El sitio los reconoce al recargar.

Consulta:

- [Contrato del banco y ejemplos](docs/FORMATO_JSON.md).
- [Prompt listo para otro modelo](docs/PROMPT_PARA_AMPLIAR.txt).
- [Temario organizado y fuentes](docs/TEMARIO.md).

No cambies los identificadores existentes sin revisar sus referencias. Incrementa `version` al modificar un banco, para evitar retomar una sesión contra respuestas que hayan cambiado. Si agregas temas y quieres actualizar también el número orientativo de la tarjeta inicial, ajusta `topicCount` en `assets/catalog.js`; dentro del nivel los conteos se calculan automáticamente.

## Organización pedagógica

El **Plan Maestro** es la fuente principal: sus módulos de la sección 2 se convierten en los 102 temas, conservando su secuencia. Los tres subtemas de cada tema son una propuesta editorial para esta aplicación. Los ejercicios de muestra son originales, basados en esos objetivos, y no se transcribieron de cursos comerciales.

Los dos sílabos de Inglés III se integran como contextos A2, sin duplicar niveles. Inglés IV (A2+) complementa la consolidación A2 y la transición hacia B1; Inglés VI declara B2 y aporta contextos profesionales. Elementary Business English complementa situaciones laborales desde las bases, sin asignarle un único nivel MCER que su sílabo no declara. Las referencias se conservan en `sources` dentro de cada archivo; los PDF originales no se incluyen en este repositorio.

Esta muestra cubre reconocimiento escrito. Una puntuación alta en un tema no acredita dominio global del nivel MCER; la escucha, la conversación y la escritura libre requieren otras actividades y evaluación docente.

## Archivos y comprobaciones

| Ruta | Función |
| --- | --- |
| `index.html` | Estructura de la aplicación |
| `assets/styles.css` | Diseño adaptable y estilos de accesibilidad |
| `assets/app.js` | Interfaz, carga por nivel, navegación y guardado local |
| `assets/core.js` | Validación, índices, sorteo y corrección |
| `assets/catalog.js` | Metadatos pequeños de los siete niveles |
| `data/` | Los siete bancos JSON |
| `docs/` | Contrato, temario y prompt de ampliación |
| `servidor.mjs` | Servidor local opcional, con Node.js |
| `tests/core.test.mjs` | Comprobaciones del motor y de los siete bancos |

Con una versión actual de Node.js, ejecuta `node --test tests/core.test.mjs`. Se comprueban los siete bancos, el sorteo sin duplicados, la corrección por ID, la práctica corta, las referencias inválidas, la restauración y el límite temporal.

## Alcance del frontend

El progreso es local al dispositivo y navegador: no hay cuentas, sincronización entre alumnos ni envío de notas a la profesora. Las preguntas y claves correctas se descargan al navegador y son inspeccionables; se trata de una herramienta de enseñanza y autoevaluación, sin protección de exámenes supervisados. No se han incluido audio, reconocimiento de voz ni corrección automática de redacciones.

Si el almacenamiento local está bloqueado o lleno, la aplicación lo indica y permite continuar durante la visita.
