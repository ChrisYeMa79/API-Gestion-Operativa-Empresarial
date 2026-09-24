import { useEffect, useState } from 'react'
import './App.css'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

  // Formulario para registrar un nuevo evento
  const [nuevoEvento, setNuevoEvento] = useState({
    tipo: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    afecta_operacion: 1,
    costo_observado: 0,
    registrado_por: 1
  })


  // Formulario para evaluar un evento confirmado
  const [nuevaEvaluacion, setNuevaEvaluacion] = useState({
    evento_id: '',
    afecta_plazo: 1,
    dias_adicionales: 0,
    impacto_inicio: '',
    impacto_fin: '',
    afecta_costo: 0,
    monto_adicional: 0,
    justificacion: '',
    evaluado_por: 1
  })

  const [mensajeExito, setMensajeExito] = useState('')

  // =====================================================
  // CARGA INICIAL
  // Proyecto + proyección actual
  // =====================================================

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const respuestaProyecto = await fetch(
          `${API_URL}/proyectos/1`
        )

        if (!respuestaProyecto.ok) {
          throw new Error('No fue posible obtener el proyecto')
        }

        const datosProyecto = await respuestaProyecto.json()

        const respuestaProyeccion = await fetch(
          `${API_URL}/proyecciones/proyecto/1/actual`
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
        `${API_URL}/lineas-base/1/linea-base`
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
  const cargarEventos = async (forzarRecarga = false) => {

    // Si Eventos ya está abierto, lo cerramos
    if (moduloActivo === 'eventos' && !forzarRecarga) {
      setModuloActivo(null)
      return
    }

    try {
      setError(null)

      const respuesta = await fetch(
        `${API_URL}/eventos/proyecto/1`
      )

      if (!respuesta.ok) {
        throw new Error(
          'No fue posible obtener los eventos'
        )
      }

      const datos = await respuesta.json()

      

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

  const registrarEvento = async (e) => {
    e.preventDefault()

    try {
      setError(null)

      const respuesta = await fetch(
        `${API_URL}/eventos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            proyecto_id: 1,
            tipo: nuevoEvento.tipo,
            descripcion: nuevoEvento.descripcion,
            fecha_inicio: nuevoEvento.fecha_inicio,
            fecha_fin: nuevoEvento.fecha_fin || null,
            afecta_operacion: Number(
              nuevoEvento.afecta_operacion
            ),
            costo_observado: Number(
              nuevoEvento.costo_observado
            ),
            registrado_por: Number(
              nuevoEvento.registrado_por
            )
          })
        }
      )

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(
          datos.error || 'No fue posible registrar el evento'
        )
      }

      

      setNuevoEvento({
        tipo: '',
        descripcion: '',
        fecha_inicio: '',
        fecha_fin: '',
        afecta_operacion: 1,
        costo_observado: 0,
        registrado_por: 1
      })

      await cargarEventos(true)

    } catch (error) {
      console.error(
        'Error al registrar evento:',
        error
      )

      setError(error.message)
    }
  }

  const confirmarEvento = async (idEvento) => {
    try {
      setError(null)

      const respuesta = await fetch(
        `${API_URL}/eventos/${idEvento}/confirmar`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            confirmado_por: 1
          })
        }
      )

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(
          datos.error || 'No fue posible confirmar el evento'
        )
      }

      

      await cargarEventos(true)

    } catch (error) {
      console.error(
        'Error al confirmar evento:',
        error
      )

      setError(error.message)
    }
  }


  // =====================================================
  // EVALUACIONES
  // =====================================================
  const cargarEvaluaciones = async (forzarRecarga = false) => {

    if (moduloActivo === 'evaluaciones' && !forzarRecarga) {
      setModuloActivo(null)
      return
    }

    try {
      setError(null)

      // Cargamos también los eventos para poder elegir únicamente
      // aquellos que ya fueron confirmados.
      const [respuestaEvaluaciones, respuestaEventos] = await Promise.all([
        fetch(`${API_URL}/evaluaciones-impacto/proyecto/1`),
fetch(`${API_URL}/eventos/proyecto/1`)
      ])

      if (!respuestaEvaluaciones.ok) {
        throw new Error('No fue posible obtener las evaluaciones')
      }

      if (!respuestaEventos.ok) {
        throw new Error('No fue posible obtener los eventos')
      }

      const datosEvaluaciones = await respuestaEvaluaciones.json()
      const datosEventos = await respuestaEventos.json()

      setEvaluaciones(
        Array.isArray(datosEvaluaciones) ? datosEvaluaciones : []
      )

      setEventos(
        Array.isArray(datosEventos.eventos) ? datosEventos.eventos : []
      )

      setModuloActivo('evaluaciones')

    } catch (error) {
      console.error(error)
      setError(error.message)
    }
  }

  const registrarEvaluacion = async (e) => {
    e.preventDefault()

    try {
      setError(null)
      setMensajeExito('')

      if (!nuevaEvaluacion.evento_id) {
        throw new Error('Seleccione un evento confirmado para evaluar')
      }

      const respuesta = await fetch(
        `${API_URL}/evaluaciones-impacto`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            evento_id: Number(nuevaEvaluacion.evento_id),
            afecta_plazo: Number(nuevaEvaluacion.afecta_plazo),
            dias_adicionales: Number(nuevaEvaluacion.dias_adicionales),
            impacto_inicio:
              Number(nuevaEvaluacion.afecta_plazo) === 1
                ? nuevaEvaluacion.impacto_inicio
                : null,
            impacto_fin:
              Number(nuevaEvaluacion.afecta_plazo) === 1
                ? nuevaEvaluacion.impacto_fin
                : null,
            afecta_costo: Number(nuevaEvaluacion.afecta_costo),
            monto_adicional:
              Number(nuevaEvaluacion.afecta_costo) === 1
                ? Number(nuevaEvaluacion.monto_adicional)
                : 0,
            justificacion: nuevaEvaluacion.justificacion,
            evaluado_por: Number(nuevaEvaluacion.evaluado_por)
          })
        }
      )

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(
          datos.error || 'No fue posible registrar la evaluación'
        )
      }

      setNuevaEvaluacion({
        evento_id: '',
        afecta_plazo: 1,
        dias_adicionales: 0,
        impacto_inicio: '',
        impacto_fin: '',
        afecta_costo: 0,
        monto_adicional: 0,
        justificacion: '',
        evaluado_por: 1
      })

      setMensajeExito(
        'Evaluación registrada. Revísela y confírmela para incluirla en la próxima proyección.'
      )

      await cargarEvaluaciones(true)

    } catch (error) {
      console.error('Error al registrar evaluación:', error)
      setError(error.message)
    }
  }

  const confirmarEvaluacion = async (idEvaluacion) => {
    try {
      setError(null)
      setMensajeExito('')

      const respuesta = await fetch(
        `${API_URL}/evaluaciones-impacto/${idEvaluacion}/confirmar`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            confirmada_por: 1
          })
        }
      )

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(
          datos.error || 'No fue posible confirmar la evaluación'
        )
      }

      setMensajeExito(
        'Evaluación confirmada. Ya puede formar parte de una nueva proyección.'
      )

      await cargarEvaluaciones(true)

    } catch (error) {
      console.error('Error al confirmar evaluación:', error)
      setError(error.message)
    }
  }

  const generarProyeccion = async () => {
    try {
      setError(null)
      setMensajeExito('')

      const respuesta = await fetch(
        `${API_URL}/proyecciones/proyecto/1`,
        { method: 'POST' }
      )

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(
          datos.error || 'No fue posible generar la proyección'
        )
      }

      // Volvemos a consultar el endpoint de proyección actual para que
      // las tarjetas superiores reflejen inmediatamente el nuevo cálculo.
      const respuestaActual = await fetch(
        `${API_URL}/proyecciones/proyecto/1/actual`
      )

      if (!respuestaActual.ok) {
        throw new Error('La proyección se generó, pero no pudo actualizarse el tablero')
      }

      const datosActuales = await respuestaActual.json()
      setProyeccion(datosActuales.proyeccion)

      setMensajeExito(
        `Nueva proyección generada: ${datos.atraso_efectivo_dias} días de atraso efectivo y costo proyectado de $${formatearDinero(datos.costo_proyectado)}.`
      )

      // Si el usuario abre Historial después, recibirá también este registro.
      setHistorial([])

    } catch (error) {
      console.error('Error al generar proyección:', error)
      setError(error.message)
    }
  }

  // =====================================================
  // HISTORIAL
  // Lo conectaremos en el siguiente paso
  // =====================================================
  const cargarHistorial = async () => {
    
    // Si Historial ya está abierto, lo cerramos
    if (moduloActivo === 'historial') {
      setModuloActivo(null)
      return
    }

    try {
      setError(null)

      const respuesta = await fetch(
        `${API_URL}/proyecciones/proyecto/1`
      )

      if (!respuesta.ok) {
        throw new Error(
          'No fue posible obtener el historial de proyecciones'
        )
      }

      const datos = await respuesta.json()

    

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

        <div className="tarjetas tarjetas-proyeccion">

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
          className={moduloActivo === 'linea-base' ? 'modulo-activo' : ''}
        >
          Línea base
        </button>

        <button
          type="button"
          onClick={cargarEventos}
          className={moduloActivo === 'eventos' ? 'modulo-activo' : ''}
        >
          Eventos
        </button>

        <button
          type="button"
          onClick={cargarEvaluaciones}
           className={moduloActivo === 'evaluaciones' ? 'modulo-activo' : ''}
        >
          Evaluaciones
        </button>

        <button
          type="button"
          onClick={cargarHistorial}
          className={moduloActivo === 'historial' ? 'modulo-activo' : ''}
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


      {mensajeExito && (
        <div className="notificacion-exito">
          {mensajeExito}
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
            </div>
          </div>

          <form className="formulario-evento" onSubmit={registrarEvento}>
            <h3>Registrar nuevo evento</h3>

            <label>
              Tipo de evento
              <select
                value={nuevoEvento.tipo}
                onChange={(e) =>
                  setNuevoEvento({
                    ...nuevoEvento,
                    tipo: e.target.value
                  })
                }
              >
                <option value="">Seleccione un tipo</option>
                <option value="SUMINISTRO">Suministro</option>
                <option value="MAQUINARIA">Maquinaria</option>
                <option value="PERSONAL">Personal</option>
                <option value="CLIMA">Clima</option>
                <option value="OTRO">Otro</option>
              </select>
            </label>

            <label>
              Descripción
              <textarea
                value={nuevoEvento.descripcion}
                onChange={(e) =>
                  setNuevoEvento({
                    ...nuevoEvento,
                    descripcion: e.target.value
                  })
                }
                placeholder="Describa el evento ocurrido"
              />
            </label>

            <label>
              Fecha de inicio
              <input
                type="date"
                value={nuevoEvento.fecha_inicio}
                onChange={(e) =>
                  setNuevoEvento({
                    ...nuevoEvento,
                    fecha_inicio: e.target.value
                  })
                }
              />
            </label>

            <label>
              Fecha de fin
              <input
                type="date"
                value={nuevoEvento.fecha_fin}
                onChange={(e) =>
                  setNuevoEvento({
                    ...nuevoEvento,
                    fecha_fin: e.target.value
                  })
                }
              />
            </label>

            <label>
              Costo observado
              <input
                type="number"
                min="0"
                value={nuevoEvento.costo_observado}
                onChange={(e) =>
                  setNuevoEvento({
                    ...nuevoEvento,
                    costo_observado: e.target.value
                  })
                }
              />
            </label>

            <button type="submit">
              Registrar evento
            </button>

          </form>

          <div className="titulo-seccion">
            <h2>Eventos registrados</h2>

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

                    {evento.estado_registro === 'BORRADOR' ? (
                      <button
                        type="button"
                        className="boton-confirmar"
                        onClick={() => confirmarEvento(evento.id)}
                      >
                        Confirmar evento
                      </button>
                    ) : (
                      <span className="estado">
                        {evento.estado_registro}
                      </span>
                    )}

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

        </section >
      )}

      {/* ============================================= */}
      {/* EVALUACIONES DE IMPACTO */}
      {/* ============================================= */}

      {moduloActivo === 'evaluaciones' && (
        <section className="seccion modulo-contenido">

          <div className="titulo-seccion">
            <div>
              <p className="subtitulo">ANÁLISIS DE IMPACTO</p>
              <h2>Evaluar eventos confirmados</h2>
            </div>

            <span className="actualizacion">
              {evaluaciones.length}{' '}
              {evaluaciones.length === 1 ? 'evaluación' : 'evaluaciones'}
            </span>
          </div>

          <div className="flujo-operativo">
            <span>1. Registrar evento</span>
            <span>2. Confirmar evento</span>
            <span className="paso-activo">3. Evaluar y confirmar impacto</span>
            <span>4. Generar proyección</span>
          </div>

          <form className="formulario-evento" onSubmit={registrarEvaluacion}>
            <h3>Nueva evaluación de impacto</h3>

            <label>
              Evento confirmado
              <select
                value={nuevaEvaluacion.evento_id}
                onChange={(e) =>
                  setNuevaEvaluacion({
                    ...nuevaEvaluacion,
                    evento_id: e.target.value
                  })
                }
                required
              >
                <option value="">Seleccione un evento</option>
                {eventos
                  .filter((evento) => evento.estado_registro === 'CONFIRMADO')
                  .map((evento) => (
                    <option key={evento.id} value={evento.id}>
                      #{evento.id} · {evento.tipo} · {evento.descripcion}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              ¿Afecta el plazo?
              <select
                value={nuevaEvaluacion.afecta_plazo}
                onChange={(e) =>
                  setNuevaEvaluacion({
                    ...nuevaEvaluacion,
                    afecta_plazo: Number(e.target.value)
                  })
                }
              >
                <option value={1}>Sí</option>
                <option value={0}>No</option>
              </select>
            </label>

            {Number(nuevaEvaluacion.afecta_plazo) === 1 && (
              <>
                <label>
                  Días adicionales
                  <input
                    type="number"
                    min="0"
                    value={nuevaEvaluacion.dias_adicionales}
                    onChange={(e) =>
                      setNuevaEvaluacion({
                        ...nuevaEvaluacion,
                        dias_adicionales: e.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Impacto desde
                  <input
                    type="date"
                    value={nuevaEvaluacion.impacto_inicio}
                    onChange={(e) => {
                      const fechaInicio = e.target.value;
                      let diasCalculados = nuevaEvaluacion.dias_adicionales;

                      if (fechaInicio && nuevaEvaluacion.impacto_fin) {
                        const inicio = new Date(`${fechaInicio}T00:00:00`);
                        const fin = new Date(`${nuevaEvaluacion.impacto_fin}T00:00:00`);

                        if (fin >= inicio) {
                          const diferenciaMs = fin - inicio;
                          diasCalculados =
                            Math.floor(diferenciaMs / (1000 * 60 * 60 * 24)) + 1;
                        }
                      }

                      setNuevaEvaluacion({
                        ...nuevaEvaluacion,
                        impacto_inicio: fechaInicio,
                        dias_adicionales: diasCalculados
                      });
                    }}
                    required
                  />
                </label>

                <label>
                  Impacto hasta
                  <input
                    type="date"
                    value={nuevaEvaluacion.impacto_fin}
                    min={nuevaEvaluacion.impacto_inicio}
                    onChange={(e) => {
                      const fechaFin = e.target.value;
                      let diasCalculados = nuevaEvaluacion.dias_adicionales;

                      if (nuevaEvaluacion.impacto_inicio && fechaFin) {
                        const inicio = new Date(`${nuevaEvaluacion.impacto_inicio}T00:00:00`);
                        const fin = new Date(`${fechaFin}T00:00:00`);

                        if (fin >= inicio) {
                          const diferenciaMs = fin - inicio;
                          diasCalculados =
                            Math.floor(diferenciaMs / (1000 * 60 * 60 * 24)) + 1;
                        }
                      }

                      setNuevaEvaluacion({
                        ...nuevaEvaluacion,
                        impacto_fin: fechaFin,
                        dias_adicionales: diasCalculados
                      });
                    }}
                    required
                  />
                </label>
              </>
            )}

            <label>
              ¿Afecta el costo?
              <select
                value={nuevaEvaluacion.afecta_costo}
                onChange={(e) =>
                  setNuevaEvaluacion({
                    ...nuevaEvaluacion,
                    afecta_costo: Number(e.target.value)
                  })
                }
              >
                <option value={0}>No</option>
                <option value={1}>Sí</option>
              </select>
            </label>

            {Number(nuevaEvaluacion.afecta_costo) === 1 && (
              <label>
                Monto adicional
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={nuevaEvaluacion.monto_adicional}
                  onChange={(e) =>
                    setNuevaEvaluacion({
                      ...nuevaEvaluacion,
                      monto_adicional: e.target.value
                    })
                  }
                />
              </label>
            )}

            <label className="campo-ancho">
              Justificación
              <textarea
                value={nuevaEvaluacion.justificacion}
                onChange={(e) =>
                  setNuevaEvaluacion({
                    ...nuevaEvaluacion,
                    justificacion: e.target.value
                  })
                }
                placeholder="Explique el impacto y el criterio utilizado"
              />
            </label>

            <button type="submit">Registrar evaluación</button>
          </form>

          <div className="titulo-seccion separador-evaluaciones">
            <div>
              <p className="subtitulo">DECISIÓN HUMANA</p>
              <h2>Evaluaciones registradas</h2>
            </div>

            <button
              type="button"
              className="boton-proyeccion"
              onClick={generarProyeccion}
              disabled={!evaluaciones.some(
                (evaluacion) => evaluacion.estado_registro === 'CONFIRMADA'
              )}
            >
              Generar nueva proyección
            </button>
          </div>

          <div className="lista-eventos">
            {evaluaciones.length === 0 ? (
              <p>No existen evaluaciones vigentes para este proyecto.</p>
            ) : (
              evaluaciones.map((evaluacion) => (
                <article
                  className="evento-card"
                  key={evaluacion.evaluacion_id}
                >
                  <div className="evento-superior">
                    <span className="subtitulo">
                      {evaluacion.tipo} · Evento #{evaluacion.evento_id}
                    </span>

                    {evaluacion.estado_registro === 'BORRADOR' ? (
                      <button
                        type="button"
                        className="boton-confirmar"
                        onClick={() =>
                          confirmarEvaluacion(evaluacion.evaluacion_id)
                        }
                      >
                        Confirmar evaluación
                      </button>
                    ) : (
                      <span className="estado">CONFIRMADA</span>
                    )}
                  </div>

                  <h3>{evaluacion.descripcion}</h3>

                  <div className="evento-datos">
                    <span>
                      <strong>Afecta plazo:</strong>{' '}
                      {Number(evaluacion.afecta_plazo) === 1 ? 'Sí' : 'No'}
                    </span>

                    <span>
                      <strong>Días adicionales:</strong>{' '}
                      {evaluacion.dias_adicionales}
                    </span>

                    <span>
                      <strong>Afecta costo:</strong>{' '}
                      {Number(evaluacion.afecta_costo) === 1 ? 'Sí' : 'No'}
                    </span>

                    <span>
                      <strong>Monto adicional:</strong>{' '}
                      ${formatearDinero(evaluacion.monto_adicional)}
                    </span>
                  </div>

                  {Number(evaluacion.afecta_plazo) === 1 &&
                    evaluacion.impacto_inicio &&
                    evaluacion.impacto_fin && (
                      <div className="evento-datos">
                        <span>
                          <strong>Impacto desde:</strong>{' '}
                          {formatearFecha(evaluacion.impacto_inicio)}
                        </span>
                        <span>
                          <strong>Impacto hasta:</strong>{' '}
                          {formatearFecha(evaluacion.impacto_fin)}
                        </span>
                      </div>
                    )}

                  {evaluacion.justificacion && (
                    <p className="justificacion">
                      <strong>Justificación:</strong>{' '}
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

      {
        moduloActivo === 'historial' && (
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
        )
      }


    </main >
  )
}

export default App
