import type { LocaleMessages } from '../types.js'

/**
 * Русский 语言包 —— key 全集与 zh-CN 完全一致。
 * 标注 LocaleMessages 保证缺 key 编译期报错（locale-completeness 测试再加运行时兜底）。
 */
export const ru: LocaleMessages = {
  // badge (значок)
  'badge.notifications': 'Непрочитанных уведомлений: {count}',
  // modal (диалоговое окно)
  'modal.close': 'Закрыть',
  'modal.ok': 'ОК',
  'modal.cancel': 'Отмена',
  // confirm (императивное окно подтверждения)
  'confirm.ok': 'ОК',
  'confirm.cancel': 'Отмена',
  // empty (заглушка пустого состояния)
  'empty.noData': 'Нет данных',
  // alert (предупреждение)
  'alert.close': 'Закрыть',
  // drawer (выдвижная панель)
  'drawer.close': 'Закрыть',
  'drawer.ok': 'ОК',
  'drawer.cancel': 'Отмена',
  'drawer.resize': 'Изменить размер панели',
  // message (глобальное сообщение)
  'message.close': 'Закрыть',
  // notification (уведомление)
  'notification.close': 'Закрыть',
  'notification.region': 'Уведомления',
  // toast (лёгкое уведомление)
  'toast.close': 'Закрыть',
  // snackbar (панель сообщений)
  'snackbar.close': 'Закрыть',
  // popconfirm (всплывающее подтверждение)
  'popconfirm.ok': 'ОК',
  'popconfirm.cancel': 'Отмена',
  // select (селектор)
  'select.search': 'Поиск вариантов',
  'select.placeholder': 'Выберите значение',
  'select.empty': 'Нет данных',
  'select.noMatch': 'Нет подходящих вариантов',
  'select.remove': 'Удалить {label}',
  'select.create': 'Создать {label}',
  // cascader (каскадный выбор)
  'cascader.placeholder': 'Выберите значение',
  // treeSelect (выбор из дерева)
  'treeSelect.placeholder': 'Выберите значение',
  'treeSelect.empty': 'Нет данных',
  'treeSelect.join': ', ',
  'treeSelect.andMore': 'и ещё {count}',
  // autoComplete (автодополнение)
  'autoComplete.noMatch': 'Ничего не найдено',
  // combobox (поле со списком: поле ввода и есть контрол, фильтрация вводом + выбор значения)
  'combobox.empty': 'Нет вариантов',
  'combobox.noMatch': 'Нет подходящих вариантов',
  'combobox.loading': 'Загрузка…',
  // input (поле ввода)
  'input.clear': 'Очистить',
  'input.defaultLabel': 'Поле ввода',
  'textarea.defaultLabel': 'Текстовое поле',
  'input.showPassword': 'Показать пароль',
  'input.hidePassword': 'Скрыть пароль',
  // mentions (упоминания)
  'mentions.defaultLabel': 'Поле упоминаний',
  'mentions.noMatch': 'Нет подходящих упоминаний',
  // inputNumber (числовое поле)
  'inputNumber.increase': 'Увеличить',
  'inputNumber.decrease': 'Уменьшить',
  'inputNumber.defaultLabel': 'Числовое поле',
  // slider (ползунок)
  'slider.valueLabel': 'Ползунок',
  'slider.minLabel': 'Минимум',
  'slider.maxLabel': 'Максимум',
  // rate (оценка)
  'rate.rate': 'Оценка',
  // form (валидация формы)
  'form.validationFailed': 'Проверка не пройдена',
  // tour (обзор интерфейса)
  'tour.skip': 'Пропустить',
  'tour.prev': 'Назад',
  'tour.next': 'Далее',
  'tour.finish': 'Готово',
  'tour.close': 'Закрыть',
  'tour.dontShowAgain': 'Больше не показывать',
  'tour.hint': 'Подсказка',
  'tour.hintGotIt': 'Понятно',
  'tour.progress': 'Прогресс обзора',
  // steps (шаги)
  'steps.prev': 'Назад',
  'steps.next': 'Далее',
  'steps.optional': 'Необязательно',
  // anchor (навигация по якорям)
  'anchor.nav': 'Навигация по якорям',
  // breadcrumb (навигационная цепочка)
  'breadcrumb.nav': 'Навигационная цепочка',
  'breadcrumb.expand': 'Развернуть свёрнутые элементы цепочки',
  // backTop (возврат наверх)
  'backTop.backToTop': 'Наверх',
  // pageHeader (заголовок страницы)
  'pageHeader.back': 'Назад',
  // splitter (разделитель панелей)
  'splitter.adjust': 'Изменить размер панели',
  'splitter.collapse': 'Свернуть панель',
  'splitter.expand': 'Развернуть панель',
  // layout (контейнер разметки)
  'layout.sider': 'Боковая панель',
  // sidebar (сворачиваемая боковая панель)
  'sidebar.nav': 'Навигация боковой панели',
  'sidebar.toggle': 'Свернуть боковую панель',
  'sidebar.expand': 'Развернуть боковую панель',
  'sidebar.openMenu': 'Открыть боковую панель',
  'sidebar.closeMenu': 'Закрыть боковую панель',
  'sidebar.resize': 'Изменить ширину боковой панели',
  // floatButton (плавающая кнопка)
  'floatButton.action': 'Быстрые действия',
  // toggleGroup (группа переключателей)
  'toggleGroup.group': 'Группа переключателей',
  // speedDial (быстрые действия)
  'speedDial.actions': 'Действия',
  // pagination (пагинация)
  'pagination.nav': 'Пагинация',
  'pagination.prev': 'Предыдущая страница',
  'pagination.next': 'Следующая страница',
  'pagination.first': 'Первая страница',
  'pagination.last': 'Последняя страница',
  'pagination.page': 'Страница {page}',
  'pagination.total': 'Всего: {total}',
  'pagination.sizes': 'Строк на странице',
  'pagination.sizePerPage': '{size} на странице',
  'pagination.goto': 'Перейти к',
  'pagination.pageClassifier': 'странице',
  'pagination.jumperInput': 'Переход к странице',
  'pagination.jumpForward': 'Перейти вперёд',
  'pagination.jumpBackward': 'Перейти назад',
  'pagination.more': 'Ещё',
  // table (таблица)
  'table.selectAll': 'Выбрать все',
  'table.loading': 'Загрузка…',
  'table.empty': 'Нет данных',
  'table.selectRow': 'Выбрать строку {key}',
  'table.expand': 'Развернуть/Свернуть',
  'table.summary': 'Итого',
  'table.edit': 'Изменить',
  'table.save': 'Сохранить',
  'table.cancel': 'Отмена',
  'table.editCell': 'Изменить {column} (строка {key})',
  'table.editHint': 'Дважды нажмите, чтобы изменить',
  'table.filter': 'Фильтр',
  'table.clear': 'Очистить',
  // list (список)
  'list.empty': 'Нет данных',
  // tree (дерево)
  'tree.expand': 'Развернуть/Свернуть',
  'tree.select': 'Выбрать {label}',
  'tree.loading': 'Загрузка…',
  // timeline (шкала времени)
  'timeline.pending': 'Скоро',
  // carousel (карусель)
  'carousel.prev': 'Предыдущий слайд',
  'carousel.next': 'Следующий слайд',
  'carousel.dot': 'Слайд {index}',
  'carousel.pause': 'Приостановить автопроигрывание',
  'carousel.play': 'Возобновить автопроигрывание',
  // image (изображение)
  'image.loading': 'Загрузка…',
  'image.loadFailed': 'Не удалось загрузить изображение',
  'image.defaultAlt': 'Изображение',
  // imageGroup (галерея изображений)
  'imageGroup.group': 'Галерея',
  // avatar (аватар)
  'avatar.defaultAlt': 'Аватар',
  'avatar.changeAvatar': 'Изменить аватар',
  'avatar.foldedMembers': 'Все участники',
  // typography (типографика)
  'typography.copy': 'Копировать',
  // tag (метка)
  'tag.close': 'Закрыть',
  // tagGroup (группа меток)
  'tagGroup.group': 'Группа меток',
  // tabs (вкладки)
  'tabs.close': 'Закрыть',
  'tabs.ctxClose': 'Закрыть',
  'tabs.ctxNew': 'Создать',
  'tabs.ctxCloseOthers': 'Закрыть другие',
  'tabs.ctxCloseLeft': 'Закрыть все слева',
  'tabs.ctxCloseRight': 'Закрыть все справа',
  'tabs.ctxCloseAll': 'Закрыть все',
  'tabs.add': 'Добавить вкладку',
  'tabs.newTab': 'Новая вкладка',
  'tabs.scrollPrev': 'Прокрутить вкладки назад',
  'tabs.scrollNext': 'Прокрутить вкладки вперёд',
  'tabs.more': 'Больше вкладок',
  // buttonGroup (группа кнопок)
  'buttonGroup.group': 'Группа кнопок',
  // compact (компактная компоновка)
  'compact.group': 'Компактная группа',
  // loading (состояние загрузки, общий фолбэк)
  'loading.loading': 'Загрузка…',
  // calendar (календарь)
  'calendar.today': 'Сегодня',
  'calendar.prevMonth': 'Предыдущий месяц',
  'calendar.nextMonth': 'Следующий месяц',
  'calendar.prevYear': 'Предыдущий год',
  'calendar.nextYear': 'Следующий год',
  // datePicker (выбор даты)
  'datePicker.placeholder': 'Выберите дату',
  'datePicker.confirm': 'ОК',
  'datePicker.join': ', ',
  'datePicker.shortcutToday': 'Сегодня',
  'datePicker.shortcutThisWeek': 'На этой неделе',
  'datePicker.shortcutThisMonth': 'В этом месяце',
  'datePicker.shortcutThisYear': 'В этом году',
  // dropdown (выпадающее меню)
  'dropdown.openMenu': 'Открыть меню',
  // popover (всплывающая карточка)
  'popover.close': 'Закрыть',
  // menu (меню)
  'menu.more': 'Ещё пункты меню',
  // timePicker (выбор времени)
  'timePicker.placeholder': 'Выберите время',
  'timePicker.hour': 'Час',
  'timePicker.minute': 'Минута',
  'timePicker.second': 'Секунда',
  // upload (загрузка файлов)
  'upload.select': 'Выбрать файлы',
  'upload.drag': 'Перетащите файлы сюда или нажмите для выбора',
  'upload.remove': 'Удалить {name}',
  'upload.upload': 'Начать загрузку',
  'upload.empty': 'Нет файлов',
  'upload.maxCount': 'Не более {max} файлов',
  'upload.preview': 'Просмотр {name}',
  'upload.previewDialog': 'Просмотр файла',
  'upload.closePreview': 'Закрыть просмотр',
  // transfer (перенос списков)
  'transfer.source': 'Исходный список',
  'transfer.target': 'Список выбранных',
  'transfer.toRight': 'Переместить вправо',
  'transfer.toLeft': 'Переместить влево',
  'transfer.selectAll': 'Выбрать все',
  'transfer.search': 'Поиск',
  'transfer.empty': 'Нет данных',
  'transfer.noMatch': 'Ничего не найдено',
  // colorPicker (выбор цвета)
  'colorPicker.label': 'Выбор цвета',
  'colorPicker.preset': 'Пресеты цветов',
  'colorPicker.hue': 'Тон',
  'colorPicker.saturation': 'Насыщенность',
  'colorPicker.brightness': 'Яркость',
  'colorPicker.red': 'Красный',
  'colorPicker.green': 'Зелёный',
  'colorPicker.blue': 'Синий',
  // pinInput (ввод кода по разрядам)
  'pinInput.group': 'Код подтверждения',
  'pinInput.digit': 'Цифра {position}',
  // dynamicInput (динамический список)
  'dynamicInput.add': 'Добавить',
  'dynamicInput.remove': 'Удалить',
  // dynamicTags (динамические метки)
  'dynamicTags.inputLabel': 'Добавить метку',
  'dynamicTags.remove': 'Удалить {label}',
  'dynamicTags.duplicate': 'Метка уже существует',
  // editable (редактирование на месте)
  'editable.edit': 'Изменить',
  'editable.submit': 'ОК',
  'editable.cancel': 'Отмена',
  // ellipsis (усечение текста)
  'ellipsis.expand': 'Развернуть',
  'ellipsis.collapse': 'Свернуть',
  // chart (диаграммы)
  'chart.line': 'Линейный график',
  'chart.bar': 'Столбчатая диаграмма',
  'chart.pie': 'Круговая диаграмма',
  'chart.area': 'Диаграмма с областями',
  'chart.donut': 'Кольцевая диаграмма',
  'chart.stacked-bar': 'Столбчатая диаграмма с накоплением',
  'chart.empty': 'Нет данных',
  // code (блок кода)
  'code.copy': 'Копировать',
  'code.copied': 'Скопировано',
  // image (просмотр изображений во всплывающем слое)
  'image.preview.close': 'Закрыть просмотр',
  'image.preview.zoomIn': 'Увеличить',
  'image.preview.zoomOut': 'Уменьшить',
  'image.preview.rotate': 'Повернуть',
  'image.preview.download': 'Скачать',
  'image.preview.alt': 'Просмотр изображения',
  'image.preview.flipX': 'Отразить по горизонтали',
  'image.preview.flipY': 'Отразить по вертикали',
  'image.preview.prev': 'Предыдущее изображение',
  'image.preview.next': 'Следующее изображение',
  'image.preview.progress': 'Изображение {index} из {total}',
  // qrcode (QR-код)
  'qrcode.image': 'QR-код',
  'qrcode.empty': 'Нет содержимого',
  'qrcode.tooLong': 'Содержимое слишком длинное, сократите его и повторите',
  'qrcode.expired': 'Срок действия QR-кода истёк',
  'qrcode.refresh': 'Обновить',
  'qrcode.loading': 'Загрузка…',
  'qrcode.scanned': 'Отсканировано',
  // command (палитра команд)
  'command.placeholder': 'Поиск команд…',
  'command.empty': 'Нет подходящих команд',
  'command.search': 'Поиск команд',
  'command.label': 'Палитра команд',
  'command.loading': 'Загрузка команд…',
  'command.noResults': 'По запросу «{query}» ничего не найдено',
  'command.recent': 'Недавние',
  'command.back': 'На уровень выше',
  'command.footer.navigate': 'Навигация',
  'command.footer.select': 'Выбор',
  'command.footer.close': 'Закрыть',
  'command.multiRun': 'Выполнить {n}',
  // menubar (строка меню приложения)
  'menubar.label': 'Строка меню',
  'menubar.menu': 'Меню',
  'menubar.more': 'Ещё пункты меню',
  // navigationMenu (многоуровневая навигация)
  'navigationMenu.label': 'Навигация',
  'navigationMenu.back': 'Назад',
  // toolbar (панель инструментов)
  'toolbar.label': 'Панель инструментов',
  'toolbar.more': 'Ещё инструменты',
  'toolbar.toggleGroup': 'Группа переключателей',
  'toolbar.input': 'Поле на панели инструментов',
  'toolbar.item': 'Элемент панели инструментов',
  // app-bar (панель приложения)
  'appBar.label': 'Панель приложения',
  'appBar.menu': 'Главное меню',
  'appBar.more': 'Ещё действия',
  'appBar.item': 'Действие',
  // log (поток журнала)
  'log.empty': 'Нет записей',
  'log.no-match': 'Нет подходящих записей',
  // themeEditor (редактор темы)
  'themeEditor.label': 'Редактор темы',
  'themeEditor.export': 'Экспортировать JSON темы',
  'themeEditor.search': 'Поиск токенов',
  'themeEditor.group.color': 'Цвета',
  'themeEditor.group.fontSize': 'Размер шрифта',
  'themeEditor.group.space': 'Отступы',
  'themeEditor.group.radius': 'Скругления',
  'themeEditor.group.controlHeight': 'Высота элементов управления',
  'themeEditor.group.custom': 'Другое',
  // bottomNavigation (нижняя навигация)
  'bottomNavigation.nav': 'Нижняя навигация',
  'upload.retry': 'Повторить {name}',
  'upload.cancelUpload': 'Отменить загрузку {name}',
  'transfer.count': '{selected}/{total}',
  'dynamicTags.patternMismatch': 'Неверный формат',
  'dynamicInput.moveUp': 'Переместить вверх',
  'dynamicInput.moveDown': 'Переместить вниз',
  'timePicker.now': 'Сейчас',
  'datePicker.shortcutThisQuarter': 'В этом квартале',
}
