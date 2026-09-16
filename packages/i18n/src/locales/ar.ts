import type { LocaleMessages } from '../types.js'

/**
 * العربية 语言包 —— key 全集与 zh-CN 完全一致（RTL 书写方向）。
 * 标注 LocaleMessages 保证缺 key 编译期报错（locale-completeness 测试再加运行时兜底）。
 */
export const ar: LocaleMessages = {
  // badge (شارة)
  'badge.notifications': 'إشعارات غير مقروءة: {count}',
  // modal (نافذة حوارية)
  'modal.close': 'إغلاق',
  'modal.ok': 'موافق',
  'modal.cancel': 'إلغاء',
  // confirm (نافذة تأكيد أمريّة)
  'confirm.ok': 'موافق',
  'confirm.cancel': 'إلغاء',
  // empty (حالة فراغ)
  'empty.noData': 'لا توجد بيانات',
  // alert (تنبيه)
  'alert.close': 'إغلاق',
  // drawer (لوحة جانبية منزلقة)
  'drawer.close': 'إغلاق',
  'drawer.ok': 'موافق',
  'drawer.cancel': 'إلغاء',
  'drawer.resize': 'تغيير حجم اللوحة',
  // message (رسالة عامة)
  'message.close': 'إغلاق',
  // notification (إشعار)
  'notification.close': 'إغلاق',
  'notification.region': 'الإشعارات',
  // toast (إشعار خفيف)
  'toast.close': 'إغلاق',
  // snackbar (شريط رسائل)
  'snackbar.close': 'إغلاق',
  // popconfirm (تأكيد منبثق)
  'popconfirm.ok': 'موافق',
  'popconfirm.cancel': 'إلغاء',
  // select (قائمة اختيار)
  'select.search': 'البحث في الخيارات',
  'select.placeholder': 'يرجى الاختيار',
  'select.empty': 'لا توجد بيانات',
  'select.noMatch': 'لا توجد خيارات مطابقة',
  'select.remove': 'إزالة {label}',
  'select.create': 'إنشاء {label}',
  // cascader (اختيار متتالٍ)
  'cascader.placeholder': 'يرجى الاختيار',
  // treeSelect (اختيار شجري)
  'treeSelect.placeholder': 'يرجى الاختيار',
  'treeSelect.empty': 'لا توجد بيانات',
  'treeSelect.join': '، ',
  'treeSelect.andMore': 'و{count} أخرى',
  // autoComplete (إكمال تلقائي)
  'autoComplete.noMatch': 'لا توجد نتائج مطابقة',
  'autoComplete.defaultLabel': 'حقل الإكمال التلقائي',
  // combobox (مربع مركب: حقل الإدخال هو عنصر التحكم، تصفية بالإدخال + اختيار القيمة)
  'combobox.empty': 'لا توجد خيارات',
  'combobox.noMatch': 'لا توجد خيارات مطابقة',
  'combobox.loading': 'جارٍ التحميل…',
  // input (حقل إدخال)
  'input.clear': 'مسح',
  'input.defaultLabel': 'حقل إدخال',
  'textarea.defaultLabel': 'حقل نص متعدد الأسطر',
  'input.showPassword': 'إظهار كلمة المرور',
  'input.hidePassword': 'إخفاء كلمة المرور',
  // mentions (إشارات)
  'mentions.defaultLabel': 'حقل الإشارات',
  'mentions.noMatch': 'لا توجد إشارات مطابقة',
  // inputNumber (حقل رقمي)
  'inputNumber.increase': 'زيادة',
  'inputNumber.decrease': 'إنقاص',
  'inputNumber.defaultLabel': 'حقل رقمي',
  // slider (منزلق)
  'slider.valueLabel': 'منزلق',
  'slider.minLabel': 'الحد الأدنى',
  'slider.maxLabel': 'الحد الأقصى',
  // rate (تقييم)
  'rate.rate': 'التقييم',
  // form (التحقق من النموذج)
  'form.validationFailed': 'فشل التحقق',
  // tour (جولة تعريفية)
  'tour.skip': 'تخطي',
  'tour.prev': 'السابق',
  'tour.next': 'التالي',
  'tour.finish': 'إنهاء',
  'tour.close': 'إغلاق',
  'tour.dontShowAgain': 'عدم الإظهار مرة أخرى',
  'tour.hint': 'تلميح',
  'tour.hintGotIt': 'فهمت',
  'tour.progress': 'تقدم الجولة',
  // steps (خطوات)
  'steps.prev': 'السابق',
  'steps.next': 'التالي',
  'steps.optional': 'اختياري',
  // anchor (تنقل بالمراسي)
  'anchor.nav': 'التنقل بالمراسي',
  // breadcrumb (مسار تنقل)
  'breadcrumb.nav': 'مسار التنقل',
  'breadcrumb.expand': 'توسيع عناصر مسار التنقل المطوية',
  // backTop (العودة إلى الأعلى)
  'backTop.backToTop': 'العودة إلى الأعلى',
  // pageHeader (رأس الصفحة)
  'pageHeader.back': 'رجوع',
  // splitter (مقسّم لوحات)
  'splitter.adjust': 'تغيير حجم اللوحة',
  'splitter.collapse': 'طي اللوحة',
  'splitter.expand': 'توسيع اللوحة',
  // layout (حاوية تخطيط)
  'layout.sider': 'الشريط الجانبي',
  // sidebar (شريط جانبي قابل للطي)
  'sidebar.nav': 'تنقل الشريط الجانبي',
  'sidebar.toggle': 'طي الشريط الجانبي',
  'sidebar.expand': 'توسيع الشريط الجانبي',
  'sidebar.openMenu': 'فتح الشريط الجانبي',
  'sidebar.closeMenu': 'إغلاق الشريط الجانبي',
  'sidebar.resize': 'تغيير عرض الشريط الجانبي',
  // floatButton (زر عائم)
  'floatButton.action': 'إجراءات سريعة',
  // toggleGroup (مجموعة تبديل)
  'toggleGroup.group': 'مجموعة تبديل',
  // speedDial (إجراءات سريعة عائمة)
  'speedDial.actions': 'الإجراءات',
  // pagination (ترقيم الصفحات)
  'pagination.nav': 'ترقيم الصفحات',
  'pagination.prev': 'الصفحة السابقة',
  'pagination.next': 'الصفحة التالية',
  'pagination.first': 'الصفحة الأولى',
  'pagination.last': 'الصفحة الأخيرة',
  'pagination.page': 'صفحة {page}',
  'pagination.total': 'الإجمالي {total}',
  'pagination.sizes': 'عدد العناصر في الصفحة',
  'pagination.sizePerPage': '{size} لكل صفحة',
  'pagination.goto': 'الانتقال إلى',
  'pagination.pageClassifier': 'صفحة',
  'pagination.jumperInput': 'الانتقال إلى صفحة',
  'pagination.jumpForward': 'الانتقال للأمام',
  'pagination.jumpBackward': 'الانتقال للخلف',
  'pagination.more': 'المزيد',
  // table (جدول)
  'table.selectAll': 'تحديد الكل',
  'table.loading': 'جارٍ التحميل…',
  'table.empty': 'لا توجد بيانات',
  'table.selectRow': 'تحديد الصف {key}',
  'table.expand': 'توسيع/طي',
  'table.summary': 'الإجمالي',
  'table.edit': 'تحرير',
  'table.save': 'حفظ',
  'table.cancel': 'إلغاء',
  'table.editCell': 'تحرير {column} (الصف {key})',
  'table.editHint': 'انقر مرتين للتحرير',
  'table.filter': 'تصفية',
  'table.clear': 'مسح',
  // list (قائمة)
  'list.empty': 'لا توجد بيانات',
  // tree (شجرة)
  'tree.expand': 'توسيع/طي',
  'tree.select': 'تحديد {label}',
  'tree.loading': 'جارٍ التحميل…',
  // timeline (خط زمني)
  'timeline.pending': 'قريبًا',
  // carousel (دوّار)
  'carousel.prev': 'الشريحة السابقة',
  'carousel.next': 'الشريحة التالية',
  'carousel.dot': 'الشريحة {index}',
  'carousel.pause': 'إيقاف التشغيل التلقائي مؤقتًا',
  'carousel.play': 'استئناف التشغيل التلقائي',
  // image (صورة)
  'image.loading': 'جارٍ التحميل…',
  'image.loadFailed': 'تعذر تحميل الصورة',
  'image.defaultAlt': 'صورة',
  // imageGroup (معرض صور)
  'imageGroup.group': 'معرض الصور',
  // avatar (صورة رمزية)
  'avatar.defaultAlt': 'الصورة الرمزية',
  'avatar.changeAvatar': 'تغيير الصورة الرمزية',
  'avatar.foldedMembers': 'جميع الأعضاء',
  // typography (تنسيق نصوص)
  'typography.copy': 'نسخ',
  // tag (وسم)
  'tag.close': 'إغلاق',
  // tagGroup (مجموعة وسوم)
  'tagGroup.group': 'مجموعة الوسوم',
  // tabs (علامات تبويب)
  'tabs.close': 'إغلاق',
  'tabs.ctxClose': 'إغلاق',
  'tabs.ctxNew': 'إنشاء',
  'tabs.ctxCloseOthers': 'إغلاق الأخرى',
  'tabs.ctxCloseLeft': 'إغلاق كل ما على اليسار',
  'tabs.ctxCloseRight': 'إغلاق كل ما على اليمين',
  'tabs.ctxCloseAll': 'إغلاق الكل',
  'tabs.add': 'إضافة علامة تبويب',
  'tabs.newTab': 'علامة تبويب جديدة',
  'tabs.scrollPrev': 'تمرير علامات التبويب للخلف',
  'tabs.scrollNext': 'تمرير علامات التبويب للأمام',
  'tabs.more': 'المزيد من علامات التبويب',
  // buttonGroup (مجموعة أزرار)
  'buttonGroup.group': 'مجموعة أزرار',
  // compact (تجميع مضغوط)
  'compact.group': 'مجموعة مضغوطة',
  // loading (حالة تحميل، بديل عام)
  'loading.loading': 'جارٍ التحميل…',
  // calendar (تقويم)
  'calendar.today': 'اليوم',
  'calendar.prevMonth': 'الشهر السابق',
  'calendar.nextMonth': 'الشهر التالي',
  'calendar.prevYear': 'السنة السابقة',
  'calendar.nextYear': 'السنة التالية',
  // datePicker (منتقي التاريخ)
  'datePicker.placeholder': 'يرجى اختيار التاريخ',
  'datePicker.confirm': 'موافق',
  'datePicker.join': '، ',
  'datePicker.shortcutToday': 'اليوم',
  'datePicker.shortcutThisWeek': 'هذا الأسبوع',
  'datePicker.shortcutThisMonth': 'هذا الشهر',
  'datePicker.shortcutThisYear': 'هذه السنة',
  // dropdown (قائمة منسدلة)
  'dropdown.openMenu': 'فتح القائمة',
  // popover (بطاقة منبثقة)
  'popover.close': 'إغلاق',
  // menu (قائمة)
  'menu.more': 'المزيد من عناصر القائمة',
  // timePicker (منتقي الوقت)
  'timePicker.placeholder': 'يرجى اختيار الوقت',
  'timePicker.hour': 'ساعة',
  'timePicker.minute': 'دقيقة',
  'timePicker.second': 'ثانية',
  // upload (رفع الملفات)
  'upload.select': 'اختيار الملفات',
  'upload.drag': 'اسحب الملفات إلى هنا أو انقر للاختيار',
  'upload.remove': 'إزالة {name}',
  'upload.upload': 'بدء الرفع',
  'upload.empty': 'لا توجد ملفات',
  'upload.maxCount': 'بحد أقصى {max} ملفات',
  'upload.preview': 'معاينة {name}',
  'upload.previewDialog': 'معاينة الملف',
  'upload.closePreview': 'إغلاق المعاينة',
  // transfer (نقل بين قائمتين)
  'transfer.source': 'قائمة المصدر',
  'transfer.target': 'قائمة العناصر المحددة',
  'transfer.toRight': 'نقل إلى اليمين',
  'transfer.toLeft': 'نقل إلى اليسار',
  'transfer.selectAll': 'تحديد الكل',
  'transfer.search': 'بحث',
  'transfer.empty': 'لا توجد بيانات',
  'transfer.noMatch': 'لم يتم العثور على مطابقات',
  // colorPicker (منتقي الألوان)
  'colorPicker.label': 'منتقي الألوان',
  'colorPicker.preset': 'ألوان جاهزة',
  'colorPicker.hue': 'درجة اللون',
  'colorPicker.saturation': 'التشبع',
  'colorPicker.brightness': 'السطوع',
  'colorPicker.red': 'أحمر',
  'colorPicker.green': 'أخضر',
  'colorPicker.blue': 'أزرق',
  // pinInput (إدخال رمز التحقق خانة بخانة)
  'pinInput.group': 'رمز التحقق',
  'pinInput.digit': 'الخانة {position}',
  // dynamicInput (قائمة ديناميكية)
  'dynamicInput.add': 'إضافة',
  'dynamicInput.remove': 'حذف',
  // dynamicTags (وسوم ديناميكية)
  'dynamicTags.inputLabel': 'إضافة وسم',
  'dynamicTags.remove': 'إزالة {label}',
  'dynamicTags.duplicate': 'الوسم موجود بالفعل',
  // editable (تحرير في المكان)
  'editable.edit': 'تحرير',
  'editable.submit': 'موافق',
  'editable.cancel': 'إلغاء',
  // ellipsis (اقتطاع النص)
  'ellipsis.expand': 'توسيع',
  'ellipsis.collapse': 'طي',
  // chart (مخططات)
  'chart.line': 'مخطط خطي',
  'chart.bar': 'مخطط أعمدة',
  'chart.pie': 'مخطط دائري',
  'chart.area': 'مخطط مساحي',
  'chart.donut': 'مخطط حلقي',
  'chart.stacked-bar': 'مخطط أعمدة تراكمي',
  'chart.empty': 'لا توجد بيانات',
  // code (كتلة تعليمات برمجية)
  'code.copy': 'نسخ',
  'code.copied': 'تم النسخ',
  // image (معاينة الصور في طبقة منبثقة)
  'image.preview.close': 'إغلاق المعاينة',
  'image.preview.zoomIn': 'تكبير',
  'image.preview.zoomOut': 'تصغير',
  'image.preview.rotate': 'تدوير',
  'image.preview.download': 'تنزيل',
  'image.preview.alt': 'معاينة الصورة',
  'image.preview.flipX': 'انعكاس أفقي',
  'image.preview.flipY': 'انعكاس رأسي',
  'image.preview.prev': 'الصورة السابقة',
  'image.preview.next': 'الصورة التالية',
  'image.preview.progress': 'الصورة {index} من {total}',
  // qrcode (رمز QR)
  'qrcode.image': 'رمز QR',
  'qrcode.empty': 'لا يوجد محتوى',
  'qrcode.tooLong': 'المحتوى طويل جدًا، يرجى تقصيره',
  'qrcode.expired': 'انتهت صلاحية رمز QR',
  'qrcode.refresh': 'تحديث',
  'qrcode.loading': 'جارٍ التحميل…',
  'qrcode.scanned': 'تم المسح',
  // command (لوحة الأوامر)
  'command.placeholder': 'ابحث عن الأوامر…',
  'command.empty': 'لا توجد أوامر مطابقة',
  'command.search': 'البحث عن الأوامر',
  'command.label': 'لوحة الأوامر',
  'command.loading': 'جارٍ تحميل الأوامر…',
  'command.noResults': 'لا توجد أوامر مطابقة لـ«{query}»',
  'command.recent': 'الأحدث استخدامًا',
  'command.back': 'الرجوع إلى المستوى السابق',
  'command.footer.navigate': 'تنقل',
  'command.footer.select': 'تحديد',
  'command.footer.close': 'إغلاق',
  'command.multiRun': 'تنفيذ {n}',
  // menubar (شريط قوائم التطبيق)
  'menubar.label': 'شريط القوائم',
  'menubar.menu': 'القائمة',
  'menubar.more': 'المزيد من عناصر القائمة',
  // navigationMenu (تنقل متعدد المستويات)
  'navigationMenu.label': 'التنقل',
  'navigationMenu.back': 'رجوع',
  // toolbar (شريط الأدوات)
  'toolbar.label': 'شريط الأدوات',
  'toolbar.more': 'المزيد من الأدوات',
  'toolbar.toggleGroup': 'مجموعة تبديل',
  'toolbar.input': 'حقل إدخال شريط الأدوات',
  'toolbar.item': 'عنصر شريط الأدوات',
  // app-bar (شريط التطبيق)
  'appBar.label': 'شريط التطبيق',
  'appBar.menu': 'القائمة الرئيسية',
  'appBar.more': 'المزيد من الإجراءات',
  'appBar.item': 'إجراء',
  // log (تدفق السجلات)
  'log.empty': 'لا توجد سجلات',
  'log.no-match': 'لا توجد سجلات مطابقة',
  // themeEditor (محرر السمة)
  'themeEditor.label': 'محرر السمة',
  'themeEditor.export': 'تصدير JSON للسمة',
  'themeEditor.search': 'البحث في الرموز',
  'themeEditor.group.color': 'الألوان',
  'themeEditor.group.fontSize': 'حجم الخط',
  'themeEditor.group.space': 'التباعد',
  'themeEditor.group.radius': 'الاستدارة',
  'themeEditor.group.controlHeight': 'ارتفاع عنصر التحكم',
  'themeEditor.group.custom': 'أخرى',
  // bottomNavigation (تنقل سفلي)
  'bottomNavigation.nav': 'التنقل السفلي',
  'upload.retry': 'إعادة محاولة {name}',
  'upload.cancelUpload': 'إلغاء رفع {name}',
  'transfer.count': '{selected}/{total}',
  'dynamicTags.patternMismatch': 'تنسيق غير صحيح',
  'dynamicInput.moveUp': 'تحريك لأعلى',
  'dynamicInput.moveDown': 'تحريك لأسفل',
  'timePicker.now': 'الآن',
  'datePicker.shortcutThisQuarter': 'هذا الربع',
}
