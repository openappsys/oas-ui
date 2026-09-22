import type { LocaleMessages } from '../types.js'

/**
 * Deutsch 语言包 —— key 全集与 zh-CN 完全一致。
 * 标注 LocaleMessages 保证缺 key 编译期报错（locale-completeness 测试再加运行时兜底）。
 */
export const de: LocaleMessages = {
  // badge (Abzeichen)
  'badge.notifications': '{count} ungelesene Benachrichtigungen',
  // modal (Dialogfeld)
  'modal.close': 'Schließen',
  'modal.ok': 'OK',
  'modal.cancel': 'Abbrechen',
  // confirm (imperativer Bestätigungsdialog)
  'confirm.ok': 'OK',
  'confirm.cancel': 'Abbrechen',
  // empty (leerer Zustand)
  'empty.noData': 'Keine Daten',
  // alert (Warnhinweis)
  'alert.close': 'Schließen',
  // drawer (Seitenpanel)
  'drawer.close': 'Schließen',
  'drawer.ok': 'OK',
  'drawer.cancel': 'Abbrechen',
  'drawer.resize': 'Panelgröße anpassen',
  // message (globale Nachricht)
  'message.close': 'Schließen',
  // notification (Benachrichtigung)
  'notification.close': 'Schließen',
  'notification.region': 'Benachrichtigungen',
  // toast (kurzer Hinweis)
  'toast.close': 'Schließen',
  // snackbar (Nachrichtenleiste)
  'snackbar.close': 'Schließen',
  // popconfirm (Bestätigungs-Popup)
  'popconfirm.ok': 'OK',
  'popconfirm.cancel': 'Abbrechen',
  // select (Auswahl)
  'select.search': 'Optionen suchen',
  'select.placeholder': 'Bitte auswählen',
  'select.empty': 'Keine Daten',
  'select.noMatch': 'Keine passenden Optionen',
  'select.remove': '{label} entfernen',
  'select.create': '{label} erstellen',
  // cascader (Kaskadenauswahl)
  'cascader.placeholder': 'Bitte auswählen',
  // tree-select (Baumauswahl)
  'treeSelect.placeholder': 'Bitte auswählen',
  'treeSelect.empty': 'Keine Daten',
  'treeSelect.join': ', ',
  'treeSelect.andMore': 'und {count} weitere',
  // auto-complete (Autovervollständigung)
  'autoComplete.noMatch': 'Keine passenden Ergebnisse',
  'autoComplete.defaultLabel': 'Auto-Vervollständigungseingabe',
  // combobox (Kombinationsfeld: Eingabefeld ist das Steuerelement, Eingabe filtert + Auswahl übernimmt den Wert)
  'combobox.empty': 'Keine Optionen',
  'combobox.noMatch': 'Keine passenden Optionen',
  'combobox.loading': 'Wird geladen…',
  // input (Eingabefeld)
  // form（表单通用）
  'form.valueMissing': 'Dieses Feld ist erforderlich',
  'input.clear': 'Leeren',
  'input.defaultLabel': 'Eingabefeld',
  'textarea.defaultLabel': 'Mehrzeiliges Textfeld',
  'input.showPassword': 'Passwort anzeigen',
  'input.hidePassword': 'Passwort verbergen',
  // mentions (Erwähnungen)
  'mentions.defaultLabel': 'Erwähnungsfeld',
  'mentions.noMatch': 'Keine passenden Erwähnungen',
  // input-number (Zahlenfeld)
  'inputNumber.increase': 'Erhöhen',
  'inputNumber.decrease': 'Verringern',
  'inputNumber.defaultLabel': 'Zahlenfeld',
  // slider (Schieberegler)
  'slider.valueLabel': 'Schieberegler',
  'slider.minLabel': 'Minimum',
  'slider.maxLabel': 'Maximum',
  // rate (Bewertung)
  'rate.rate': 'Bewertung',
  // form (Formularvalidierung)
  'form.validationFailed': 'Validierung fehlgeschlagen',
  // tour (geführte Tour)
  'tour.skip': 'Überspringen',
  'tour.prev': 'Zurück',
  'tour.next': 'Weiter',
  'tour.finish': 'Fertig',
  'tour.close': 'Schließen',
  'tour.dontShowAgain': 'Nicht mehr anzeigen',
  'tour.hint': 'Hinweis',
  'tour.hintGotIt': 'Verstanden',
  'tour.progress': 'Tour-Fortschritt',
  // steps (Schritte)
  'steps.prev': 'Zurück',
  'steps.next': 'Weiter',
  'steps.optional': 'Optional',
  // anchor (Ankernavigation)
  'anchor.nav': 'Ankernavigation',
  // breadcrumb (Brotkrumen-Navigation)
  'breadcrumb.nav': 'Brotkrumen-Navigation',
  'breadcrumb.expand': 'Eingeklappte Brotkrumen-Einträge ausklappen',
  // back-top (zurück nach oben)
  'backTop.backToTop': 'Nach oben',
  // page-header (Seitenkopf)
  'pageHeader.back': 'Zurück',
  // splitter (geteilte Panels)
  'splitter.adjust': 'Panelbreite anpassen',
  'splitter.collapse': 'Panel einklappen',
  'splitter.expand': 'Panel ausklappen',
  // layout (Layout-Container)
  'layout.sider': 'Seitenleiste',
  // sidebar (einklappbare Seitenleiste)
  'sidebar.nav': 'Seitennavigation',
  'sidebar.toggle': 'Seitenleiste einklappen',
  'sidebar.expand': 'Seitenleiste ausklappen',
  'sidebar.openMenu': 'Seitenleiste öffnen',
  'sidebar.closeMenu': 'Seitenleiste schließen',
  'sidebar.resize': 'Breite der Seitenleiste anpassen',
  // float-button (schwebende Schaltfläche)
  'floatButton.action': 'Schnellaktionen',
  // toggle-group (Umschaltgruppe)
  'toggleGroup.group': 'Umschaltgruppe',
  // speed-dial (schwebende Aktionsschaltfläche)
  'speedDial.actions': 'Aktionsmenü',
  // pagination (Paginierung)
  'pagination.nav': 'Paginierung',
  'pagination.prev': 'Vorherige Seite',
  'pagination.next': 'Nächste Seite',
  'pagination.first': 'Erste Seite',
  'pagination.last': 'Letzte Seite',
  'pagination.page': 'Seite {page}',
  'pagination.total': 'Gesamt {total}',
  'pagination.sizes': 'Einträge pro Seite',
  'pagination.sizePerPage': '{size} pro Seite',
  'pagination.goto': 'Gehe zu',
  'pagination.pageClassifier': 'Seite',
  'pagination.jumperInput': 'Zur Seite springen',
  'pagination.jumpForward': 'Vorwärts springen',
  'pagination.jumpBackward': 'Rückwärts springen',
  'pagination.more': 'Mehr',
  // table (Tabelle)
  'table.selectAll': 'Alle auswählen',
  'table.loading': 'Wird geladen…',
  'table.empty': 'Keine Daten',
  'table.selectRow': 'Zeile {key} auswählen',
  'table.expand': 'Ausklappen/Einklappen',
  'table.summary': 'Summe',
  'table.edit': 'Bearbeiten',
  'table.save': 'Speichern',
  'table.cancel': 'Abbrechen',
  'table.editCell': '{column} bearbeiten (Zeile {key})',
  'table.editHint': 'Doppelklick zum Bearbeiten',
  'table.filter': 'Filtern',
  'table.clear': 'Leeren',
  // list (Liste)
  'list.empty': 'Keine Daten',
  // tree (Baumstruktur)
  'tree.expand': 'Ausklappen/Einklappen',
  'tree.select': '{label} auswählen',
  'tree.loading': 'Wird geladen…',
  // timeline (Zeitachse)
  'timeline.pending': 'In Kürze verfügbar',
  // carousel (Karussell)
  'carousel.prev': 'Vorherige Folie',
  'carousel.next': 'Nächste Folie',
  'carousel.dot': 'Folie {index}',
  'carousel.pause': 'Autoplay pausieren',
  'carousel.play': 'Autoplay fortsetzen',
  // image (Bild)
  'image.loading': 'Wird geladen…',
  'image.loadFailed': 'Bild konnte nicht geladen werden',
  'image.defaultAlt': 'Bild',
  // image-group (Bildgruppen-Container, gemeinsamer barrierefreier Name der Vorschaugruppe)
  'imageGroup.group': 'Bildergalerie',
  // avatar (Profilbild)
  'avatar.defaultAlt': 'Avatar',
  'avatar.changeAvatar': 'Avatar ändern',
  'avatar.foldedMembers': 'Alle Mitglieder',
  // typography (Typografie)
  'typography.copy': 'Kopieren',
  // tag (Tag)
  'tag.close': 'Schließen',
  // tag-group (Tag-Gruppe)
  'tagGroup.group': 'Tag-Gruppe',
  // tabs (Registerkarten)
  'tabs.close': 'Schließen',
  'tabs.ctxClose': 'Schließen',
  'tabs.ctxNew': 'Neu',
  'tabs.ctxCloseOthers': 'Andere schließen',
  'tabs.ctxCloseLeft': 'Alle linken Tabs schließen',
  'tabs.ctxCloseRight': 'Alle rechten Tabs schließen',
  'tabs.ctxCloseAll': 'Alle schließen',
  'tabs.add': 'Tab hinzufügen',
  'tabs.newTab': 'Neuer Tab',
  'tabs.scrollPrev': 'Tabs zurückscrollen',
  'tabs.scrollNext': 'Tabs vorwärts scrollen',
  'tabs.more': 'Weitere Tabs',
  // button-group (Schaltflächengruppe)
  'buttonGroup.group': 'Schaltflächengruppe',
  // compact (kompakter Gruppierungscontainer)
  'compact.group': 'Kompakte Gruppe',
  // loading (Ladezustand, universeller Fallback)
  'loading.loading': 'Wird geladen…',
  // calendar (Kalender)
  'calendar.today': 'Heute',
  'calendar.prevMonth': 'Vorheriger Monat',
  'calendar.nextMonth': 'Nächster Monat',
  'calendar.prevYear': 'Vorheriges Jahr',
  'calendar.nextYear': 'Nächstes Jahr',
  // date-picker (Datumsauswahl)
  'datePicker.placeholder': 'Datum auswählen',
  'datePicker.confirm': 'OK',
  'datePicker.join': ', ',
  'datePicker.shortcutToday': 'Heute',
  'datePicker.shortcutThisWeek': 'Diese Woche',
  'datePicker.shortcutThisMonth': 'Dieser Monat',
  'datePicker.shortcutThisYear': 'Dieses Jahr',
  // dropdown (Dropdown-Menü)
  'dropdown.openMenu': 'Menü öffnen',
  // popover (Popup-Karte)
  'popover.close': 'Schließen',
  // menu (Menü)
  'menu.more': 'Weitere Menüpunkte',
  // time-picker (Zeitauswahl)
  'timePicker.placeholder': 'Uhrzeit auswählen',
  'timePicker.hour': 'Stunde',
  'timePicker.minute': 'Minute',
  'timePicker.second': 'Sekunde',
  // upload (Upload)
  'upload.select': 'Dateien auswählen',
  'upload.drag': 'Dateien hierher ziehen oder klicken zum Auswählen',
  'upload.remove': '{name} entfernen',
  'upload.upload': 'Hochladen',
  'upload.empty': 'Keine Dateien',
  'upload.maxCount': 'Maximal {max} Dateien',
  'upload.preview': 'Vorschau von {name}',
  'upload.previewDialog': 'Dateivorschau',
  'upload.closePreview': 'Vorschau schließen',
  // transfer (Transfer)
  'transfer.source': 'Quellliste',
  'transfer.target': 'Ausgewählte Liste',
  'transfer.toRight': 'Nach rechts verschieben',
  'transfer.toLeft': 'Nach links verschieben',
  'transfer.selectAll': 'Alle auswählen',
  'transfer.search': 'Suchen',
  'transfer.empty': 'Keine Daten',
  'transfer.noMatch': 'Keine Treffer gefunden',
  // color-picker (Farbauswahl)
  'colorPicker.label': 'Farbauswahl',
  'colorPicker.preset': 'Vordefinierte Farben',
  'colorPicker.hue': 'Farbton',
  'colorPicker.saturation': 'Sättigung',
  'colorPicker.brightness': 'Helligkeit',
  'colorPicker.red': 'Rot',
  'colorPicker.green': 'Grün',
  'colorPicker.blue': 'Blau',
  // pin-input (aufgeteilte Code-Eingabe)
  'pinInput.group': 'Bestätigungscode',
  'pinInput.digit': 'Ziffer {position}',
  // dynamic-input (dynamische Liste)
  'dynamicInput.add': 'Hinzufügen',
  'dynamicInput.remove': 'Entfernen',
  // dynamic-tags (dynamische Tags)
  'dynamicTags.inputLabel': 'Tag hinzufügen',
  'dynamicTags.remove': '{label} entfernen',
  'dynamicTags.duplicate': 'Tag existiert bereits',
  // editable (Bearbeiten an Ort und Stelle)
  'editable.edit': 'Bearbeiten',
  'editable.submit': 'OK',
  'editable.cancel': 'Abbrechen',
  // ellipsis (Textauslassung)
  'ellipsis.expand': 'Ausklappen',
  'ellipsis.collapse': 'Einklappen',
  // chart (Diagramm)
  'chart.line': 'Liniendiagramm',
  'chart.bar': 'Balkendiagramm',
  'chart.pie': 'Kreisdiagramm',
  'chart.area': 'Flächendiagramm',
  'chart.donut': 'Ringdiagramm',
  'chart.stacked-bar': 'Gestapeltes Balkendiagramm',
  'chart.empty': 'Keine Daten',
  // code (Codeblock)
  'code.copy': 'Kopieren',
  'code.copied': 'Kopiert',
  // image (Bildvorschau-Overlay)
  'image.preview.close': 'Vorschau schließen',
  'image.preview.zoomIn': 'Vergrößern',
  'image.preview.zoomOut': 'Verkleinern',
  'image.preview.rotate': 'Drehen',
  'image.preview.download': 'Herunterladen',
  'image.preview.alt': 'Bildvorschau',
  'image.preview.flipX': 'Horizontal spiegeln',
  'image.preview.flipY': 'Vertikal spiegeln',
  'image.preview.prev': 'Vorheriges Bild',
  'image.preview.next': 'Nächstes Bild',
  'image.preview.progress': 'Bild {index} von {total}',
  // qrcode (QR-Code)
  'qrcode.image': 'QR-Code',
  'qrcode.empty': 'Kein Inhalt',
  'qrcode.tooLong': 'Inhalt ist zu lang, bitte kürzen',
  'qrcode.expired': 'QR-Code abgelaufen',
  'qrcode.refresh': 'Aktualisieren',
  'qrcode.loading': 'Wird geladen…',
  'qrcode.scanned': 'Gescannt',
  // command (Befehlspalette)
  'command.placeholder': 'Befehle suchen…',
  'command.empty': 'Keine passenden Befehle',
  'command.search': 'Befehle suchen',
  'command.label': 'Befehlspalette',
  'command.loading': 'Befehle werden geladen…',
  'command.noResults': 'Keine Befehle für "{query}" gefunden',
  'command.recent': 'Zuletzt verwendet',
  'command.back': 'Zurück',
  'command.footer.navigate': 'Navigieren',
  'command.footer.select': 'Auswählen',
  'command.footer.close': 'Schließen',
  'command.multiRun': '{n} ausführen',
  // menubar (Anwendungsmenüleiste)
  'menubar.label': 'Menüleiste',
  'menubar.menu': 'Menü',
  'menubar.more': 'Weitere Menüpunkte',
  // navigation-menu (mehrstufige Navigation)
  'navigationMenu.label': 'Navigation',
  'navigationMenu.back': 'Zurück',
  // toolbar (Symbolleiste)
  'toolbar.label': 'Symbolleiste',
  'toolbar.more': 'Weitere Werkzeuge',
  'toolbar.toggleGroup': 'Umschaltgruppe',
  'toolbar.input': 'Eingabefeld der Symbolleiste',
  'toolbar.item': 'Symbolleisten-Element',
  // app-bar (App-Leiste)
  'appBar.label': 'App-Leiste',
  'appBar.menu': 'Hauptmenü',
  'appBar.more': 'Weitere Aktionen',
  'appBar.item': 'Aktion',
  // log (Protokollstream)
  'log.empty': 'Keine Protokolle',
  'log.no-match': 'Keine passenden Protokolle',
  // theme-editor (Theme-Editor)
  'themeEditor.label': 'Theme-Editor',
  'themeEditor.export': 'Theme-JSON exportieren',
  'themeEditor.search': 'Token suchen',
  'themeEditor.group.color': 'Farben',
  'themeEditor.group.fontSize': 'Schriftgröße',
  'themeEditor.group.space': 'Abstände',
  'themeEditor.group.radius': 'Eckenradius',
  'themeEditor.group.controlHeight': 'Steuerelementhöhe',
  'themeEditor.group.custom': 'Sonstige',
  // bottom-navigation (untere Navigation)
  'bottomNavigation.nav': 'Untere Navigation',
  'upload.retry': '{name} erneut hochladen',
  'upload.cancelUpload': 'Upload von {name} abbrechen',
  'transfer.count': '{selected}/{total}',
  'dynamicTags.patternMismatch': 'Ungültiges Format',
  'dynamicInput.moveUp': 'Nach oben',
  'dynamicInput.moveDown': 'Nach unten',
  'timePicker.now': 'Jetzt',
  'datePicker.shortcutThisQuarter': 'Dieses Quartal',
}
