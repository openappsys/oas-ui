import type { LocaleMessages } from '../types.js'

/**
 * Français 语言包 —— key 全集与 zh-CN 完全一致。
 * 标注 LocaleMessages 保证缺 key 编译期报错（locale-completeness 测试再加运行时兜底）。
 */
export const fr: LocaleMessages = {
  // badge (badge)
  'badge.notifications': '{count} notifications non lues',
  // modal (boîte de dialogue)
  'modal.close': 'Fermer',
  'modal.ok': 'OK',
  'modal.cancel': 'Annuler',
  // confirm (boîte de confirmation impérative)
  'confirm.ok': 'OK',
  'confirm.cancel': 'Annuler',
  // empty (état vide)
  'empty.noData': 'Aucune donnée',
  // alert (alerte)
  'alert.close': 'Fermer',
  // drawer (panneau latéral)
  'drawer.close': 'Fermer',
  'drawer.ok': 'OK',
  'drawer.cancel': 'Annuler',
  'drawer.resize': 'Redimensionner le panneau',
  // message (message global)
  'message.close': 'Fermer',
  // notification (notification)
  'notification.close': 'Fermer',
  'notification.region': 'Notifications',
  // toast (notification éphémère)
  'toast.close': 'Fermer',
  // snackbar (barre de messages)
  'snackbar.close': 'Fermer',
  // popconfirm (confirmation contextuelle)
  'popconfirm.ok': 'OK',
  'popconfirm.cancel': 'Annuler',
  // select (sélecteur)
  'select.search': 'Rechercher des options',
  'select.placeholder': 'Sélectionner',
  'select.empty': 'Aucune donnée',
  'select.noMatch': 'Aucune option correspondante',
  'select.remove': 'Retirer {label}',
  'select.create': 'Créer {label}',
  // cascader (sélection en cascade)
  'cascader.placeholder': 'Sélectionner',
  // tree-select (sélecteur d’arborescence)
  'treeSelect.placeholder': 'Sélectionner',
  'treeSelect.empty': 'Aucune donnée',
  'treeSelect.join': ', ',
  'treeSelect.andMore': 'et {count} autres',
  // auto-complete (complétion automatique)
  'autoComplete.noMatch': 'Aucun résultat correspondant',
  'autoComplete.defaultLabel': 'Champ de saisie automatique',
  // combobox (zone combinée : le champ est le contrôle, filtrage à la saisie + sélection de valeur)
  'combobox.empty': 'Aucune option',
  'combobox.noMatch': 'Aucune option correspondante',
  'combobox.loading': 'Chargement…',
  // input (champ de saisie)
  'input.clear': 'Effacer',
  'input.defaultLabel': 'Champ de saisie',
  'textarea.defaultLabel': 'Zone de texte multiligne',
  'input.showPassword': 'Afficher le mot de passe',
  'input.hidePassword': 'Masquer le mot de passe',
  // mentions (mentions)
  'mentions.defaultLabel': 'Champ de mentions',
  'mentions.noMatch': 'Aucune mention correspondante',
  // input-number (champ numérique)
  'inputNumber.increase': 'Augmenter',
  'inputNumber.decrease': 'Diminuer',
  'inputNumber.defaultLabel': 'Champ numérique',
  // slider (curseur)
  'slider.valueLabel': 'Curseur',
  'slider.minLabel': 'Minimum',
  'slider.maxLabel': 'Maximum',
  // rate (évaluation)
  'rate.rate': 'Évaluation',
  // form (validation de formulaire)
  'form.validationFailed': 'Échec de la validation',
  // tour (visite guidée)
  'tour.skip': 'Passer',
  'tour.prev': 'Précédent',
  'tour.next': 'Suivant',
  'tour.finish': 'Terminer',
  'tour.close': 'Fermer',
  'tour.dontShowAgain': 'Ne plus afficher',
  'tour.hint': 'Aide',
  'tour.hintGotIt': 'Compris',
  'tour.progress': 'Progression de la visite',
  // steps (étapes)
  'steps.prev': 'Précédent',
  'steps.next': 'Suivant',
  'steps.optional': 'Facultatif',
  // anchor (navigation par ancres)
  'anchor.nav': 'Navigation par ancres',
  // breadcrumb (fil d’Ariane)
  'breadcrumb.nav': 'Fil d’Ariane',
  'breadcrumb.expand': 'Déplier les éléments réduits du fil d’Ariane',
  // back-top (retour en haut)
  'backTop.backToTop': 'Haut de page',
  // page-header (en-tête de page)
  'pageHeader.back': 'Retour',
  // splitter (panneaux divisés)
  'splitter.adjust': 'Redimensionner le panneau',
  'splitter.collapse': 'Replier le panneau',
  'splitter.expand': 'Déplier le panneau',
  // layout (conteneur de mise en page)
  'layout.sider': 'Barre latérale',
  // sidebar (barre latérale repliable)
  'sidebar.nav': 'Navigation latérale',
  'sidebar.toggle': 'Replier la barre latérale',
  'sidebar.expand': 'Déplier la barre latérale',
  'sidebar.openMenu': 'Ouvrir la barre latérale',
  'sidebar.closeMenu': 'Fermer la barre latérale',
  'sidebar.resize': 'Redimensionner la barre latérale',
  // float-button (bouton flottant)
  'floatButton.action': 'Actions rapides',
  // toggle-group (groupe à bascule)
  'toggleGroup.group': 'Groupe à bascule',
  // speed-dial (bouton d’actions flottant)
  'speedDial.actions': 'Menu d’actions',
  // pagination (pagination)
  'pagination.nav': 'Pagination',
  'pagination.prev': 'Page précédente',
  'pagination.next': 'Page suivante',
  'pagination.first': 'Première page',
  'pagination.last': 'Dernière page',
  'pagination.page': 'Page {page}',
  'pagination.total': 'Total : {total}',
  'pagination.sizes': 'Éléments par page',
  'pagination.sizePerPage': '{size} par page',
  'pagination.goto': 'Aller à',
  'pagination.pageClassifier': 'Page',
  'pagination.jumperInput': 'Aller à la page',
  'pagination.jumpForward': 'Saut en avant',
  'pagination.jumpBackward': 'Saut en arrière',
  'pagination.more': 'Plus',
  // table (tableau)
  'table.selectAll': 'Tout sélectionner',
  'table.loading': 'Chargement…',
  'table.empty': 'Aucune donnée',
  'table.selectRow': 'Sélectionner la ligne {key}',
  'table.expand': 'Déplier/Replier',
  'table.summary': 'Total',
  'table.edit': 'Modifier',
  'table.save': 'Enregistrer',
  'table.cancel': 'Annuler',
  'table.editCell': 'Modifier {column} (ligne {key})',
  'table.editHint': 'Double-cliquer pour modifier',
  'table.filter': 'Filtrer',
  'table.clear': 'Effacer',
  // list (liste)
  'list.empty': 'Aucune donnée',
  // tree (arborescence)
  'tree.expand': 'Déplier/Replier',
  'tree.select': 'Sélectionner {label}',
  'tree.loading': 'Chargement…',
  // timeline (chronologie)
  'timeline.pending': 'À venir',
  // carousel (carrousel)
  'carousel.prev': 'Diapositive précédente',
  'carousel.next': 'Diapositive suivante',
  'carousel.dot': 'Diapositive {index}',
  'carousel.pause': 'Suspendre le défilement',
  'carousel.play': 'Reprendre le défilement',
  // image (image)
  'image.loading': 'Chargement…',
  'image.loadFailed': 'Échec du chargement de l’image',
  'image.defaultAlt': 'Image',
  // image-group (conteneur de galerie, nom accessible partagé du groupe d’aperçu)
  'imageGroup.group': 'Galerie d’images',
  // avatar (avatar)
  'avatar.defaultAlt': 'Avatar',
  'avatar.changeAvatar': 'Changer d’avatar',
  'avatar.foldedMembers': 'Tous les membres',
  // typography (typographie)
  'typography.copy': 'Copier',
  // tag (étiquette)
  'tag.close': 'Fermer',
  // tag-group (groupe d’étiquettes)
  'tagGroup.group': 'Groupe d’étiquettes',
  // tabs (onglets)
  'tabs.close': 'Fermer',
  'tabs.ctxClose': 'Fermer',
  'tabs.ctxNew': 'Nouveau',
  'tabs.ctxCloseOthers': 'Fermer les autres',
  'tabs.ctxCloseLeft': 'Fermer les onglets à gauche',
  'tabs.ctxCloseRight': 'Fermer les onglets à droite',
  'tabs.ctxCloseAll': 'Tout fermer',
  'tabs.add': 'Ajouter un onglet',
  'tabs.newTab': 'Nouvel onglet',
  'tabs.scrollPrev': 'Faire défiler les onglets en arrière',
  'tabs.scrollNext': 'Faire défiler les onglets en avant',
  'tabs.more': 'Plus d’onglets',
  // button-group (groupe de boutons)
  'buttonGroup.group': 'Groupe de boutons',
  // compact (conteneur de regroupement compact)
  'compact.group': 'Groupe compact',
  // loading (chargement, repli générique)
  'loading.loading': 'Chargement…',
  // calendar (calendrier)
  'calendar.today': 'Aujourd’hui',
  'calendar.prevMonth': 'Mois précédent',
  'calendar.nextMonth': 'Mois suivant',
  'calendar.prevYear': 'Année précédente',
  'calendar.nextYear': 'Année suivante',
  // date-picker (sélecteur de date)
  'datePicker.placeholder': 'Sélectionner une date',
  'datePicker.confirm': 'OK',
  'datePicker.join': ', ',
  'datePicker.shortcutToday': 'Aujourd’hui',
  'datePicker.shortcutThisWeek': 'Cette semaine',
  'datePicker.shortcutThisMonth': 'Ce mois-ci',
  'datePicker.shortcutThisYear': 'Cette année',
  // dropdown (menu déroulant)
  'dropdown.openMenu': 'Ouvrir le menu',
  // popover (carte contextuelle)
  'popover.close': 'Fermer',
  // menu (menu)
  'menu.more': 'Plus d’éléments de menu',
  // time-picker (sélecteur d’heure)
  'timePicker.placeholder': 'Sélectionner une heure',
  'timePicker.hour': 'Heure',
  'timePicker.minute': 'Minute',
  'timePicker.second': 'Seconde',
  // upload (téléversement)
  'upload.select': 'Sélectionner des fichiers',
  'upload.drag': 'Glissez des fichiers ici ou cliquez pour sélectionner',
  'upload.remove': 'Retirer {name}',
  'upload.upload': 'Téléverser',
  'upload.empty': 'Aucun fichier',
  'upload.maxCount': 'Jusqu’à {max} fichiers',
  'upload.preview': 'Aperçu de {name}',
  'upload.previewDialog': 'Aperçu du fichier',
  'upload.closePreview': 'Fermer l’aperçu',
  // transfer (transfert)
  'transfer.source': 'Liste source',
  'transfer.target': 'Liste sélectionnée',
  'transfer.toRight': 'Déplacer vers la droite',
  'transfer.toLeft': 'Déplacer vers la gauche',
  'transfer.selectAll': 'Tout sélectionner',
  'transfer.search': 'Rechercher',
  'transfer.empty': 'Aucune donnée',
  'transfer.noMatch': 'Aucune correspondance trouvée',
  // color-picker (sélecteur de couleurs)
  'colorPicker.label': 'Sélecteur de couleurs',
  'colorPicker.preset': 'Couleurs prédéfinies',
  'colorPicker.hue': 'Teinte',
  'colorPicker.saturation': 'Saturation',
  'colorPicker.brightness': 'Luminosité',
  'colorPicker.red': 'Rouge',
  'colorPicker.green': 'Vert',
  'colorPicker.blue': 'Bleu',
  // pin-input (saisie de code par chiffres)
  'pinInput.group': 'Code de vérification',
  'pinInput.digit': 'Chiffre {position}',
  // dynamic-input (liste dynamique)
  'dynamicInput.add': 'Ajouter',
  'dynamicInput.remove': 'Supprimer',
  // dynamic-tags (étiquettes dynamiques)
  'dynamicTags.inputLabel': 'Ajouter une étiquette',
  'dynamicTags.remove': 'Retirer {label}',
  'dynamicTags.duplicate': 'Cette étiquette existe déjà',
  // editable (modification sur place)
  'editable.edit': 'Modifier',
  'editable.submit': 'OK',
  'editable.cancel': 'Annuler',
  // ellipsis (ellipse de texte)
  'ellipsis.expand': 'Déplier',
  'ellipsis.collapse': 'Replier',
  // chart (graphique)
  'chart.line': 'Graphique en courbes',
  'chart.bar': 'Graphique en barres',
  'chart.pie': 'Graphique à secteurs',
  'chart.area': 'Graphique en aires',
  'chart.donut': 'Graphique en anneau',
  'chart.stacked-bar': 'Graphique à barres empilées',
  'chart.empty': 'Aucune donnée',
  // code (bloc de code)
  'code.copy': 'Copier',
  'code.copied': 'Copié',
  // image (calque d’aperçu d’image)
  'image.preview.close': 'Fermer l’aperçu',
  'image.preview.zoomIn': 'Zoom avant',
  'image.preview.zoomOut': 'Zoom arrière',
  'image.preview.rotate': 'Pivoter',
  'image.preview.download': 'Télécharger',
  'image.preview.alt': 'Aperçu de l’image',
  'image.preview.flipX': 'Miroir horizontal',
  'image.preview.flipY': 'Miroir vertical',
  'image.preview.prev': 'Image précédente',
  'image.preview.next': 'Image suivante',
  'image.preview.progress': 'Image {index} sur {total}',
  // qrcode (code QR)
  'qrcode.image': 'Code QR',
  'qrcode.empty': 'Aucun contenu',
  'qrcode.tooLong': 'Contenu trop long, veuillez le raccourcir',
  'qrcode.expired': 'Code QR expiré',
  'qrcode.refresh': 'Actualiser',
  'qrcode.loading': 'Chargement…',
  'qrcode.scanned': 'Numérisé',
  // command (palette de commandes)
  'command.placeholder': 'Rechercher des commandes…',
  'command.empty': 'Aucune commande correspondante',
  'command.search': 'Rechercher des commandes',
  'command.label': 'Palette de commandes',
  'command.loading': 'Chargement des commandes…',
  'command.noResults': 'Aucune commande trouvée pour « {query} »',
  'command.recent': 'Récents',
  'command.back': 'Retour',
  'command.footer.navigate': 'Naviguer',
  'command.footer.select': 'Exécuter',
  'command.footer.close': 'Fermer',
  'command.multiRun': 'Exécuter {n}',
  // menubar (barre de menus d’application)
  'menubar.label': 'Barre de menus',
  'menubar.menu': 'Menu',
  'menubar.more': 'Plus d’éléments de menu',
  // navigation-menu (navigation multi-niveaux)
  'navigationMenu.label': 'Navigation',
  'navigationMenu.back': 'Retour',
  // toolbar (barre d’outils)
  'toolbar.label': 'Barre d’outils',
  'toolbar.more': 'Plus d’outils',
  'toolbar.toggleGroup': 'Groupe à bascule',
  'toolbar.input': 'Champ de saisie de la barre d’outils',
  'toolbar.item': 'Élément de barre d’outils',
  // app-bar (barre d’application)
  'appBar.label': 'Barre d’application',
  'appBar.menu': 'Menu principal',
  'appBar.more': 'Plus d’actions',
  'appBar.item': 'Action',
  // log (flux de journaux)
  'log.empty': 'Aucun journal',
  'log.no-match': 'Aucun journal correspondant',
  // theme-editor (éditeur de thème)
  'themeEditor.label': 'Éditeur de thème',
  'themeEditor.export': 'Exporter le JSON du thème',
  'themeEditor.search': 'Rechercher des tokens',
  'themeEditor.group.color': 'Couleurs',
  'themeEditor.group.fontSize': 'Taille de police',
  'themeEditor.group.space': 'Espacement',
  'themeEditor.group.radius': 'Arrondi',
  'themeEditor.group.controlHeight': 'Hauteur des contrôles',
  'themeEditor.group.custom': 'Autres',
  // bottom-navigation (navigation inférieure)
  'bottomNavigation.nav': 'Navigation inférieure',
  'upload.retry': 'Réessayer {name}',
  'upload.cancelUpload': 'Annuler le téléversement de {name}',
  'transfer.count': '{selected}/{total}',
  'dynamicTags.patternMismatch': 'Format incorrect',
  'dynamicInput.moveUp': 'Monter',
  'dynamicInput.moveDown': 'Descendre',
  'timePicker.now': 'Maintenant',
  'datePicker.shortcutThisQuarter': 'Ce trimestre',
}
