# Guía de pruebas: Inspecciones

Usar una base de pruebas y una cuenta de transacción. No modificar registros reales.

1. Registrar un lote y abrir su detalle. Iniciar la primera inspección: debe recibir A sin capturar la secuencia.
2. Intentar iniciar otra sin terminar A: debe pedir completar A.
3. Capturar algunos parámetros con un equipo activo y con todos sus límites. Guardar y volver a abrir: debe conservar resultados y mostrar la inspección incompleta.
4. Completar los diez parámetros de ambos equipos: debe mostrarla completa. Un resultado fuera de límites debe mostrar desviación y permitir guardar.
5. Intentar una reinspección sin motivo: debe rechazarla. Con motivo de falla debe crear B y conservar A.
6. Intentar usar un equipo inactivo, de baja, del tipo incorrecto o sin límites completos: debe rechazarlo.
7. Con una cuenta de consulta, intentar acceder a captura y guardar: debe denegar acceso. Sin sesión debe solicitar inicio de sesión.
8. Con una inspección certificada en la base de pruebas, intentar guardar: debe rechazar cambios. La emisión de certificados todavía corresponde a otro módulo.
9. Iniciar una inspección del mismo lote simultáneamente desde dos sesiones: una debe crearse y la otra pedir actualizar; nunca deben abrirse dos inspecciones nuevas por el mismo intento.
10. Revisar en la base de pruebas el registro de auditoría: usuario, inspección, secuencia y cambios guardados. La pantalla general de Bitácora sigue pendiente.

Registrar resultado, fecha y evidencia de cada paso. Esta guía no implica que las pruebas manuales contra Neon ya se hayan ejecutado.
