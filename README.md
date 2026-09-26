# HA Futurista

Tarjetas personalizadas para Home Assistant con estilo futurista: fondo oscuro, bordes con brillo neón y un clima ilustrado con sol, luna, nubes, lluvia y nieve animados según el tiempo real.

Incluye 7 tarjetas:

| Tarjeta | Para qué sirve |
|---|---|
| `custom:futurista-clima-card` | Cielo ilustrado, temperatura grande y pronóstico por horas |
| `custom:futurista-reloj-card` | Hora, fecha y anillo con el progreso del día |
| `custom:futurista-estado-card` | Título con chips que se ponen en naranja o rojo cuando algo requiere atención |
| `custom:futurista-roborock-card` | Batería en anillo y botones de acción |
| `custom:futurista-musica-card` | Reproductor con carátula, ecualizador y volumen |
| `custom:futurista-red-card` | Velocidades, gráfico de la última hora y lista desplegable de dispositivos |
| `custom:futurista-nas-card` | Medidores circulares (CPU, RAM, disco o cualquier sensor) |

## Instalación con HACS

1. En HACS, abre el menú **⋮ → Repositorios personalizados**.
2. Pega la dirección de este repositorio y elige el tipo **Dashboard**.
3. Busca **HA Futurista** en HACS y pulsa **Descargar**.
4. Recarga el navegador (en la app del celular: *Configuración de la app → Depuración → Recargar*).

## Panel de ejemplo

En `ejemplos/panel.yaml` está el panel completo con el diseño de la Opción E. Pégalo en el **Editor de configuración RAW** de un panel nuevo y reemplaza las entidades marcadas con `# CAMBIAR`.

En `ejemplos/tema-futurista.yaml` hay un tema opcional para que la barra superior y los menús usen los mismos colores.

## Opciones de cada tarjeta

### Clima
```yaml
type: custom:futurista-clima-card
entity: weather.forecast_casa   # obligatorio
nombre: Martinengo              # opcional
horas: 6                        # cuántas horas mostrar (por defecto 6)
pronostico: horario             # horario | diario
sun_entity: sun.sun             # para saber si es de noche
```

### Reloj
```yaml
type: custom:futurista-reloj-card
anillo: true         # false para ocultar el anillo del día
idioma: es-ES
```

### Estado
```yaml
type: custom:futurista-estado-card
titulo: Hola Familia
subtitulo: Martinengo     # si no se pone, muestra la fecha
chips:
  - entity: binary_sensor.internet
    nombre: Internet
    estados_ok: ["on"]    # verde si el estado está en la lista, rojo si no
  - entity: sensor.cpu
    nombre: CPU
    alerta_sobre: 90      # naranja si supera este valor
  - entity: sensor.bateria
    nombre: Batería
    alerta_bajo: 20       # naranja si baja de este valor
```

### Roborock (o cualquier grupo de botones)
```yaml
type: custom:futurista-roborock-card
nombre: Roborock
entity: vacuum.roborock
bateria: sensor.roborock_bateria   # opcional; si no, usa el atributo battery_level
estado: sensor.roborock_estado     # opcional; texto de estado propio
columnas: 3
botones:
  - nombre: Aspirar
    icono: mdi:robot-vacuum
    accion: vacuum.start             # cualquier acción dominio.servicio
    target:
      entity_id: vacuum.roborock
    data: {}                         # opcional
  - nombre: Calor
    icono: mdi:heat-wave
    entity: switch.calefaccion       # sin "accion": se prende/apaga y se ilumina cuando está encendido
```

### Música
```yaml
type: custom:futurista-musica-card
entity: media_player.echo_pop_spotify
```

### Red
```yaml
type: custom:futurista-red-card
nombre: Red
conexion: binary_sensor.estado_wan
descarga: sensor.velocidad_de_descarga
subida: sensor.velocidad_de_subida
dispositivos: sensor.nexxt_dispositivos   # sensor con la lista en un atributo
atributo: dispositivos                    # nombre del atributo (por defecto "dispositivos")
grafico: true                             # gráfico de la última hora
nombres:                                  # renombrar por coincidencia parcial
  unknown-78: ASUSTOR
iconos:
  unknown-78: mdi:nas
```
La lista de dispositivos se abre y se cierra al instante con la flecha, sin necesidad de ayudantes `input_boolean`.

### NAS
```yaml
type: custom:futurista-nas-card
nombre: ASUSTOR
medidores:
  - entity: sensor.cpu
    nombre: CPU                # si el sensor está en %, se usa directo
  - entity: sensor.ram_usada
    nombre: RAM
    max: 1024                  # para sensores que no están en %: valor / max
  - entity: sensor.temperatura
    nombre: Temp
    max: 90
    mostrar: valor             # muestra el número con su unidad en vez del %
    color: "#ff5d73"
filas:
  - entity: sensor.uptime
    nombre: Encendido
```

## Tamaño en la vista de secciones

Cada tarjeta trae un tamaño por defecto. Para cambiarlo, usa `grid_options` (`columns` y `rows`). En una sección con `column_span: 4` hay 48 columnas de ancho; en una normal, 12.

## Licencia

MIT
