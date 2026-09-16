import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [proyecto, setProyecto] = useState(null)
  const [proyeccion, setProyeccion] = useState(null)
  const [lineaBase, setLineaBase] = useState(null)
  const [eventos, setEventos] = useState([])
  const [evaluaciones, setEvaluaciones] = useState([])
  const [historial, setHistorial] = useState([])
  const [moduloActivo, setModuloActivo] = useState(null)

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // =====================================================
  // CARGA INICIAL
  // Proyecto + proyección actual
  // =====================================================

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const respuestaProyecto = await fetch(
          'http://localhost:3000/proyectos/1'
        )

        if (!respuestaProyecto.ok) {
          throw new Error('No fue posible obtener el proyecto')
        }

        const datosProyecto = await respuestaProyecto.json()

        const respuestaProyeccion = await fetch(
          'http://localhost:3000/proyecciones/proyecto/1/actual'
        )

        if (!respuestaProyeccion.ok) {
          throw new Error(
            'No fue posible obtener la proyección actual'
          )
        }

        const datosProyeccion =
          await respuestaProyeccion.json()

        setProyecto(datosProyecto)
        setProyeccion(datosProyeccion.proyeccion)

      } catch (error) {
        console.error(error)
        setError(error.message)

      } finally {
        setCargando(false)
      }
    }

    cargarDatos()
  }, [])

  // =====================================================
  // FUNCIONES AUXILIARES
  // =====================================================

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha'

    return new Date(fecha).toLocaleDateString(
      'es-MX',
      {
        timeZone: 'UTC'
      }
    )
  }

  const formatearDinero = (cantidad) => {
    return Number(cantidad || 0).toLocaleString(
      'es-MX'
    )
  }


  // =====================================================
  // LÍNEA BASE
  // =====================================================
  const cargarLineaBase = async () => {

    // Si Línea base ya está abierta, la cerramos
    if (moduloActivo === 'linea-base') {
      setModuloActivo(null)
      return
    }

    try {
      setError(null)

      const respuesta = await fetch(
        'http://localhost:3000/lineas-base/1/linea-base'
      )

      if (!respuesta.ok) {
        throw new Error(
          'No fue posible obtener la línea base'
        )
      }

      const datos = await respuesta.json()

      setLineaBase(datos)
      setModuloActivo('linea-base')

    } catch (error) {
      console.error(error)
      setError(error.message)
    }
  }
  // =====================================================
  // EVENTOS
  // =====================================================
  const cargarEventos = async () => {

    // Si Eventos ya está abierto, lo cerramos
    if (moduloActivo === 'eventos') {
      setModuloActivo(null)
      return
    }

    try {
      setError(null)

      const respuesta = await fetch(
        'http://localhost:3000/eventos/proyecto/1'
      )

      if (!respuesta.ok) {
        throw new Error(
          'No fue posible obtener los eventos'
        )
      }

      const datos = await respuesta.json()

      console.log('DATOS DE EVENTOS:', datos)

      if (Array.isArray(datos)) {
        setEventos(datos)
      } else if (Array.isArray(datos.eventos)) {
        setEventos(datos.eventos)
      } else {
        console.error(
          'Formato inesperado de eventos:',
          datos
        )
        setEventos([])
      }

      setModuloActivo('eventos')

    } catch (error) {
      console.error(
        'Error al cargar eventos:',
        error
      )

      setError(error.message)
    }
  }
  // =====================================================
  // EVALUACIONES
  // =====================================================
  const cargarEvaluaciones = async () => {

    // Si Evaluaciones ya está abierta, la cerramos
    if (moduloActivo === 'evaluaciones') {
      setModuloActivo(null)
      return
    }

    try {
      setError(null)

      const respuesta = await fetch(
        'http://localhost:3000/evaluaciones-impacto/proyecto/1/confirmadas'
      )

      if (!respuesta.ok) {
        throw new Error(
          'No fue posible obtener las evaluaciones'
        )
      }

      const datos = await respuesta.json()

      setEvaluaciones(datos)
      setModuloActivo('evaluaciones')

    } catch (error) {
      console.error(error)
      setError(error.message)
    }
  }

  // =====================================================
  // HISTORIAL
  // Lo conectaremos en el siguiente paso
  // =====================================================
const cargarHistorial = async () => {
console.log('CLICK EN HISTORIAL')
  // Si Historial ya está abierto, lo cerramos
  if (moduloActivo === 'historial') {
    setModuloActivo(null)
    return
  }

  try {
    setError(null)

    const respuesta = await fetch(
      'http://localhost:3000/proyecciones/proyecto/1'
    )

    if (!respuesta.ok) {
      throw new Error(
        'No fue posible obtener el historial de proyecciones'
      )
    }

    const datos = await respuesta.json()

    console.log('HISTORIAL:', datos)

    setHistorial(
      Array.isArray(datos.proyecciones)
        ? datos.proyecciones
        : []
    )

    setModuloActivo('historial')

  } catch (error) {
    console.error(error)
    setError(error.message)
  }
}


  // =====================================================
  // ESTADOS DE CARGA
  // =====================================================

  if (cargando) {
    return (
      <div className="mensaje">
        Cargando información...
      </div>
    )
  }

  if (error && !proyecto) {
    return (
      <div className="mensaje error">
        Error: {error}
      </div>
    )
  }

  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <main className="dashboard">

      {/* ============================================= */}
      {/* ENCABEZADO DEL PROYECTO */}
      {/* ============================================= */}

      <header className="encabezado">
        <div>
          <p className="subtitulo">
            GESTIÓN OPERATIVA EMPRESARIAL
          </p>

          <h1>{proyecto.nombre}</h1>

          <p className="descripcion">
            {proyecto.descripcion}
          </p>
        </div>

        <span className="estado">
          {proyecto.estado}
        </span>
      </header>

      {/* ============================================= */}
      {/* PROYECCIÓN ACTUAL */}
      {/* ============================================= */}

      <section className="seccion">

        <div className="titulo-seccion">
          <div>
            <p className="subtitulo">
              CONTROL OPERATIVO
            </p>

            <h2>Proyección actual</h2>
          </div>

          <span className="actualizacion">
            Datos actuales del proyecto
          </span>
        </div>

        <div className="tarjetas">

          <article className="tarjeta">
            <span className="etiqueta">
              Atraso efectivo
            </span>

            <strong className="valor">
              {proyeccion.atraso_efectivo_dias}
            </strong>

            <span className="unidad">
              días
            </span>
          </article>

          <article className="tarjeta">
            <span className="etiqueta">
              Fin proyectado
            </span>

            <strong className="valor fecha">
              {formatearFecha(
                proyeccion.fecha_fin_proyectada
              )}
            </strong>

            <span className="unidad">
              Fecha estimada
            </span>
          </article>

          <article className="tarjeta">
            <span className="etiqueta">
              Costo adicional
            </span>

            <strong className="valor dinero">
              $
              {formatearDinero(
                proyeccion.costo_adicional
              )}
            </strong>

            <span className="unidad">
              Variación acumulada
            </span>
          </article>

          <article className="tarjeta destacada">
            <span className="etiqueta">
              Costo proyectado
            </span>

            <strong className="valor dinero">
              $
              {formatearDinero(
                proyeccion.costo_proyectado
              )}
            </strong>

            <span className="unidad">
              Proyección vigente
            </span>
          </article>

        </div>
      </section>

      {/* ============================================= */}
      {/* NAVEGACIÓN */}
      {/* ============================================= */}

      <nav className="modulos">

        <button
          type="button"
          onClick={cargarLineaBase}
        >
          Línea base
        </button>

        <button
          type="button"
          onClick={cargarEventos}
        >
          Eventos
        </button>

        <button
          type="button"
          onClick={cargarEvaluaciones}
        >
          Evaluaciones
        </button>

        <button
          type="button"
          onClick={cargarHistorial}
        >
          Historial
        </button>

      </nav>

      {/* ============================================= */}
      {/* ERROR DE ALGÚN MÓDULO */}
      {/* ============================================= */}

      {error && (
        <div className="mensaje error">
          Error: {error}
        </div>
      )}

      {/* ============================================= */}
      {/* LÍNEA BASE */}
      {/* ============================================= */}

      {moduloActivo === 'linea-base' &&
        lineaBase && (

          <section className="seccion modulo-contenido">

            <div className="titulo-seccion">

              <div>
                <p className="subtitulo">
                  PLANIFICACIÓN
                </p>

                <h2>Línea base</h2>
              </div>

              <span className="estado">
                {lineaBase.estado}
              </span>

            </div>

            <div className="tarjetas">

              <article className="tarjeta">

                <span className="etiqueta">
                  Fecha de inicio
                </span>

                <strong className="valor fecha">
                  {formatearFecha(
                    lineaBase.fecha_inicio
                  )}
                </strong>

                <span className="unidad">
                  Inicio programado
                </span>

              </article>

              <article className="tarjeta">

                <span className="etiqueta">
                  Duración
                </span>

                <strong className="valor">
                  {lineaBase.duracion_dias}
                </strong>

                <span className="unidad">
                  días
                </span>

              </article>

              <article className="tarjeta">

                <span className="etiqueta">
                  Fin previsto
                </span>

                <strong className="valor fecha">
                  {formatearFecha(
                    lineaBase.fecha_fin_prevista
                  )}
                </strong>

                <span className="unidad">
                  Fecha de línea base
                </span>

              </article>

              <article className="tarjeta">

                <span className="etiqueta">
                  Costo base
                </span>

                <strong className="valor dinero">
                  $
                  {formatearDinero(
                    lineaBase.costo_base
                  )}
                </strong>

                <span className="unidad">
                  Presupuesto original
                </span>

              </article>

            </div>

          </section>
        )}

      {/* ============================================= */}
      {/* EVENTOS */}
      {/* ============================================= */}

      {moduloActivo === 'eventos' && (

        <section className="seccion modulo-contenido">

          <div className="titulo-seccion">

            <div>
              <p className="subtitulo">
                OPERACIÓN
              </p>

              <h2>Eventos registrados</h2>
            </div>

            <span className="actualizacion">
              {eventos.length}{' '}
              {eventos.length === 1
                ? 'evento'
                : 'eventos'}
            </span>

          </div>

          <div className="lista-eventos">

            {eventos.length === 0 ? (

              <p>
                No existen eventos registrados.
              </p>

            ) : (

              Array.isArray(eventos) && eventos.map((evento) => (

                <article
                  className="evento-card"
                  key={evento.id}
                >

                  <div className="evento-superior">

                    <span className="subtitulo">
                      {evento.tipo}
                    </span>

                    <span className="estado">
                      {evento.estado_registro}
                    </span>

                  </div>

                  <h3>
                    {evento.descripcion}
                  </h3>

                  <div className="evento-datos">

                    <span>
                      <strong>Inicio:</strong>{' '}
                      {formatearFecha(
                        evento.fecha_inicio
                      )}
                    </span>

                    <span>
                      <strong>
                        Costo observado:
                      </strong>{' '}
                      $
                      {formatearDinero(
                        evento.costo_observado
                      )}
                    </span>

                  </div>

                </article>
              ))
            )}

          </div>

        </section>
      )}

      {/* ============================================= */}
      {/* EVALUACIONES DE IMPACTO */}
      {/* ============================================= */}

      {moduloActivo === 'evaluaciones' && (

        <section className="seccion modulo-contenido">

          <div className="titulo-seccion">

            <div>
              <p className="subtitulo">
                ANÁLISIS DE IMPACTO
              </p>

              <h2>Evaluaciones confirmadas</h2>
            </div>

            <span className="actualizacion">
              {evaluaciones.length}{' '}
              {evaluaciones.length === 1
                ? 'evaluación'
                : 'evaluaciones'}
            </span>

          </div>

          <div className="lista-eventos">

            {evaluaciones.length === 0 ? (

              <p>
                No existen evaluaciones confirmadas
                y vigentes.
              </p>

            ) : (

              evaluaciones.map((evaluacion) => (

                <article
                  className="evento-card"
                  key={evaluacion.evaluacion_id}
                >

                  <div className="evento-superior">

                    <span className="subtitulo">
                      {evaluacion.tipo}
                    </span>

                    <span className="estado">
                      CONFIRMADA
                    </span>

                  </div>

                  <h3>
                    {evaluacion.descripcion}
                  </h3>

                  <div className="evento-datos">

                    <span>
                      <strong>
                        Afecta plazo:
                      </strong>{' '}
                      {Number(
                        evaluacion.afecta_plazo
                      ) === 1
                        ? 'Sí'
                        : 'No'}
                    </span>

                    <span>
                      <strong>
                        Días adicionales:
                      </strong>{' '}
                      {evaluacion.dias_adicionales}
                    </span>

                    <span>
                      <strong>
                        Afecta costo:
                      </strong>{' '}
                      {Number(
                        evaluacion.afecta_costo
                      ) === 1
                        ? 'Sí'
                        : 'No'}
                    </span>

                    <span>
                      <strong>
                        Monto adicional:
                      </strong>{' '}
                      $
                      {formatearDinero(
                        evaluacion.monto_adicional
                      )}
                    </span>

                  </div>

                  {evaluacion.afecta_plazo === 1 &&
                    evaluacion.impacto_inicio &&
                    evaluacion.impacto_fin && (

                      <div className="evento-datos">

                        <span>
                          <strong>
                            Impacto desde:
                          </strong>{' '}
                          {formatearFecha(
                            evaluacion.impacto_inicio
                          )}
                        </span>

                        <span>
                          <strong>
                            Impacto hasta:
                          </strong>{' '}
                          {formatearFecha(
                            evaluacion.impacto_fin
                          )}
                        </span>

                      </div>
                    )}

                  {evaluacion.justificacion && (

                    <p className="justificacion">
                      <strong>
                        Justificación:
                      </strong>{' '}
                      {evaluacion.justificacion}
                    </p>
                  )}

                </article>
              ))
            )}

          </div>

        </section>
      )}

      {/* =====================================================
    HISTORIAL
===================================================== */}

{moduloActivo === 'historial' && (
  <section className="seccion modulo-contenido">

    <div className="titulo-seccion">
      <div>
        <p className="subtitulo">SEGUIMIENTO</p>
        <h2>Historial de proyecciones</h2>
      </div>

      <span className="actualizacion">
        {historial.length} proyecciones
      </span>
    </div>

    <div className="lista-eventos">

      {historial.map((registro, index) => (
        <article
          className="tarjeta-evento"
          key={registro.id}
        >

          <div className="evento-encabezado">
            <span className="subtitulo">
              PROYECCIÓN #{registro.id}
            </span>

            {index === 0 && (
              <span className="estado">
                VIGENTE
              </span>
            )}
          </div>

          <h3>
            Calculada el {formatearFecha(registro.fecha_calculo)}
          </h3>

          <div className="evento-datos">

            <span>
              <strong>Atraso efectivo:</strong>{' '}
              {registro.atraso_efectivo_dias} días
            </span>

            <span>
              <strong>Fin proyectado:</strong>{' '}
              {formatearFecha(registro.fecha_fin_proyectada)}
            </span>

            <span>
              <strong>Costo adicional:</strong>{' '}
              ${formatearDinero(registro.costo_adicional)}
            </span>

            <span>
              <strong>Costo proyectado:</strong>{' '}
              ${formatearDinero(registro.costo_proyectado)}
            </span>

          </div>

          {registro.comentarios && (
            <p>
              <strong>Comentarios:</strong>{' '}
              {registro.comentarios}
            </p>
          )}

        </article>
      ))}

    </div>

  </section>
)}


    </main>
  )
}

export default App
