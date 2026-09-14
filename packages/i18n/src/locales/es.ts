import type { LocaleMessages } from '../types.js'

/**
 * Español 语言包 —— key 全集与 zh-CN 完全一致。
 * 标注 LocaleMessages 保证缺 key 编译期报错（locale-completeness 测试再加运行时兜底）。
 */
export const es: LocaleMessages = {
  // badge (insignia)
  'badge.notifications': '{count} notificaciones sin leer',
  // modal (diálogo)
  'modal.close': 'Cerrar',
  'modal.ok': 'Aceptar',
  'modal.cancel': 'Cancelar',
  // confirm (diálogo de confirmación imperativo)
  'confirm.ok': 'Aceptar',
  'confirm.cancel': 'Cancelar',
  // empty (estado vacío)
  'empty.noData': 'Sin datos',
  // alert (alerta)
  'alert.close': 'Cerrar',
  // drawer (panel lateral)
  'drawer.close': 'Cerrar',
  'drawer.ok': 'Aceptar',
  'drawer.cancel': 'Cancelar',
  'drawer.resize': 'Redimensionar panel lateral',
  // message (mensaje global)
  'message.close': 'Cerrar',
  // notification (notificación)
  'notification.close': 'Cerrar',
  'notification.region': 'Notificaciones',
  // toast (aviso breve)
  'toast.close': 'Cerrar',
  // snackbar (barra de mensajes)
  'snackbar.close': 'Cerrar',
  // popconfirm (confirmación emergente)
  'popconfirm.ok': 'Aceptar',
  'popconfirm.cancel': 'Cancelar',
  // select (selector)
  'select.search': 'Buscar opciones',
  'select.placeholder': 'Seleccionar',
  'select.empty': 'Sin datos',
  'select.noMatch': 'Sin opciones coincidentes',
  'select.remove': 'Quitar {label}',
  'select.create': 'Crear {label}',
  // cascader (selección en cascada)
  'cascader.placeholder': 'Seleccionar',
  // tree-select (selector de árbol)
  'treeSelect.placeholder': 'Seleccionar',
  'treeSelect.empty': 'Sin datos',
  'treeSelect.join': ', ',
  'treeSelect.andMore': 'y {count} más',
  // auto-complete (autocompletado)
  'autoComplete.noMatch': 'Sin resultados coincidentes',
  // combobox (el campo de entrada es el control: filtrado al escribir + selección de valor)
  'combobox.empty': 'Sin opciones',
  'combobox.noMatch': 'Sin opciones coincidentes',
  'combobox.loading': 'Cargando…',
  // input (campo de entrada)
  'input.clear': 'Limpiar',
  'input.defaultLabel': 'Campo de entrada',
  'textarea.defaultLabel': 'Campo de texto multilínea',
  'input.showPassword': 'Mostrar contraseña',
  'input.hidePassword': 'Ocultar contraseña',
  // mentions (menciones)
  'mentions.defaultLabel': 'Campo de menciones',
  'mentions.noMatch': 'Sin menciones coincidentes',
  // input-number (campo numérico)
  'inputNumber.increase': 'Aumentar',
  'inputNumber.decrease': 'Reducir',
  'inputNumber.defaultLabel': 'Campo numérico',
  // slider (control deslizante)
  'slider.valueLabel': 'Control deslizante',
  'slider.minLabel': 'Mínimo',
  'slider.maxLabel': 'Máximo',
  // rate (valoración)
  'rate.rate': 'Valoración',
  // form (validación de formulario)
  'form.validationFailed': 'Error de validación',
  // tour (recorrido guiado)
  'tour.skip': 'Omitir',
  'tour.prev': 'Anterior',
  'tour.next': 'Siguiente',
  'tour.finish': 'Finalizar',
  'tour.close': 'Cerrar',
  'tour.dontShowAgain': 'No volver a mostrar',
  'tour.hint': 'Sugerencia',
  'tour.hintGotIt': 'Entendido',
  'tour.progress': 'Progreso del tour',
  // steps (pasos)
  'steps.prev': 'Anterior',
  'steps.next': 'Siguiente',
  'steps.optional': 'Opcional',
  // anchor (navegación por anclas)
  'anchor.nav': 'Navegación por anclas',
  // breadcrumb (migas de pan)
  'breadcrumb.nav': 'Migas de pan',
  'breadcrumb.expand': 'Expandir migas de pan contraídas',
  // back-top (volver arriba)
  'backTop.backToTop': 'Volver arriba',
  // page-header (encabezado de página)
  'pageHeader.back': 'Volver',
  // splitter (paneles divididos)
  'splitter.adjust': 'Ajustar panel',
  'splitter.collapse': 'Contraer panel',
  'splitter.expand': 'Expandir panel',
  // layout (contenedor de diseño)
  'layout.sider': 'Barra lateral',
  // sidebar (barra lateral plegable)
  'sidebar.nav': 'Navegación lateral',
  'sidebar.toggle': 'Contraer barra lateral',
  'sidebar.expand': 'Expandir barra lateral',
  'sidebar.openMenu': 'Abrir barra lateral',
  'sidebar.closeMenu': 'Cerrar barra lateral',
  'sidebar.resize': 'Ajustar barra lateral',
  // float-button (botón flotante)
  'floatButton.action': 'Acciones rápidas',
  // toggle-group (grupo de alternancia)
  'toggleGroup.group': 'Grupo de alternancia',
  // speed-dial (botones de acción flotantes)
  'speedDial.actions': 'Acciones',
  // pagination (paginación)
  'pagination.nav': 'Paginación',
  'pagination.prev': 'Página anterior',
  'pagination.next': 'Página siguiente',
  'pagination.first': 'Primera página',
  'pagination.last': 'Última página',
  'pagination.page': 'Página {page}',
  'pagination.total': 'Total {total}',
  'pagination.sizes': 'Elementos por página',
  'pagination.sizePerPage': '{size} por página',
  'pagination.goto': 'Ir a',
  'pagination.pageClassifier': 'Página',
  'pagination.jumperInput': 'Ir a la página',
  'pagination.jumpForward': 'Saltar hacia adelante',
  'pagination.jumpBackward': 'Saltar hacia atrás',
  'pagination.more': 'Más',
  // table (tabla)
  'table.selectAll': 'Seleccionar todo',
  'table.loading': 'Cargando…',
  'table.empty': 'Sin datos',
  'table.selectRow': 'Seleccionar fila {key}',
  'table.expand': 'Expandir/Contraer',
  'table.summary': 'Total',
  'table.edit': 'Editar',
  'table.save': 'Guardar',
  'table.cancel': 'Cancelar',
  'table.editCell': 'Editar {column} (fila {key})',
  'table.editHint': 'Doble clic para editar',
  'table.filter': 'Filtrar',
  'table.clear': 'Limpiar',
  // list (lista)
  'list.empty': 'Sin datos',
  // tree (árbol)
  'tree.expand': 'Expandir/Contraer',
  'tree.select': 'Seleccionar {label}',
  'tree.loading': 'Cargando…',
  // timeline (línea de tiempo)
  'timeline.pending': 'Próximamente',
  // carousel (carrusel)
  'carousel.prev': 'Diapositiva anterior',
  'carousel.next': 'Diapositiva siguiente',
  'carousel.dot': 'Diapositiva {index}',
  'carousel.pause': 'Pausar reproducción automática',
  'carousel.play': 'Reanudar reproducción automática',
  // image (imagen)
  'image.loading': 'Cargando…',
  'image.loadFailed': 'Error al cargar la imagen',
  'image.defaultAlt': 'Imagen',
  // image-group (galería; nombre accesible aria del grupo de vista previa compartido)
  'imageGroup.group': 'Galería de imágenes',
  // avatar (avatar)
  'avatar.defaultAlt': 'Avatar',
  'avatar.changeAvatar': 'Cambiar avatar',
  'avatar.foldedMembers': 'Todos los miembros',
  // typography (tipografía)
  'typography.copy': 'Copiar',
  // tag (etiqueta)
  'tag.close': 'Cerrar',
  // tag-group (grupo de etiquetas)
  'tagGroup.group': 'Grupo de etiquetas',
  // tabs (pestañas)
  'tabs.close': 'Cerrar',
  'tabs.ctxClose': 'Cerrar',
  'tabs.ctxNew': 'Nueva',
  'tabs.ctxCloseOthers': 'Cerrar otras',
  'tabs.ctxCloseLeft': 'Cerrar todas a la izquierda',
  'tabs.ctxCloseRight': 'Cerrar todas a la derecha',
  'tabs.ctxCloseAll': 'Cerrar todas',
  'tabs.add': 'Añadir pestaña',
  'tabs.newTab': 'Nueva pestaña',
  'tabs.scrollPrev': 'Desplazar pestañas hacia atrás',
  'tabs.scrollNext': 'Desplazar pestañas hacia adelante',
  'tabs.more': 'Más pestañas',
  // button-group (grupo de botones)
  'buttonGroup.group': 'Grupo de botones',
  // compact (contenedor compacto)
  'compact.group': 'Grupo compacto',
  // loading (estado de carga, uso general)
  'loading.loading': 'Cargando…',
  // calendar (calendario)
  'calendar.today': 'Hoy',
  'calendar.prevMonth': 'Mes anterior',
  'calendar.nextMonth': 'Mes siguiente',
  'calendar.prevYear': 'Año anterior',
  'calendar.nextYear': 'Año siguiente',
  // date-picker (selector de fecha)
  'datePicker.placeholder': 'Seleccionar fecha',
  'datePicker.confirm': 'Aceptar',
  'datePicker.join': ', ',
  'datePicker.shortcutToday': 'Hoy',
  'datePicker.shortcutThisWeek': 'Esta semana',
  'datePicker.shortcutThisMonth': 'Este mes',
  'datePicker.shortcutThisYear': 'Este año',
  // dropdown (menú desplegable)
  'dropdown.openMenu': 'Abrir menú',
  // popover (tarjeta emergente)
  'popover.close': 'Cerrar',
  // menu (menú)
  'menu.more': 'Más elementos de menú',
  // time-picker (selector de hora)
  'timePicker.placeholder': 'Seleccionar hora',
  'timePicker.hour': 'Hora',
  'timePicker.minute': 'Minuto',
  'timePicker.second': 'Segundo',
  // upload (subida de archivos)
  'upload.select': 'Seleccionar archivos',
  'upload.drag': 'Arrastra archivos aquí o haz clic para seleccionar',
  'upload.remove': 'Quitar {name}',
  'upload.upload': 'Subir',
  'upload.empty': 'Sin archivos',
  'upload.maxCount': 'Hasta {max} archivos',
  'upload.preview': 'Vista previa de {name}',
  'upload.previewDialog': 'Vista previa de archivo',
  'upload.closePreview': 'Cerrar vista previa',
  // transfer (transferencia)
  'transfer.source': 'Lista de origen',
  'transfer.target': 'Lista seleccionada',
  'transfer.toRight': 'Mover a la derecha',
  'transfer.toLeft': 'Mover a la izquierda',
  'transfer.selectAll': 'Seleccionar todo',
  'transfer.search': 'Buscar',
  'transfer.empty': 'Sin datos',
  'transfer.noMatch': 'No se encontraron coincidencias',
  // color-picker (selector de color)
  'colorPicker.label': 'Selector de color',
  'colorPicker.preset': 'Colores predefinidos',
  'colorPicker.hue': 'Tono',
  'colorPicker.saturation': 'Saturación',
  'colorPicker.brightness': 'Brillo',
  'colorPicker.red': 'Rojo',
  'colorPicker.green': 'Verde',
  'colorPicker.blue': 'Azul',
  // pin-input (código de verificación por dígitos)
  'pinInput.group': 'Código de verificación',
  'pinInput.digit': 'Dígito {position}',
  // dynamic-input (lista dinámica)
  'dynamicInput.add': 'Añadir',
  'dynamicInput.remove': 'Eliminar',
  // dynamic-tags (etiquetas dinámicas)
  'dynamicTags.inputLabel': 'Añadir etiqueta',
  'dynamicTags.remove': 'Quitar {label}',
  'dynamicTags.duplicate': 'La etiqueta ya existe',
  // editable (edición en el lugar)
  'editable.edit': 'Editar',
  'editable.submit': 'Aceptar',
  'editable.cancel': 'Cancelar',
  // ellipsis (elipsis de texto)
  'ellipsis.expand': 'Expandir',
  'ellipsis.collapse': 'Contraer',
  // chart (gráficos)
  'chart.line': 'Gráfico de líneas',
  'chart.bar': 'Gráfico de barras',
  'chart.pie': 'Gráfico circular',
  'chart.area': 'Gráfico de área',
  'chart.donut': 'Gráfico de anillo',
  'chart.stacked-bar': 'Gráfico de barras apiladas',
  'chart.empty': 'Sin datos',
  // code (bloque de código)
  'code.copy': 'Copiar',
  'code.copied': 'Copiado',
  // image (capa de vista previa de imagen)
  'image.preview.close': 'Cerrar vista previa',
  'image.preview.zoomIn': 'Ampliar',
  'image.preview.zoomOut': 'Reducir',
  'image.preview.rotate': 'Rotar',
  'image.preview.download': 'Descargar',
  'image.preview.alt': 'Vista previa de imagen',
  'image.preview.flipX': 'Voltear horizontalmente',
  'image.preview.flipY': 'Voltear verticalmente',
  'image.preview.prev': 'Imagen anterior',
  'image.preview.next': 'Imagen siguiente',
  'image.preview.progress': 'Imagen {index} de {total}',
  // qrcode (código QR)
  'qrcode.image': 'Código QR',
  'qrcode.empty': 'Sin contenido',
  'qrcode.tooLong': 'El contenido es demasiado largo, acórtalo e inténtalo de nuevo',
  'qrcode.expired': 'El código QR ha caducado',
  'qrcode.refresh': 'Actualizar',
  'qrcode.loading': 'Cargando…',
  'qrcode.scanned': 'Escaneado',
  // command (paleta de comandos)
  'command.placeholder': 'Buscar comandos…',
  'command.empty': 'Sin comandos coincidentes',
  'command.search': 'Buscar comandos',
  'command.label': 'Paleta de comandos',
  'command.loading': 'Cargando comandos…',
  'command.noResults': 'No se encontraron comandos para "{query}"',
  'command.recent': 'Recientes',
  'command.back': 'Volver',
  'command.footer.navigate': 'Navegar',
  'command.footer.select': 'Seleccionar',
  'command.footer.close': 'Cerrar',
  'command.multiRun': 'Ejecutar {n}',
  // menubar (barra de menú de la aplicación)
  'menubar.label': 'Barra de menú',
  'menubar.menu': 'Menú',
  'menubar.more': 'Más elementos de menú',
  // navigation-menu (navegación multinivel)
  'navigationMenu.label': 'Navegación',
  'navigationMenu.back': 'Volver',
  // toolbar (barra de herramientas)
  'toolbar.label': 'Barra de herramientas',
  'toolbar.more': 'Más herramientas',
  'toolbar.toggleGroup': 'Grupo de alternancia',
  'toolbar.input': 'Campo de la barra de herramientas',
  'toolbar.item': 'Elemento de la barra de herramientas',
  // app-bar (barra de aplicación)
  'appBar.label': 'Barra de aplicación',
  'appBar.menu': 'Menú principal',
  'appBar.more': 'Más acciones',
  'appBar.item': 'Acción',
  // log (flujo de registros)
  'log.empty': 'Sin registros',
  'log.no-match': 'Sin registros coincidentes',
  // theme-editor (editor de temas)
  'themeEditor.label': 'Editor de temas',
  'themeEditor.export': 'Exportar JSON del tema',
  'themeEditor.search': 'Buscar tokens',
  'themeEditor.group.color': 'Colores',
  'themeEditor.group.fontSize': 'Tamaño de fuente',
  'themeEditor.group.space': 'Espaciado',
  'themeEditor.group.radius': 'Radio',
  'themeEditor.group.controlHeight': 'Altura del control',
  'themeEditor.group.custom': 'Otros',
  // bottom-navigation (navegación inferior)
  'bottomNavigation.nav': 'Navegación inferior',
  'upload.retry': 'Reintentar {name}',
  'upload.cancelUpload': 'Cancelar subida de {name}',
  'transfer.count': '{selected}/{total}',
  'dynamicTags.patternMismatch': 'Formato no válido',
  'dynamicInput.moveUp': 'Subir',
  'dynamicInput.moveDown': 'Bajar',
  'timePicker.now': 'Ahora',
  'datePicker.shortcutThisQuarter': 'Este trimestre',
}
