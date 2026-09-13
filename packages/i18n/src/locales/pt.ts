import type { LocaleMessages } from '../types.js'

/**
 * Português 语言包 —— key 全集与 zh-CN 完全一致。
 * 标注 LocaleMessages 保证缺 key 编译期报错（locale-completeness 测试再加运行时兜底）。
 */
export const pt: LocaleMessages = {
  // badge (distintivo)
  'badge.notifications': '{count} notificações não lidas',
  // modal (diálogo)
  'modal.close': 'Fechar',
  'modal.ok': 'OK',
  'modal.cancel': 'Cancelar',
  // confirm (diálogo de confirmação imperativo)
  'confirm.ok': 'OK',
  'confirm.cancel': 'Cancelar',
  // empty (estado vazio)
  'empty.noData': 'Sem dados',
  // alert (alerta)
  'alert.close': 'Fechar',
  // drawer (painel lateral)
  'drawer.close': 'Fechar',
  'drawer.ok': 'OK',
  'drawer.cancel': 'Cancelar',
  'drawer.resize': 'Redimensionar painel lateral',
  // message (mensagem global)
  'message.close': 'Fechar',
  // notification (notificação)
  'notification.close': 'Fechar',
  'notification.region': 'Notificações',
  // toast (aviso rápido)
  'toast.close': 'Fechar',
  // snackbar (barra de mensagens)
  'snackbar.close': 'Fechar',
  // popconfirm (confirmação pop)
  'popconfirm.ok': 'OK',
  'popconfirm.cancel': 'Cancelar',
  // select (seletor)
  'select.search': 'Pesquisar opções',
  'select.placeholder': 'Selecionar',
  'select.empty': 'Sem dados',
  'select.noMatch': 'Sem opções correspondentes',
  'select.remove': 'Remover {label}',
  'select.create': 'Criar {label}',
  // cascader (seleção em cascata)
  'cascader.placeholder': 'Selecionar',
  // tree-select (seletor de árvore)
  'treeSelect.placeholder': 'Selecionar',
  'treeSelect.empty': 'Sem dados',
  'treeSelect.join': ', ',
  'treeSelect.andMore': 'e mais {count}',
  // auto-complete (autocompletar)
  'autoComplete.noMatch': 'Sem resultados correspondentes',
  // combobox (o campo de entrada é o controle: filtro ao digitar + seleção de valor)
  'combobox.empty': 'Sem opções',
  'combobox.noMatch': 'Sem opções correspondentes',
  'combobox.loading': 'Carregando…',
  // input (campo de entrada)
  'input.clear': 'Limpar',
  'input.defaultLabel': 'Campo de entrada',
  'textarea.defaultLabel': 'Campo de texto multilinha',
  'input.showPassword': 'Mostrar senha',
  'input.hidePassword': 'Ocultar senha',
  // mentions (menções)
  'mentions.defaultLabel': 'Campo de menções',
  'mentions.noMatch': 'Sem menções correspondentes',
  // input-number (campo numérico)
  'inputNumber.increase': 'Aumentar',
  'inputNumber.decrease': 'Reduzir',
  'inputNumber.defaultLabel': 'Campo numérico',
  // slider (controle deslizante)
  'slider.valueLabel': 'Controle deslizante',
  'slider.minLabel': 'Mínimo',
  'slider.maxLabel': 'Máximo',
  // rate (avaliação)
  'rate.rate': 'Avaliação',
  // form (validação de formulário)
  'form.validationFailed': 'Erro de validação',
  // tour (tour guiado)
  'tour.skip': 'Pular',
  'tour.prev': 'Anterior',
  'tour.next': 'Próximo',
  'tour.finish': 'Concluir',
  'tour.close': 'Fechar',
  'tour.dontShowAgain': 'Não mostrar novamente',
  'tour.hint': 'Dica',
  'tour.hintGotIt': 'Entendido',
  'tour.progress': 'Progresso do tour',
  // steps (etapas)
  'steps.prev': 'Anterior',
  'steps.next': 'Próximo',
  'steps.optional': 'Opcional',
  // anchor (navegação por âncoras)
  'anchor.nav': 'Navegação por âncoras',
  // breadcrumb (trilha de navegação)
  'breadcrumb.nav': 'Trilha de navegação',
  'breadcrumb.expand': 'Expandir itens recolhidos da trilha',
  // back-top (voltar ao topo)
  'backTop.backToTop': 'Voltar ao topo',
  // page-header (cabeçalho de página)
  'pageHeader.back': 'Voltar',
  // splitter (painéis divididos)
  'splitter.adjust': 'Ajustar painel',
  'splitter.collapse': 'Recolher painel',
  'splitter.expand': 'Expandir painel',
  // layout (contêiner de layout)
  'layout.sider': 'Barra lateral',
  // sidebar (barra lateral recolhível)
  'sidebar.nav': 'Navegação lateral',
  'sidebar.toggle': 'Recolher barra lateral',
  'sidebar.expand': 'Expandir barra lateral',
  'sidebar.openMenu': 'Abrir barra lateral',
  'sidebar.closeMenu': 'Fechar barra lateral',
  'sidebar.resize': 'Ajustar barra lateral',
  // float-button (botão flutuante)
  'floatButton.action': 'Ações rápidas',
  // toggle-group (grupo de alternância)
  'toggleGroup.group': 'Grupo de alternância',
  // speed-dial (botões de ação flutuantes)
  'speedDial.actions': 'Ações',
  // pagination (paginação)
  'pagination.nav': 'Paginação',
  'pagination.prev': 'Página anterior',
  'pagination.next': 'Próxima página',
  'pagination.first': 'Primeira página',
  'pagination.last': 'Última página',
  'pagination.page': 'Página {page}',
  'pagination.total': 'Total de {total}',
  'pagination.sizes': 'Itens por página',
  'pagination.sizePerPage': '{size} por página',
  'pagination.goto': 'Ir para',
  'pagination.pageClassifier': 'Página',
  'pagination.jumperInput': 'Ir para a página',
  'pagination.jumpForward': 'Saltar para frente',
  'pagination.jumpBackward': 'Saltar para trás',
  'pagination.more': 'Mais',
  // table (tabela)
  'table.selectAll': 'Selecionar tudo',
  'table.loading': 'Carregando…',
  'table.empty': 'Sem dados',
  'table.selectRow': 'Selecionar linha {key}',
  'table.expand': 'Expandir/Recolher',
  'table.summary': 'Total',
  'table.edit': 'Editar',
  'table.save': 'Salvar',
  'table.cancel': 'Cancelar',
  'table.editCell': 'Editar {column} (linha {key})',
  'table.editHint': 'Clique duplo para editar',
  'table.filter': 'Filtrar',
  'table.clear': 'Limpar',
  // list (lista)
  'list.empty': 'Sem dados',
  // tree (árvore)
  'tree.expand': 'Expandir/Recolher',
  'tree.select': 'Selecionar {label}',
  'tree.loading': 'Carregando…',
  // timeline (linha do tempo)
  'timeline.pending': 'Em breve',
  // carousel (carrossel)
  'carousel.prev': 'Slide anterior',
  'carousel.next': 'Próximo slide',
  'carousel.dot': 'Slide {index}',
  'carousel.pause': 'Pausar reprodução automática',
  'carousel.play': 'Retomar reprodução automática',
  // image (imagem)
  'image.loading': 'Carregando…',
  'image.loadFailed': 'Falha ao carregar a imagem',
  'image.defaultAlt': 'Imagem',
  // image-group (galeria; nome acessível aria do grupo de visualização compartilhado)
  'imageGroup.group': 'Galeria de imagens',
  // avatar (avatar)
  'avatar.defaultAlt': 'Avatar',
  'avatar.changeAvatar': 'Alterar avatar',
  'avatar.foldedMembers': 'Todos os membros',
  // typography (tipografia)
  'typography.copy': 'Copiar',
  // tag (tag)
  'tag.close': 'Fechar',
  // tag-group (grupo de tags)
  'tagGroup.group': 'Grupo de tags',
  // tabs (abas)
  'tabs.close': 'Fechar',
  'tabs.ctxClose': 'Fechar',
  'tabs.ctxNew': 'Nova',
  'tabs.ctxCloseOthers': 'Fechar outras',
  'tabs.ctxCloseLeft': 'Fechar todas à esquerda',
  'tabs.ctxCloseRight': 'Fechar todas à direita',
  'tabs.ctxCloseAll': 'Fechar todas',
  'tabs.add': 'Adicionar aba',
  'tabs.newTab': 'Nova aba',
  'tabs.scrollPrev': 'Rolar abas para trás',
  'tabs.scrollNext': 'Rolar abas para frente',
  'tabs.more': 'Mais abas',
  // button-group (grupo de botões)
  'buttonGroup.group': 'Grupo de botões',
  // compact (contêiner compacto)
  'compact.group': 'Grupo compacto',
  // loading (estado de carregamento, uso geral)
  'loading.loading': 'Carregando…',
  // calendar (calendário)
  'calendar.today': 'Hoje',
  'calendar.prevMonth': 'Mês anterior',
  'calendar.nextMonth': 'Próximo mês',
  'calendar.prevYear': 'Ano anterior',
  'calendar.nextYear': 'Próximo ano',
  // date-picker (seletor de data)
  'datePicker.placeholder': 'Selecionar data',
  'datePicker.confirm': 'OK',
  'datePicker.join': ', ',
  'datePicker.shortcutToday': 'Hoje',
  'datePicker.shortcutThisWeek': 'Esta semana',
  'datePicker.shortcutThisMonth': 'Este mês',
  'datePicker.shortcutThisYear': 'Este ano',
  // dropdown (menu suspenso)
  'dropdown.openMenu': 'Abrir menu',
  // popover (cartão flutuante)
  'popover.close': 'Fechar',
  // menu (menu)
  'menu.more': 'Mais itens de menu',
  // time-picker (seletor de hora)
  'timePicker.placeholder': 'Selecionar hora',
  'timePicker.hour': 'Hora',
  'timePicker.minute': 'Minuto',
  'timePicker.second': 'Segundo',
  // upload (envio de arquivos)
  'upload.select': 'Selecionar arquivos',
  'upload.drag': 'Arraste arquivos aqui ou clique para selecionar',
  'upload.remove': 'Remover {name}',
  'upload.upload': 'Enviar',
  'upload.empty': 'Sem arquivos',
  'upload.maxCount': 'Até {max} arquivos',
  'upload.preview': 'Visualizar {name}',
  'upload.previewDialog': 'Visualização de arquivo',
  'upload.closePreview': 'Fechar visualização',
  // transfer (transferência)
  'transfer.source': 'Lista de origem',
  'transfer.target': 'Lista selecionada',
  'transfer.toRight': 'Mover para a direita',
  'transfer.toLeft': 'Mover para a esquerda',
  'transfer.selectAll': 'Selecionar tudo',
  'transfer.search': 'Pesquisar',
  'transfer.empty': 'Sem dados',
  'transfer.noMatch': 'Nenhuma correspondência encontrada',
  // color-picker (seletor de cores)
  'colorPicker.label': 'Seletor de cores',
  'colorPicker.preset': 'Cores predefinidas',
  'colorPicker.hue': 'Matiz',
  'colorPicker.saturation': 'Saturação',
  'colorPicker.brightness': 'Brilho',
  'colorPicker.red': 'Vermelho',
  'colorPicker.green': 'Verde',
  'colorPicker.blue': 'Azul',
  // pin-input (código de verificação por dígitos)
  'pinInput.group': 'Código de verificação',
  'pinInput.digit': 'Dígito {position}',
  // dynamic-input (lista dinâmica)
  'dynamicInput.add': 'Adicionar',
  'dynamicInput.remove': 'Remover',
  // dynamic-tags (tags dinâmicas)
  'dynamicTags.inputLabel': 'Adicionar tag',
  'dynamicTags.remove': 'Remover {label}',
  'dynamicTags.duplicate': 'A tag já existe',
  // editable (edição no lugar)
  'editable.edit': 'Editar',
  'editable.submit': 'OK',
  'editable.cancel': 'Cancelar',
  // ellipsis (reticências de texto)
  'ellipsis.expand': 'Expandir',
  'ellipsis.collapse': 'Recolher',
  // chart (gráficos)
  'chart.line': 'Gráfico de linhas',
  'chart.bar': 'Gráfico de barras',
  'chart.pie': 'Gráfico de pizza',
  'chart.area': 'Gráfico de área',
  'chart.donut': 'Gráfico de rosca',
  'chart.stacked-bar': 'Gráfico de barras empilhadas',
  'chart.empty': 'Sem dados',
  // code (bloco de código)
  'code.copy': 'Copiar',
  'code.copied': 'Copiado',
  // image (camada de visualização de imagem)
  'image.preview.close': 'Fechar visualização',
  'image.preview.zoomIn': 'Ampliar',
  'image.preview.zoomOut': 'Reduzir',
  'image.preview.rotate': 'Girar',
  'image.preview.download': 'Baixar',
  'image.preview.alt': 'Visualização de imagem',
  'image.preview.flipX': 'Inverter horizontalmente',
  'image.preview.flipY': 'Inverter verticalmente',
  'image.preview.prev': 'Imagem anterior',
  'image.preview.next': 'Próxima imagem',
  'image.preview.progress': 'Imagem {index} de {total}',
  // qrcode (código QR)
  'qrcode.image': 'Código QR',
  'qrcode.empty': 'Sem conteúdo',
  'qrcode.tooLong': 'O conteúdo é longo demais, encurte e tente novamente',
  'qrcode.expired': 'O código QR expirou',
  'qrcode.refresh': 'Atualizar',
  'qrcode.loading': 'Carregando…',
  'qrcode.scanned': 'Escaneado',
  // command (paleta de comandos)
  'command.placeholder': 'Pesquisar comandos…',
  'command.empty': 'Sem comandos correspondentes',
  'command.search': 'Pesquisar comandos',
  'command.label': 'Paleta de comandos',
  'command.loading': 'Carregando comandos…',
  'command.noResults': 'Nenhum comando encontrado para "{query}"',
  'command.recent': 'Recentes',
  'command.back': 'Voltar',
  'command.footer.navigate': 'Navegar',
  'command.footer.select': 'Selecionar',
  'command.footer.close': 'Fechar',
  'command.multiRun': 'Executar {n}',
  // menubar (barra de menus do aplicativo)
  'menubar.label': 'Barra de menus',
  'menubar.menu': 'Menu',
  'menubar.more': 'Mais itens de menu',
  // navigation-menu (navegação multinível)
  'navigationMenu.label': 'Navegação',
  'navigationMenu.back': 'Voltar',
  // toolbar (barra de ferramentas)
  'toolbar.label': 'Barra de ferramentas',
  'toolbar.more': 'Mais ferramentas',
  'toolbar.toggleGroup': 'Grupo de alternância',
  'toolbar.input': 'Campo da barra de ferramentas',
  'toolbar.item': 'Item da barra de ferramentas',
  // log (fluxo de logs)
  'log.empty': 'Sem logs',
  'log.no-match': 'Sem logs correspondentes',
  // theme-editor (editor de temas)
  'themeEditor.label': 'Editor de temas',
  'themeEditor.export': 'Exportar JSON do tema',
  'themeEditor.search': 'Pesquisar tokens',
  'themeEditor.group.color': 'Cores',
  'themeEditor.group.fontSize': 'Tamanho da fonte',
  'themeEditor.group.space': 'Espaçamento',
  'themeEditor.group.radius': 'Raio',
  'themeEditor.group.controlHeight': 'Altura do controle',
  'themeEditor.group.custom': 'Outros',
  // bottom-navigation (navegação inferior)
  'bottomNavigation.nav': 'Navegação inferior',
  'upload.retry': 'Tentar novamente {name}',
  'upload.cancelUpload': 'Cancelar envio de {name}',
  'transfer.count': '{selected}/{total}',
  'dynamicTags.patternMismatch': 'Formato inválido',
  'dynamicInput.moveUp': 'Mover para cima',
  'dynamicInput.moveDown': 'Mover para baixo',
  'timePicker.now': 'Agora',
  'datePicker.shortcutThisQuarter': 'Este trimestre',
}
