import type { LocaleMessages } from '../types.js'

/**
 * 韩语语言包—— key 全集与 zh-CN 完全一致。
 * （LocaleMessages 类型保证缺 key 在编译期由 locale-completeness 测试拦截。）
 */
export const ko: LocaleMessages = {
  // badge（배지）
  'badge.notifications': '읽지 않은 알림 {count}건',
  // modal（대화상자）
  'modal.close': '닫기',
  'modal.ok': '확인',
  'modal.cancel': '취소',
  // confirm（명령형 확인 대화상자）
  'confirm.ok': '확인',
  'confirm.cancel': '취소',
  // empty（빈 상태 플레이스홀더）
  'empty.noData': '데이터 없음',
  // alert（경고 표시）
  'alert.close': '닫기',
  // drawer（드로어）
  'drawer.close': '닫기',
  'drawer.ok': '확인',
  'drawer.cancel': '취소',
  'drawer.resize': '드로어 크기 조절',
  // message（전역 메시지）
  'message.close': '닫기',
  // notification（알림）
  'notification.close': '닫기',
  'notification.region': '알림',
  // toast（토스트）
  'toast.close': '닫기',
  // snackbar（스낵바）
  'snackbar.close': '닫기',
  // popconfirm（팝오버 확인）
  'popconfirm.ok': '확인',
  'popconfirm.cancel': '취소',
  // select（선택기）
  'select.search': '옵션 검색',
  'select.placeholder': '선택하세요',
  'select.empty': '데이터 없음',
  'select.noMatch': '일치하는 옵션 없음',
  'select.remove': '{label} 제거',
  'select.create': '{label} 생성',
  // cascader（캐스케이드 선택）
  'cascader.placeholder': '선택하세요',
  // tree-select（트리 선택）
  'treeSelect.placeholder': '선택하세요',
  'treeSelect.empty': '데이터 없음',
  'treeSelect.join': ', ',
  'treeSelect.andMore': '외 {count}건',
  // auto-complete（자동 완성）
  'autoComplete.noMatch': '일치하는 결과 없음',
  'autoComplete.defaultLabel': '자동 완성 입력',
  // combobox（콤보박스: 입력창이 컨트롤을 겸함, 입력 필터 + 선택으로 값 가져오기）
  'combobox.empty': '옵션 없음',
  'combobox.noMatch': '일치하는 옵션 없음',
  'combobox.loading': '불러오는 중…',
  // input（입력창）
  'input.clear': '지우기',
  'input.defaultLabel': '입력창',
  'textarea.defaultLabel': '여러 줄 입력창',
  'input.showPassword': '비밀번호 표시',
  'input.hidePassword': '비밀번호 숨기기',
  // mentions（멘션）
  'mentions.defaultLabel': '멘션 입력창',
  'mentions.noMatch': '일치하는 멘션 없음',
  // input-number（숫자 입력창）
  'inputNumber.increase': '증가',
  'inputNumber.decrease': '감소',
  'inputNumber.defaultLabel': '숫자 입력창',
  // slider（슬라이더）
  'slider.valueLabel': '슬라이더',
  'slider.minLabel': '최솟값',
  'slider.maxLabel': '최댓값',
  // rate（평점）
  'rate.rate': '평점',
  // form（폼 유효성 검사）
  'form.validationFailed': '유효성 검사 실패',
  // tour（투어 가이드）
  'tour.skip': '건너뛰기',
  'tour.prev': '이전',
  'tour.next': '다음',
  'tour.finish': '완료',
  'tour.close': '닫기',
  'tour.dontShowAgain': '다시 표시하지 않기',
  'tour.hint': '안내',
  'tour.hintGotIt': '확인',
  'tour.progress': '가이드 진행률',
  // steps（단계 표시기）
  'steps.prev': '이전',
  'steps.next': '다음',
  'steps.optional': '선택',
  // anchor（앵커 내비게이션）
  'anchor.nav': '앵커 내비게이션',
  // breadcrumb（브레드크럼）
  'breadcrumb.nav': '브레드크럼',
  'breadcrumb.expand': '접힌 브레드크럼 항목 펼치기',
  // back-top（맨 위로）
  'backTop.backToTop': '맨 위로',
  // page-header（페이지 헤더）
  'pageHeader.back': '뒤로',
  // splitter（분할 패널）
  'splitter.adjust': '패널 크기 조절',
  'splitter.collapse': '패널 접기',
  'splitter.expand': '패널 펼치기',
  // layout（레이아웃 컨테이너）
  'layout.sider': '사이드바',
  // sidebar（접을 수 있는 사이드바）
  'sidebar.nav': '사이드 내비게이션',
  'sidebar.toggle': '사이드바 접기',
  'sidebar.expand': '사이드바 펼치기',
  'sidebar.openMenu': '사이드바 열기',
  'sidebar.closeMenu': '사이드바 닫기',
  'sidebar.resize': '사이드바 너비 조절',
  // float-button（플로팅 버튼）
  'floatButton.action': '빠른 작업',
  // toggle-group（토글 그룹）
  'toggleGroup.group': '토글 그룹',
  // speed-dial（플로팅 작업 버튼）
  'speedDial.actions': '작업 메뉴',
  // pagination（페이지네이션）
  'pagination.nav': '페이지네이션',
  'pagination.prev': '이전 페이지',
  'pagination.next': '다음 페이지',
  'pagination.first': '첫 페이지',
  'pagination.last': '마지막 페이지',
  'pagination.page': '{page}페이지',
  'pagination.total': '총 {total}건',
  'pagination.sizes': '페이지당 건수',
  'pagination.sizePerPage': '페이지당 {size}건',
  'pagination.goto': '페이지 이동',
  'pagination.pageClassifier': '페이지',
  'pagination.jumperInput': '페이지 번호 입력',
  'pagination.jumpForward': '다음 페이지로 이동',
  'pagination.jumpBackward': '이전 페이지로 이동',
  'pagination.more': '더보기',
  // table（테이블）
  'table.selectAll': '전체 선택',
  'table.loading': '불러오는 중…',
  'table.empty': '데이터 없음',
  'table.selectRow': '{key}행 선택',
  'table.expand': '펼치기/접기',
  'table.summary': '합계',
  'table.edit': '편집',
  'table.save': '저장',
  'table.cancel': '취소',
  'table.editCell': '{column} 편집({key}행)',
  'table.editHint': '두 번 클릭하여 편집',
  'table.filter': '필터',
  'table.clear': '지우기',
  // list（리스트）
  'list.empty': '데이터 없음',
  // tree（트리 컨트롤）
  'tree.expand': '펼치기/접기',
  'tree.select': '{label} 선택',
  'tree.loading': '불러오는 중…',
  // timeline（타임라인）
  'timeline.pending': '출시 예정',
  // carousel（캐러셀）
  'carousel.prev': '이전 슬라이드',
  'carousel.next': '다음 슬라이드',
  'carousel.dot': '{index}번 슬라이드',
  'carousel.pause': '자동 재생 일시정지',
  'carousel.play': '자동 재생 재개',
  // image（이미지）
  'image.loading': '불러오는 중…',
  'image.loadFailed': '이미지를 불러오지 못했습니다',
  'image.defaultAlt': '이미지',
  // image-group（이미지 갤러리 컨테이너, 미리보기 그룹이 공유하는 aria 접근 가능 이름）
  'imageGroup.group': '이미지 갤러리',
  // avatar（아바타）
  'avatar.defaultAlt': '아바타',
  'avatar.changeAvatar': '아바타 변경',
  'avatar.foldedMembers': '모든 멤버',
  // typography（타이포그래피）
  'typography.copy': '복사',
  // tag（태그）
  'tag.close': '닫기',
  // tag-group（태그 그룹）
  'tagGroup.group': '태그 그룹',
  // tabs（탭）
  'tabs.close': '닫기',
  'tabs.ctxClose': '닫기',
  'tabs.ctxNew': '새로 만들기',
  'tabs.ctxCloseOthers': '다른 탭 닫기',
  'tabs.ctxCloseLeft': '왼쪽 탭 모두 닫기',
  'tabs.ctxCloseRight': '오른쪽 탭 모두 닫기',
  'tabs.ctxCloseAll': '모든 탭 닫기',
  'tabs.add': '탭 추가',
  'tabs.newTab': '새 탭',
  'tabs.scrollPrev': '이전 탭으로 스크롤',
  'tabs.scrollNext': '다음 탭으로 스크롤',
  'tabs.more': '더 많은 탭',
  // button-group（버튼 그룹）
  'buttonGroup.group': '버튼 그룹',
  // compact（컴팩트 그룹 컨테이너）
  'compact.group': '컴팩트 그룹',
  // loading（로딩 상태, 공용 폴백）
  'loading.loading': '불러오는 중…',
  // calendar（달력）
  'calendar.today': '오늘',
  'calendar.prevMonth': '이전 달',
  'calendar.nextMonth': '다음 달',
  'calendar.prevYear': '이전 해',
  'calendar.nextYear': '다음 해',
  // date-picker（날짜 선택기）
  'datePicker.placeholder': '날짜를 선택하세요',
  'datePicker.confirm': '확인',
  'datePicker.join': ', ',
  'datePicker.shortcutToday': '오늘',
  'datePicker.shortcutThisWeek': '이번 주',
  'datePicker.shortcutThisMonth': '이번 달',
  'datePicker.shortcutThisYear': '올해',
  // dropdown（드롭다운 메뉴）
  'dropdown.openMenu': '메뉴 열기',
  // popover（팝오버）
  'popover.close': '닫기',
  // menu（메뉴）
  'menu.more': '더 많은 메뉴 항목',
  // time-picker（시간 선택기）
  'timePicker.placeholder': '시간을 선택하세요',
  'timePicker.hour': '시',
  'timePicker.minute': '분',
  'timePicker.second': '초',
  // upload（업로드）
  'upload.select': '파일 선택',
  'upload.drag': '파일을 여기로 끌어다 놓거나 클릭하여 선택하세요',
  'upload.remove': '{name} 제거',
  'upload.upload': '업로드 시작',
  'upload.empty': '파일 없음',
  'upload.maxCount': '최대 {max}개까지 업로드할 수 있습니다',
  'upload.preview': '{name} 미리보기',
  'upload.previewDialog': '파일 미리보기',
  'upload.closePreview': '미리보기 닫기',
  // transfer（트랜스퍼）
  'transfer.source': '원본 목록',
  'transfer.target': '선택한 목록',
  'transfer.toRight': '오른쪽으로 이동',
  'transfer.toLeft': '왼쪽으로 이동',
  'transfer.selectAll': '전체 선택',
  'transfer.search': '검색',
  'transfer.empty': '데이터 없음',
  'transfer.noMatch': '일치하는 항목이 없습니다',
  // color-picker（색상 선택기）
  'colorPicker.label': '색상 선택기',
  'colorPicker.preset': '사전 설정 색상',
  'colorPicker.hue': '색조',
  'colorPicker.saturation': '채도',
  'colorPicker.brightness': '명도',
  'colorPicker.red': '빨강',
  'colorPicker.green': '녹색',
  'colorPicker.blue': '파랑',
  // pin-input（인증번호 분할 입력）
  'pinInput.group': '인증번호',
  'pinInput.digit': '{position}번째 자리',
  // dynamic-input（동적 목록）
  'dynamicInput.add': '추가',
  'dynamicInput.remove': '삭제',
  // dynamic-tags（동적 태그）
  'dynamicTags.inputLabel': '태그 추가',
  'dynamicTags.remove': '{label} 제거',
  'dynamicTags.duplicate': '이미 존재하는 태그입니다',
  // editable（인라인 편집）
  'editable.edit': '편집',
  'editable.submit': '확인',
  'editable.cancel': '취소',
  // ellipsis（텍스트 생략）
  'ellipsis.expand': '펼치기',
  'ellipsis.collapse': '접기',
  // chart（차트）
  'chart.line': '선형 차트',
  'chart.bar': '막대 차트',
  'chart.pie': '원형 차트',
  'chart.area': '영역 차트',
  'chart.donut': '도넛 차트',
  'chart.stacked-bar': '누적 막대 차트',
  'chart.empty': '데이터 없음',
  // code（코드 블록）
  'code.copy': '복사',
  'code.copied': '복사됨',
  // image（이미지 미리보기 오버레이）
  'image.preview.close': '미리보기 닫기',
  'image.preview.zoomIn': '확대',
  'image.preview.zoomOut': '축소',
  'image.preview.rotate': '회전',
  'image.preview.download': '다운로드',
  'image.preview.alt': '이미지 미리보기',
  'image.preview.flipX': '좌우 반전',
  'image.preview.flipY': '상하 반전',
  'image.preview.prev': '이전 이미지',
  'image.preview.next': '다음 이미지',
  'image.preview.progress': '{total}장 중 {index}번째',
  // qrcode（QR 코드）
  'qrcode.image': 'QR 코드',
  'qrcode.empty': '내용 없음',
  'qrcode.tooLong': '내용이 너무 깁니다. 줄인 후 다시 시도하세요',
  'qrcode.expired': 'QR 코드가 만료되었습니다',
  'qrcode.refresh': '새로고침',
  'qrcode.loading': '불러오는 중…',
  'qrcode.scanned': '스캔됨',
  // command（명령 팔레트）
  'command.placeholder': '명령어 검색…',
  'command.empty': '일치하는 명령어 없음',
  'command.search': '명령어 검색',
  'command.label': '명령 팔레트',
  'command.loading': '명령어를 불러오는 중…',
  'command.noResults': '"{query}"와 일치하는 명령어가 없습니다',
  'command.recent': '최근 사용',
  'command.back': '뒤로',
  'command.footer.navigate': '선택',
  'command.footer.select': '실행',
  'command.footer.close': '닫기',
  'command.multiRun': '{n}개 실행',
  // menubar（앱 메뉴 모음）
  'menubar.label': '메뉴 모음',
  'menubar.menu': '메뉴',
  'menubar.more': '더 많은 메뉴 항목',
  // navigation-menu（다단 내비게이션）
  'navigationMenu.label': '내비게이션',
  'navigationMenu.back': '뒤로',
  // toolbar（도구 모음）
  'toolbar.label': '도구 모음',
  'toolbar.more': '더 많은 도구',
  'toolbar.toggleGroup': '토글 그룹',
  'toolbar.input': '도구 모음 입력창',
  'toolbar.item': '도구 모음 항목',
  // app-bar（앱 바）
  'appBar.label': '앱 바',
  'appBar.menu': '기본 메뉴',
  'appBar.more': '더 보기',
  'appBar.item': '작업',
  // log（로그 스트림）
  'log.empty': '로그 없음',
  'log.no-match': '일치하는 로그 없음',
  // theme-editor（테마 에디터）
  'themeEditor.label': '테마 에디터',
  'themeEditor.export': '테마 JSON 내보내기',
  'themeEditor.search': '토큰 검색',
  'themeEditor.group.color': '색상',
  'themeEditor.group.fontSize': '글자 크기',
  'themeEditor.group.space': '간격',
  'themeEditor.group.radius': '모서리 둥글기',
  'themeEditor.group.controlHeight': '컨트롤 높이',
  'themeEditor.group.custom': '기타',
  // bottom-navigation（하단 내비게이션）
  'bottomNavigation.nav': '하단 내비게이션',
  'upload.retry': '{name} 다시 시도',
  'upload.cancelUpload': '{name} 업로드 취소',
  'transfer.count': '{selected}/{total}',
  'dynamicTags.patternMismatch': '형식이 올바르지 않습니다',
  'dynamicInput.moveUp': '위로 이동',
  'dynamicInput.moveDown': '아래로 이동',
  'timePicker.now': '현재',
  'datePicker.shortcutThisQuarter': '이번 분기',
}
