# Cómo ampliar un nivel

Trabaja sobre uno de los siete archivos de `data/`. No combines niveles en un archivo. Conserva JSON válido en UTF-8, sin comentarios ni comas al final.

## Estructura superior

| Campo | Uso |
| --- | --- |
| `schemaVersion` | Debe ser `1`: versión del contrato de datos. |
| `bankId` | Mantén `english-atlas`. |
| `version` | Versión del contenido de ese nivel. Increméntala al cambiarlo, por ejemplo de `1.0.0` a `1.0.1`. |
| `title`, `language` | Nombre de la aplicación e idioma de la interfaz (`es`). |
| `settings` | Tamaño del examen, duración inicial, referencia de aciertos y mezcla de opciones. |
| `sources` | Referencias y criterio de organización. No son enlaces que deban descargarse. |
| `editorial` | Notas de alcance del banco. Puedes actualizarlas al ampliarlo. |
| `level` | ID, código, nombre, descripción, objetivo y todos sus temas. |
| `questions` | Arreglo de preguntas del nivel. Se relacionan con tema y subtema por ID. |

La configuración inicial es:

```json
{"examLength":20,"defaultMinutes":30,"passPercent":60,"shuffleOptions":true}
```

`passPercent` solo cambia el mensaje de ánimo del resultado; no acredita ni desbloquea niveles. `defaultMinutes: 0` permite un examen sin límite. El modo práctica no tiene cronómetro.

## Tema y subtema

Este es un ejemplo de un tema ya incluido. Se encuentra dentro de `level.topics`, y conserva el número de módulo del Plan Maestro:

```json
{
  "id": "a1-present-simple",
  "order": 5,
  "title": "Presente simple",
  "sourceIds": ["plan-maestro"],
  "subtopics": [
    {"id":"a1-present-simple-1","title":"Afirmaciones y tercera persona"},
    {"id":"a1-present-simple-2","title":"Negaciones con do y does"},
    {"id":"a1-present-simple-3","title":"Preguntas y usos"}
  ]
}
```

Los temas se ordenan por `order`. Puedes crear más de tres subtemas: el motor no impone ese número. Los IDs de tema y subtema deben ser únicos dentro del nivel. No hace falta declarar un contador de preguntas: se calcula automáticamente.

## Opción múltiple

Añade objetos como este a `questions`. Usa un ID nuevo; este ejemplo continúa después de las 24 preguntas iniciales de A1.

```json
{
  "id": "a1-present-simple-q025",
  "levelId": "a1",
  "topicId": "a1-present-simple",
  "subtopicId": "a1-present-simple-1",
  "type": "single-choice",
  "prompt": "Completa: ‘My brother ___ breakfast at seven.’",
  "options": [
    {"id":"a","text":"have"},
    {"id":"b","text":"has"},
    {"id":"c","text":"having"},
    {"id":"d","text":"are have"}
  ],
  "answerId": "b",
  "explanation": "My brother equivale a he. En presente simple, have cambia a has en tercera persona singular.",
  "sourceIds": ["plan-maestro"]
}
```

`answerId` se refiere al ID de la opción, **no a su posición**. La aplicación mezcla las opciones de elección múltiple al iniciar cada sesión. Se admiten entre 2 y 6 opciones, cada una con un ID y un texto únicos dentro de la pregunta.

## Verdadero o falso

```json
{
  "id": "a1-present-simple-q026",
  "levelId": "a1",
  "topicId": "a1-present-simple",
  "subtopicId": "a1-present-simple-2",
  "type": "true-false",
  "prompt": "En ‘She doesn’t eat meat’, eat está en su forma base.",
  "options": [
    {"id":"true","text":"Verdadero"},
    {"id":"false","text":"Falso"}
  ],
  "answerId": "true",
  "explanation": "Después de doesn’t se usa el verbo base. La marca de tercera persona ya aparece en el auxiliar.",
  "sourceIds": ["plan-maestro"]
}
```

En `true-false` usa exactamente dos opciones con los IDs de texto `true` y `false`. `answerId` es una cadena, no un booleano. No escribas `answerId: true`.

## Campos opcionales

- `context`: texto para un diálogo, párrafo o situación de lectura. Se muestra antes de las opciones y también en la revisión. Usa `\n` dentro del texto para separar líneas.
- `enabled`: `false` retira temporalmente una pregunta del sorteo sin borrarla; omitirlo equivale a `true`.
- `sourceIds`: referencias editoriales a `sources`; no se usan para la corrección.

Los textos se muestran como texto plano, nunca como HTML. No insertes etiquetas, código, imágenes codificadas ni enlaces que sean imprescindibles para comprender la pregunta. No existe un tipo de respuesta de audio, ensayo o selección múltiple de varias opciones.

## Reglas de ampliación

1. `levelId` debe coincidir con `level.id` y con el archivo: `pre-a1`, `a1`, `a2`, `b1`, `b2`, `c1` o `c2`.
2. `topicId` debe existir en `level.topics`; `subtopicId` debe pertenecer exactamente a ese tema.
3. Todos los IDs usan minúsculas, números, guiones, puntos o guiones bajos, y empiezan con letra o número. Evita los nombres reservados `constructor`, `prototype` y `__proto__`.
4. Cada pregunta necesita ID único, tipo válido, enunciado, opciones, respuesta correcta y explicación no vacía.
5. Debe haber una sola respuesta defendible como correcta. Da contexto suficiente para tiempos verbales, registros y variedades del inglés.
6. Para habilitar un examen de un tema necesitas **al menos 20 preguntas activas en ese tema**. Para habilitar el examen de un subtema necesitas 20 en ese subtema. Con 24 o más, el sorteo cambia también el conjunto de preguntas, además de su orden.
7. Las preguntas nunca se toman de otros temas o niveles para rellenar una selección corta. En práctica se usan todas las disponibles hasta un máximo de 20; en examen se indica cuántas faltan.
8. Las preguntas de subtemas de un mismo tema se mezclan aleatoriamente. El sorteo no garantiza una cuota igual por subtema ni una proporción fija de tipos de pregunta en cada ronda.
9. Conserva el contenido y la jerarquía existentes cuando amplíes un archivo. Si una pregunta cambia de significado o de clave, aumenta `version`.
10. Recarga la página después de reemplazar un JSON. Si se detectan errores de estructura, aparecerán sus rutas para corregirlos. Si una versión cambia, una sesión pendiente de esa versión no se retoma contra la nueva.

Los resultados anteriores permanecen como historial de intentos. No se recalculan retroactivamente con un banco modificado.

## Validación

Con Node.js: `node --test tests/core.test.mjs`. Las comprobaciones validan los siete archivos actuales y usan datos propios para los casos del motor; puedes ampliar el contenido sin ajustar cantidades en los tests. El validador de la interfaz no impone 168 preguntas ni 102 temas: detecta referencias rotas, IDs duplicados, tipos y respuestas inválidas antes de habilitar un nivel.
