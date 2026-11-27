export type AppLocale = 'ko' | 'en';

export interface SortOptionCopy {
  label: string;
  description?: string;
}

export interface TranslationDictionary {
  common: {
    close: string;
    cancel: string;
    save: string;
    delete: string;
    confirmDelete: string;
    copy: string;
    copied: string;
    download: string;
    restore: string;
    export: string;
    add: string;
    back: string;
    edit: string;
    share: string;
    print: string;
    unnamed: string;
    cardFallback: string;
  };
  header: {
    landingSubtitle: string;
    aboutShort: string;
    aboutFull: string;
    myCard: string;
    vault: string;
    sampleCreateAccount: string;
    createAccount: string;
    exitSample: string;
    lockScreen: string;
    lockScreenTitle: string;
    switchAccount: string;
    addLocalAccount: string;
    lockOrLogout: string;
    pinLockedBadge: string;
    noLockBadge: string;
    accountSecuritySection: string;
    changePin: string;
    setupPin: string;
    encryptedBackup: string;
    settingsAria: string;
    settingsTitle: string;
    managePin: string;
    setupPinFull: string;
    biometrics: string;
    exportBackup: string;
    restoreBackup: string;
    deviceSync: string;
    pwaInstall: string;
    pwaInstalled: string;
    legalPrivacyTerms: string;
    resetLocalData: string;
    switchToVault: string;
    switchToMyCard: string;
    switchViewAria: string;
    localAccountMenuAria: string;
    mainNavAria: string;
    localAccountTitle: (name: string) => string;
    accountCardCounts: (myCount: number, vaultCount: number) => string;
    pinPromptForAccount: (name: string) => string;
    screenLockedToast: string;
    languageToggleAria: string;
  };
  welcome: {
    sectionAria: string;
    eyebrow: string;
    titleKr: string;
    heroSubLine1: string;
    heroSubLine2: string;
    existingAccountTitle: string;
    accountCount: (count: number) => string;
    pinProtected: string;
    noPin: string;
    pinPlaceholder: string;
    pinAria: (name: string) => string;
    login: string;
    bioQuickLogin: (label: string) => string;
    bioPolicyExpired: string;
    openVaultFor: (name: string) => string;
    createNewLocalAccount: string;
    createLocalAccount: string;
    exploreSample: string;
    deleteAccountAria: (name: string) => string;
    deleteAccountTitle: string;
    loginFailed: string;
    bioLoginFailed: string;
    recentlyUsed: string;
    justNow: string;
    hoursAgo: (hours: number) => string;
    yesterday: string;
    daysAgo: (days: number) => string;
    features: ReadonlyArray<{ title: string; sub: string }>;
  };
  onboarding: {
    myCardEmptyAria: string;
    myCardEmptyTitle: string;
    myCardEmptyDesc: string;
    createMyCard: string;
    importVcfLink: string;
    restoreBackupLink: string;
    nextStepAria: string;
    nextStepTitle: string;
    nextStepDesc: string;
    importContactsBtn: string;
    scanCardBtn: string;
    dismissAria: string;
    sampleEmptyAria: string;
    sampleEmptyTitle: string;
    sampleEmptyDesc: string;
    backToVaultList: string;
    backToSampleVault: string;
    saveSharedToVault: string;
    createOwnCardCta: string;
  };
  locked: {
    title: string;
    description: string;
    buttonLabel: string;
  };
  cardActions: {
    toolbarAria: string;
    myCardToolbarAria: string;
    quickQr: string;
    nfc: string;
    copyLink: string;
    editMyCard: string;
    editCard: string;
    print: string;
    shareCard: string;
    shareCardTitle: string;
    deleteMyCard: string;
    call: string;
    sms: string;
    email: string;
    websiteOwner: string;
    websiteVisitor: string;
    saveContact: string;
    saveContactTitle: string;
    shareLink: string;
    orientationLandscape: string;
    orientationPortrait: string;
    memoOpen: string;
    memoClose: string;
    linkCopiedToast: string;
    linkCopyFailedToast: string;
    vcardDownloadedToast: (name: string) => string;
    newCardTitle: string;
    newCardEmptyDesc: string;
    newCardEmptyCta: string;
    newCardGhostDesc: string;
    addNewCardShort: string;
    prevCard: string;
    nextCard: string;
    gridMode: string;
    carouselMode: string;
  };
  vault: {
    toolbarAria: string;
    searchAria: string;
    searchPlaceholder: string;
    listeningPlaceholder: string;
    listeningBadge: string;
    clearSearch: string;
    voiceStartAria: string;
    voiceStopAria: string;
    voiceStartTitle: string;
    voiceStopTitle: string;
    sortBtnAria: (label: string) => string;
    sortBtnTitle: string;
    sortMenuAria: string;
    sortOptions: Record<'smart' | 'frequency' | 'newest' | 'oldest' | 'name' | 'company', SortOptionCopy>;
    manageCategories: string;
    viewModeAria: string;
    gridView: string;
    listView: string;
    addCardMobile: string;
    addCardDesktop: string;
    scanCardTitle: string;
    exportFiltered: (count: number) => string;
    exportAll: (count: number) => string;
    exportedVcfToast: (count: number) => string;
    duplicatesFound: (count: number) => string;
    categoryFilterAria: string;
    categoryAllLabel: string;
    newCategoryPlaceholder: string;
    newCategoryAria: string;
    saveCategoryAria: string;
    cancelCategoryAria: string;
    addCategoryAria: string;
    addCategoryBtn: string;
    sampleCategoryAddWarn: string;
    sampleCategoryEditWarn: string;
    sampleEditBlocked: string;
    categoryAddFailed: string;
    onboardingAria: string;
    onboardingTitle: string;
    onboardingDesc: string;
    importContactsTitle: string;
    importContactsDesc: string;
    scanCardCardTitle: string;
    scanCardCardDesc: string;
    manualEntryTitle: string;
    manualEntryDesc: string;
    emptyCategoryTitle: (category: string) => string;
    emptySearchTitle: string;
    emptyFilteredDesc: string;
    emptyFilteredCta: string;
    backupNudgeAria: string;
    backupNudge30Days: string;
    backupNudgeCards: (count: number) => string;
    backupNudgeSub: string;
    backupSaveBtn: string;
    backupDismissAria: string;
    backupDismissTitle: string;
    table: {
      name: string;
      sortByNameTitle: string;
      title: string;
      company: string;
      sortByCompanyTitle: string;
      category: string;
      photo: string;
      contact: string;
      actions: string;
    };
    myCardBadge: string;
    viewPhoto: string;
    cardDetailAria: (name: string) => string;
    cardDetailTitle: string;
    kebabMenuAria: (name: string) => string;
    kebabMenuTitle: string;
    kebabEdit: string;
    kebabSaveVcf: string;
    kebabExportHtml: string;
    kebabOriginalPhoto: string;
    kebabDelete: string;
    voiceUnsupported: string;
    voiceListening: string;
    voiceRecognized: (text: string) => string;
    voiceMicDenied: string;
    voiceNoSpeech: string;
    voiceNetworkError: string;
    voiceGenericError: (err: string) => string;
    voiceStartFailed: string;
    instantCallAria: (name: string) => string;
    instantSmsAria: (name: string) => string;
    instantEmailAria: (name: string) => string;
  };
  modals: {
    shareAria: string;
    qrTypeAria: string;
    webLinkQr: string;
    vcardQr: string;
    qrGenerating: string;
    scanToViewCard: string;
    scanToSaveContact: string;
    downloadVcf: string;
    printPdf: string;
    emailSignature: string;
    saveWallpaper: string;
    generatingWallpaper: string;
    htmlExport: string;
    saveWallpaperFull: string;
    wallpaperThemeAria: string;
    darkWallpaper: string;
    lightWallpaper: string;
    emailSigBanner: string;
    shareToolbarAria: string;
    saveContactShort: string;
    shareShort: string;
    wallpaperSavedToast: (theme: 'dark' | 'light') => string;
    wallpaperFailedToast: string;
    shareCardIntroText: (summary: string) => string;
    quickQrBadge: string;
    quickQrWakeLock: string;
    quickQrAria: string;
    quickQrScanUrlHint: string;
    quickQrScanVcardHint: string;
    nfcBadge: string;
    nfcAria: string;
    nfcModeUrl: string;
    nfcModeVcard: string;
    nfcModeBoth: string;
    nfcOpenQuickQr: string;
    nfcCopyLink: string;
    printTitle: string;
    printSubtitle: string;
    backToShare: string;
    exportTitle: string;
    exportSubtitle: string;
    exportTabDeploy: string;
    exportTabCode: string;
    emailSigTitle: string;
    emailSigSubtitle: string;
    backupTitle: string;
    backupTabExport: string;
    backupTabRestore: string;
    importContactsTitle: string;
    scanCardTitle: string;
    photoArchiveTitle: string;
    aboutTitle: string;
    createAccountTitle: string;
    createAccountSubtitle: string;
    deleteMyCardTitle: string;
    deleteVaultCardTitle: string;
    deleteMyCardDesc: string;
    deleteVaultCardDesc: string;
    memoAria: string;
    memoPlaceholder: string;
    nfcCloseAria: string;
    nfcTabAria: string;
    nfcHttpsRequired: string;
    nfcUnsupportedTitle: string;
    nfcUnsupportedDesc: string;
    nfcWaitingTitle: string;
    nfcWaitingDesc: string;
    nfcSuccessTitle: string;
    nfcSuccessDesc: string;
    nfcErrorTitle: string;
    nfcReadyTitle: string;
    nfcReadyDesc: string;
    nfcCancelBeam: string;
    nfcRetry: string;
    nfcResend: string;
    nfcStartBeam: string;
    nfcSwitchQuickQr: string;
    nfcToolbarAria: string;
    nfcShareSheet: string;
    nfcUrlSummary: (host: string, bytes: number) => string;
    nfcVcardSummary: (bytes: number) => string;
    nfcBothSummary: (bytes: number) => string;
  };
  footer: {
    navAria: string;
    privacy: string;
    terms: string;
    licenses: string;
  };
  toasts: {
    sampleSaved: string;
    sampleDeleted: string;
    accountCreated: (name: string, bioError?: string) => string;
    accountSignedIn: (name: string) => string;
    accountBioSignedIn: (name: string) => string;
    accountSignedOut: string;
    accountDeleted: (name?: string) => string;
    unlocked: string;
    unlockedBio: string;
    pinSetup: string;
    pinChanged: string;
    lazyPinDismissed: string;
    pwaAlreadyInstalled: string;
    pwaInstallSuccess: string;
    noMyCardForQuickQr: string;
    importedContacts: (count: number) => string;
    sharedCardRequiresAccount: string;
    sharedCardSaved: (name: string) => string;
    myCardCreated: string;
    myCardUpdated: string;
    slugConflict: (slug: string) => string;
    vaultCardUpdated: string;
    vaultCardSaved: (name: string) => string;
    localDataReset: string;
    myCardDeleted: string;
    vaultCardDeleted: string;
    categoryRenamed: (oldName: string, newName: string, count: number) => string;
    categoryMerged: (source: string, target: string, count: number) => string;
    categoryDeleted: (name: string, fallback: string, count: number) => string;
    duplicatesMerged: (count: number, targetName: string) => string;
    backupRestoredReplace: (count: number) => string;
    backupRestoredUpToDate: (count: number) => string;
    backupRestoredUpdated: (added: number, updated: number, skipped: number) => string;
    backupRestoredMerged: (added: number, skipped: number) => string;
    backupRestoredAdded: (added: number) => string;
    sharedLinkCopiedWithUrl: (url: string) => string;
    nfcSentToast: string;
  };
}

export const TRANSLATIONS: Record<AppLocale, TranslationDictionary> = {
  ko: {
    common: {
      close: '닫기',
      cancel: '취소',
      save: '저장',
      delete: '삭제',
      confirmDelete: '삭제 확인',
      copy: '복사',
      copied: '복사됨',
      download: '다운로드',
      restore: '복원',
      export: '내보내기',
      add: '추가',
      back: '돌아가기',
      edit: '편집',
      share: '공유',
      print: '인쇄',
      unnamed: '이름 없음',
      cardFallback: '명함',
    },
    header: {
      landingSubtitle: 'Local-First Vault',
      aboutShort: '앱 소개',
      aboutFull: '앱 소개 · Net to Dot 철학',
      myCard: '내 명함',
      vault: '명함 보관함',
      sampleCreateAccount: '계정 만들기',
      createAccount: '계정 만들기',
      exitSample: '샘플 종료',
      lockScreen: '화면 잠금',
      lockScreenTitle: '즉시 화면 잠금 (Lock Screen)',
      switchAccount: '로컬 계정 전환',
      addLocalAccount: '새 로컬 계정 추가',
      lockOrLogout: '계정 잠금 / 로그아웃',
      pinLockedBadge: 'PIN 잠금',
      noLockBadge: '잠금 없음',
      accountSecuritySection: '계정 보안 및 백업',
      changePin: 'PIN 번호 변경',
      setupPin: '4자리 PIN 설정',
      encryptedBackup: '암호화 백업 (.eerum)',
      settingsAria: '설정 메뉴',
      settingsTitle: '보안 및 기기 설정',
      managePin: 'PIN 번호 변경 / 관리',
      setupPinFull: '4자리 PIN 보안 설정',
      biometrics: '생체 인증 (Face ID / 지문)',
      exportBackup: '보관함 백업 내보내기 (.eerum)',
      restoreBackup: '백업 파일에서 복원',
      deviceSync: '기기 연결 및 동기화',
      pwaInstall: '홈 화면에 앱 설치 (PWA)',
      pwaInstalled: '설치됨',
      legalPrivacyTerms: '개인정보처리방침 · 약관 · 라이선스',
      resetLocalData: '로컬 데이터 초기화',
      switchToVault: '보관함으로 전환',
      switchToMyCard: '내 명함으로 전환',
      switchViewAria: '화면 전환',
      localAccountMenuAria: '로컬 계정 메뉴',
      mainNavAria: '주요 메뉴',
      localAccountTitle: (name) => `로컬 계정: ${name}`,
      accountCardCounts: (myCount, vaultCount) => `내 명함 ${myCount} · 보관함 ${vaultCount}`,
      pinPromptForAccount: (name) => `'${name}' 계정의 PIN을 입력해 주세요.`,
      screenLockedToast: '화면이 보안 잠금되었습니다.',
      languageToggleAria: '언어 전환 (한국어 / English)',
    },
    welcome: {
      sectionAria: 'eerum 로컬 계정 및 디지털 명함 스튜디오',
      eyebrow: 'Private Digital Identity Studio',
      titleKr: '이룸',
      heroSubLine1: '서버에 남지 않는 온디바이스 암호화로',
      heroSubLine2: '당신만의 디지털 명함과 프라이빗 보관함을 완성하세요.',
      existingAccountTitle: '내 로컬 계정 로그인',
      accountCount: (count) => `${count}개 계정`,
      pinProtected: 'PIN 잠금 보호',
      noPin: 'PIN 없음',
      pinPlaceholder: '4자리 PIN 입력',
      pinAria: (name) => `${name} 4자리 PIN 입력`,
      login: '로그인',
      bioQuickLogin: (label) => `${label}로 빠른 로그인`,
      bioPolicyExpired: '7일 보안 정책에 따라 4자리 PIN으로 재인증해 주세요.',
      openVaultFor: (name) => `'${name}' 보관함 열기`,
      createNewLocalAccount: '새 로컬 계정 만들기',
      createLocalAccount: '로컬 계정 만들기',
      exploreSample: '샘플 둘러보기',
      deleteAccountAria: (name) => `${name} 계정 삭제`,
      deleteAccountTitle: '로컬 계정 삭제',
      loginFailed: '로그인하지 못했습니다.',
      bioLoginFailed: '생체 인증으로 로그인하지 못했습니다.',
      recentlyUsed: '최근 사용',
      justNow: '방금 사용',
      hoursAgo: (hours) => `${hours}시간 전`,
      yesterday: '어제',
      daysAgo: (days) => `${days}일 전`,
      features: [
        { title: '3D Studio', sub: '3D Canvas / Custom Card' },
        { title: 'Instant Share', sub: 'Offline QR / 300 DPI PDF' },
        { title: 'Zero-Server Vault', sub: 'AES-256 / On-Device' },
      ],
    },
    onboarding: {
      myCardEmptyAria: '내 명함 시작하기',
      myCardEmptyTitle: '내 명함이 아직 없습니다',
      myCardEmptyDesc: '첫 번째 디지털 명함을 만들어 QR·링크로 바로 공유해 보세요.',
      createMyCard: '내 명함 만들기',
      importVcfLink: '주소록 가져오기 (.vcf)',
      restoreBackupLink: '백업 파일 복원 (.eerum)',
      nextStepAria: '다음 단계 안내',
      nextStepTitle: '내 명함이 완성되었습니다',
      nextStepDesc: '이제 기존 휴대폰 주소록이나 실물 명함을 가져와 나만의 보관함을 채워보세요.',
      importContactsBtn: '주소록 가져오기',
      scanCardBtn: '실물 명함 스캔',
      dismissAria: '안내 닫기',
      sampleEmptyAria: '체험 모드 내 명함 만들기',
      sampleEmptyTitle: '체험 중인 내 명함이 없습니다',
      sampleEmptyDesc: '새 명함을 디자인해 보고 마음에 들면 로컬 계정으로 저장해 보세요.',
      backToVaultList: '보관함 목록으로',
      backToSampleVault: '샘플 보관함 목록으로',
      saveSharedToVault: '명함 보관함에 등록',
      createOwnCardCta: '나만의 럭셔리 디지털 명함 만들기',
    },
    locked: {
      title: '명함 보관함이 잠겨 있습니다',
      description: '공용 기기 및 타인의 무단 열람을 방지하기 위해 보관함이 4자리 보안 PIN으로 보호되고 있습니다.',
      buttonLabel: '보안 PIN 입력하여 잠금 해제',
    },
    cardActions: {
      toolbarAria: '명함 빠른 작업',
      myCardToolbarAria: '내 명함 빠른 작업',
      quickQr: 'Quick QR',
      nfc: 'NFC 전송',
      copyLink: '링크 복사',
      editMyCard: '내 명함 편집',
      editCard: '명함 편집',
      print: '인쇄 · PDF',
      shareCard: '명함 공유',
      shareCardTitle: '명함 공유 (QR, 링크, 인쇄, HTML 내보내기)',
      deleteMyCard: '내 명함 삭제',
      call: '전화 걸기',
      sms: '문자 보내기',
      email: '이메일 작성',
      websiteOwner: '온라인 웹사이트 보기',
      websiteVisitor: '웹사이트 방문',
      saveContact: '연락처 저장',
      saveContactTitle: '연락처에 저장 (vCard 다운로드)',
      shareLink: '명함 링크 공유',
      orientationLandscape: '명함 가로 보기',
      orientationPortrait: '명함 세로 보기',
      memoOpen: '개인 메모 열기',
      memoClose: '개인 메모 닫기',
      linkCopiedToast: '명함 웹 링크가 복사되었습니다.',
      linkCopyFailedToast: '링크 복사에 실패했습니다.',
      vcardDownloadedToast: (name) => `${name}님의 연락처(vCard)가 다운로드되었습니다.`,
      newCardTitle: '새 명함 만들기',
      newCardEmptyDesc: '등록된 내 명함이 없습니다. 첫 번째 럭셔리 디지털 명함을 만들어 보세요.',
      newCardEmptyCta: '지금 첫 명함 생성하기',
      newCardGhostDesc: '새로운 직함이나 소속 단체 명함을 추가합니다',
      addNewCardShort: '새 명함 추가',
      prevCard: '이전 명함',
      nextCard: '다음 명함',
      gridMode: '목록 그리드 보기',
      carouselMode: '3D 캐러셀 보기',
    },
    vault: {
      toolbarAria: '명함 보관함 검색 및 필터 도구 모음',
      searchAria: '명함 보관함 검색',
      searchPlaceholder: '이름·초성, 회사, 만남 장소, 메모 검색',
      listeningPlaceholder: '말씀하세요... (음성 듣는 중)',
      listeningBadge: '듣는 중',
      clearSearch: '검색어 지우기',
      voiceStartAria: '음성으로 검색',
      voiceStopAria: '음성 검색 중지',
      voiceStartTitle: '음성 검색 (클릭하여 음성으로 검색)',
      voiceStopTitle: '음성 인식 중 (클릭하여 중지)',
      sortBtnAria: (label) => `명함 정렬: ${label}`,
      sortBtnTitle: '명함 정렬 기준 변경',
      sortMenuAria: '정렬 옵션',
      sortOptions: {
        smart: { label: '자동 추천순', description: '연락 빈도 · 등록일 반영' },
        frequency: { label: '자주 찾는순', description: '열람 · 연락 횟수순' },
        newest: { label: '최신 등록순', description: '최근 생성 · 등록일순' },
        oldest: { label: '오래된순', description: '이전 생성 · 등록일순' },
        name: { label: '이름순' },
        company: { label: '회사명순' },
      },
      manageCategories: '카테고리 관리',
      viewModeAria: '보관함 보기 방식',
      gridView: '카드 뷰',
      listView: '리스트 뷰',
      addCardMobile: '추가',
      addCardDesktop: '명함 추가',
      scanCardTitle: '실물 명함 사진 등록',
      exportFiltered: (count) => `필터 연락처 저장 (.vcf · ${count}명)`,
      exportAll: (count) => `전체 연락처 저장 (.vcf · ${count}명)`,
      exportedVcfToast: (count) => `${count}명의 연락처를 .vcf 파일로 내보냈습니다.`,
      duplicatesFound: (count) => `중복 연락처 ${count}건 정리`,
      categoryFilterAria: '보관함 카테고리 필터',
      categoryAllLabel: '전체',
      newCategoryPlaceholder: '새 카테고리명',
      newCategoryAria: '새 카테고리 이름 입력',
      saveCategoryAria: '카테고리 저장',
      cancelCategoryAria: '추가 취소',
      addCategoryAria: '새 카테고리 추가',
      addCategoryBtn: '추가',
      sampleCategoryAddWarn: '샘플 모드에서는 카테고리를 추가할 수 없습니다. 로컬 계정을 만들어 보세요.',
      sampleCategoryEditWarn: '샘플 모드에서는 카테고리를 편집할 수 없습니다. 로컬 계정을 만들어 보세요.',
      sampleEditBlocked: '샘플 모드에서는 수정할 수 없습니다.',
      categoryAddFailed: '카테고리를 추가할 수 없습니다.',
      onboardingAria: '명함 보관함 시작하기',
      onboardingTitle: '명함 보관함 채우기',
      onboardingDesc: '기존 연락처나 실물 명함을 추가해 나만의 보관함을 시작해 보세요.',
      importContactsTitle: '주소록에서 가져오기',
      importContactsDesc: '휴대폰 연락처 또는 .vcf 파일 일괄 등록',
      scanCardCardTitle: '실물 명함 촬영·스캔',
      scanCardCardDesc: '종이 명함 사진에서 이름·연락처 자동 추출',
      manualEntryTitle: '직접 명함 입력',
      manualEntryDesc: '새로운 비즈니스 연락처 직접 작성',
      emptyCategoryTitle: (category) => `'${category}' 카테고리에 등록된 명함이 없습니다.`,
      emptySearchTitle: '검색 조건에 일치하는 명함이 없습니다.',
      emptyFilteredDesc: '실물 명함 사진을 촬영하거나 새 명함을 등록해 보세요.',
      emptyFilteredCta: '실물 명함 등록',
      backupNudgeAria: '보관함 안전 백업 안내',
      backupNudge30Days: '마지막 백업 이후 30일이 지났습니다.',
      backupNudgeCards: (count) => `소중한 명함 ${count}장을 기기 분실·초기화에 대비해 백업해 두세요.`,
      backupNudgeSub: '계정 없이 암호화된 로컬 백업 파일(.eerum)로 언제든 안전하게 복원할 수 있습니다.',
      backupSaveBtn: '백업 저장',
      backupDismissAria: '백업 안내 닫기',
      backupDismissTitle: '나중에 하기',
      table: {
        name: '성명',
        sortByNameTitle: '성명순 정렬',
        title: '직함',
        company: '소속 회사/기관',
        sortByCompanyTitle: '회사명순 정렬',
        category: '카테고리',
        photo: '실물 보관',
        contact: '연락처',
        actions: '액션',
      },
      myCardBadge: '· 내 명함',
      viewPhoto: '사진 보기',
      cardDetailAria: (name) => `${name} 명함 상세 보기`,
      cardDetailTitle: '명함 크게 보기',
      kebabMenuAria: (name) => `${name} 관리 더보기 메뉴`,
      kebabMenuTitle: '명함 관리 메뉴 (수정, 삭제, 주소록, HTML)',
      kebabEdit: '명함 수정',
      kebabSaveVcf: '연락처 저장 (.vcf)',
      kebabExportHtml: 'HTML 내보내기',
      kebabOriginalPhoto: '실물 사진 원본',
      kebabDelete: '명함 삭제',
      voiceUnsupported:
        '현재 브라우저에서는 음성 검색(Web Speech API)을 지원하지 않습니다. Chrome 또는 Safari 최신 버전을 권장합니다.',
      voiceListening: '말씀하세요... (듣는 중)',
      voiceRecognized: (text) => `인식됨: "${text}"`,
      voiceMicDenied: '마이크 사용 권한이 차단되었습니다. 브라우저 설정에서 마이크 권한을 허용해 주세요.',
      voiceNoSpeech: '음성이 감지되지 않았습니다. 마이크에 대고 다시 말씀해 주세요.',
      voiceNetworkError: '음성 인식 네트워크 연결에 실패했습니다.',
      voiceGenericError: (err) => `음성 검색에 실패했습니다 (${err})`,
      voiceStartFailed: '음성 검색을 시작하지 못했습니다. 마이크 설정을 확인해 주세요.',
      instantCallAria: (name) => `${name}에게 즉시 전화 걸기`,
      instantSmsAria: (name) => `${name}에게 즉시 문자 보내기`,
      instantEmailAria: (name) => `${name}에게 이메일 보내기`,
    },
    modals: {
      shareAria: '디지털 명함 공유',
      qrTypeAria: 'QR 코드 유형',
      webLinkQr: '웹 링크 QR',
      vcardQr: '연락처 (.vcf) QR',
      qrGenerating: 'QR 생성 중...',
      scanToViewCard: '스캔하여 디지털 명함 보기',
      scanToSaveContact: '스캔하여 연락처 바로 저장',
      downloadVcf: '.vcf 다운로드',
      printPdf: '인쇄 · PDF',
      emailSignature: '이메일 서명',
      saveWallpaper: '배경화면 저장',
      generatingWallpaper: '생성 중...',
      htmlExport: 'HTML 배포',
      saveWallpaperFull: '잠금화면 배경화면 저장',
      wallpaperThemeAria: '잠금화면 배경화면 테마',
      darkWallpaper: '다크 배경화면',
      lightWallpaper: '라이트 배경화면',
      emailSigBanner: 'HTML 이메일 서명 만들기 (Gmail · Mail · Outlook)',
      shareToolbarAria: '명함 공유 및 배포 도구',
      saveContactShort: '연락처 저장',
      shareShort: '공유하기',
      wallpaperSavedToast: (theme) =>
        `잠금화면 QR 배경화면(${theme === 'dark' ? '다크' : '라이트'})이 저장되었습니다.`,
      wallpaperFailedToast: '잠금화면 배경화면 저장에 실패했습니다.',
      shareCardIntroText: (summary) => `${summary}의 디지털 명함입니다.`,
      quickQrBadge: 'QUICK QR PASS',
      quickQrWakeLock: '화면 꺼짐 방지 활성',
      quickQrAria: 'Quick QR 명함 패스',
      quickQrScanUrlHint: '카메라로 스캔하여 디지털 명함 열기',
      quickQrScanVcardHint: '카메라로 스캔하여 연락처 바로 저장',
      nfcBadge: 'WEB NFC BEAM',
      nfcAria: 'NFC 명함 전송',
      nfcModeUrl: '명함 링크',
      nfcModeVcard: '연락처 vCard',
      nfcModeBoth: '링크 + 연락처',
      nfcOpenQuickQr: 'Quick QR 열기',
      nfcCopyLink: '링크 복사',
      printTitle: '인쇄 및 PDF 설정',
      printSubtitle: '인쇄소 재단 규격 및 사무용 A4 출력을 위한 고해상도 PDF를 생성합니다',
      backToShare: '공유 화면으로 돌아가기',
      exportTitle: '독립형 HTML 파일 배포',
      exportSubtitle: '별도 서버나 빌드 없이 동작하는 단일 index.html',
      exportTabDeploy: '배포 안내',
      exportTabCode: '소스코드 미리보기',
      emailSigTitle: '이메일 서명 생성기',
      emailSigSubtitle: 'Gmail · Apple Mail · Outlook 호환 인라인 HTML 테이블 서명',
      backupTitle: '보관함 백업 및 복원',
      backupTabExport: '백업 내보내기',
      backupTabRestore: '백업 파일 복원',
      importContactsTitle: '주소록 가져오기',
      scanCardTitle: '실물 명함 등록',
      photoArchiveTitle: '실물 명함 원본',
      aboutTitle: 'eerum 소개 · Net to Dot 철학',
      createAccountTitle: '로컬 계정 만들기',
      createAccountSubtitle: '서버 전송 없이 이 기기에만 저장되는 암호화 계정입니다.',
      deleteMyCardTitle: '내 명함을 삭제할까요?',
      deleteVaultCardTitle: '명함을 삭제할까요?',
      deleteMyCardDesc:
        '등록된 내 명함 1장을 보관함에서 영구적으로 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.',
      deleteVaultCardDesc:
        '이 명함과 메모·실물 사진 기록이 현재 기기에서 영구적으로 삭제됩니다.',
      memoAria: '메모',
      memoPlaceholder: '대화 핵심 내용, 주요 관심사, 후속 팔로업 일정을 자유롭게 기록하세요.',
      nfcCloseAria: 'NFC 전송 창 닫기',
      nfcTabAria: 'NFC 전송 형식 선택',
      nfcHttpsRequired: 'HTTPS 보안 연결이 필요합니다.',
      nfcUnsupportedTitle: '현재 브라우저에서 Web NFC를 지원하지 않습니다',
      nfcUnsupportedDesc:
        'Web NFC 직접 전송은 Android용 Chrome (HTTPS) 및 설치된 PWA 앱에서 지원됩니다. 아래 Quick QR 패스나 링크 복사로 즉시 명함을 공유할 수 있습니다.',
      nfcWaitingTitle: '상대방 스마트폰 뒷면에 기기를 대세요',
      nfcWaitingDesc:
        'Android 스마트폰 NFC 안테나 부근(뒷면 상단~중앙)을 맞대면 자동으로 전송됩니다.',
      nfcSuccessTitle: '명함 NFC 전송이 완료되었습니다',
      nfcSuccessDesc: '상대방 기기 화면에 명함 열기 또는 연락처 저장 안내가 표시됩니다.',
      nfcErrorTitle: 'NFC 전송에 실패했습니다',
      nfcReadyTitle: 'NFC 명함 전송 준비 완료',
      nfcReadyDesc:
        '아래 버튼을 눌러 NFC 전송 대기를 시작한 뒤 상대방 스마트폰 뒷면에 가까이 대세요.',
      nfcCancelBeam: '전송 대기 취소',
      nfcRetry: '다시 전송 시도',
      nfcResend: '한 번 더 전송하기',
      nfcStartBeam: 'NFC 전송 시작하기',
      nfcSwitchQuickQr: 'Quick QR로 전환',
      nfcToolbarAria: 'NFC 대체 공유 도구',
      nfcShareSheet: '다른 방법으로 공유',
      nfcUrlSummary: (host, bytes) => `태핑 즉시 ${host} 명함 페이지가 열립니다 (${bytes} B)`,
      nfcVcardSummary: (bytes) => `명함 연락처(.vcf)가 스마트폰 주소록으로 전송됩니다 (${bytes} B)`,
      nfcBothSummary: (bytes) => `명함 웹 링크와 연락처(.vcf)를 함께 기록합니다 (${bytes} B)`,
    },
    footer: {
      navAria: '약관 및 라이선스',
      privacy: '개인정보처리방침',
      terms: '이용약관',
      licenses: '라이선스 · 오픈소스',
    },
    toasts: {
      sampleSaved: '체험 모드에 임시 저장되었습니다. 영구 보관하려면 로컬 계정을 만들어 주세요.',
      sampleDeleted: '체험 모드에서 명함이 삭제되었습니다.',
      accountCreated: (name, bioError) =>
        bioError
          ? `'${name}' 계정이 생성되었습니다. (${bioError})`
          : `'${name}' 로컬 계정이 준비되었습니다.`,
      accountSignedIn: (name) => `'${name}' 보관함으로 로그인했습니다.`,
      accountBioSignedIn: (name) => `생체 인증으로 '${name}' 보관함을 열었습니다.`,
      accountSignedOut: '로컬 계정에서 안전하게 로그아웃되었습니다.',
      accountDeleted: (name) =>
        name ? `'${name}' 로컬 계정이 삭제되었습니다.` : '로컬 계정이 삭제되었습니다.',
      unlocked: '보안 잠금이 해제되었습니다.',
      unlockedBio: '생체 인증(Biometrics)으로 잠금이 해제되었습니다.',
      pinSetup: '4자리 PIN 잠금이 설정되었습니다.',
      pinChanged: 'PIN 번호가 성공적으로 변경되었습니다.',
      lazyPinDismissed: '설정 메뉴에서 언제든 4자리 PIN을 설정할 수 있습니다.',
      pwaAlreadyInstalled: '이미 독립형 PWA 앱으로 설치되어 실행 중입니다.',
      pwaInstallSuccess: '앱이 성공적으로 설치되었습니다.',
      noMyCardForQuickQr: '등록된 내 명함이 없습니다. 먼저 명함을 만들어 주세요.',
      importedContacts: (count) => `${count}명의 연락처를 명함 보관함에 추가했습니다.`,
      sharedCardRequiresAccount: '로컬 계정을 만든 뒤 공유받은 명함을 보관함에 저장할 수 있습니다.',
      sharedCardSaved: (name) => `${name}님의 명함이 내 보관함에 저장되었습니다.`,
      myCardCreated: '새 내 명함이 성공적으로 등록되었습니다.',
      myCardUpdated: '내 명함이 업데이트되었습니다.',
      slugConflict: (slug) => `'${slug}' 주소가 이미 사용 중이어서 고유 주소로 자동 저장되었습니다.`,
      vaultCardUpdated: '보관함 명함이 수정되었습니다.',
      vaultCardSaved: (name) => `${name}님의 명함이 보관함에 저장되었습니다.`,
      localDataReset: '현재 기기의 로컬 보관함 데이터가 초기화되었습니다.',
      myCardDeleted: '선택한 내 명함이 삭제되었습니다.',
      vaultCardDeleted: '보관함에서 명함이 삭제되었습니다.',
      categoryRenamed: (oldName, newName, count) =>
        count > 0
          ? `'${oldName}' 카테고리가 '${newName}'(으)로 변경되었습니다. (${count}건)`
          : `'${oldName}' 카테고리가 '${newName}'(으)로 변경되었습니다.`,
      categoryMerged: (source, target, count) =>
        `'${source}'의 명함 ${count}건이 '${target}'(으)로 병합되었습니다.`,
      categoryDeleted: (name, fallback, count) =>
        count > 0
          ? `'${name}' 카테고리가 삭제되었으며 ${count}건이 '${fallback}'(으)로 이동되었습니다.`
          : `'${name}' 카테고리가 삭제되었습니다.`,
      duplicatesMerged: (count, targetName) =>
        `중복 명함 ${count}건이 '${targetName}' 카드로 깔끔하게 통합되었습니다.`,
      backupRestoredReplace: (count) => `백업 파일로 보관함이 교체되었습니다. (총 ${count}장)`,
      backupRestoredUpToDate: (count) =>
        `이미 모든 명함(${count}장)이 최신 상태입니다. 추가할 항목이 없습니다.`,
      backupRestoredUpdated: (added, updated, skipped) =>
        `백업 복원 완료: ${added}장 추가, ${updated}장 최신 정보로 업데이트${skipped > 0 ? `, ${skipped}장 동일 스킵` : ''}`,
      backupRestoredMerged: (added, skipped) =>
        `백업 병합 완료: 새 명함 ${added}장 추가${skipped > 0 ? ` (중복 ${skipped}장 유지)` : ''}`,
      backupRestoredAdded: (added) => `백업에서 새 명함 ${added}장을 복원했습니다.`,
      sharedLinkCopiedWithUrl: (url) => `명함 링크가 복사되었습니다: ${url}`,
      nfcSentToast: 'NFC 명함 전송이 완료되었습니다.',
    },
  },
  en: {
    common: {
      close: 'Close',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      confirmDelete: 'Confirm',
      copy: 'Copy',
      copied: 'Copied',
      download: 'Download',
      restore: 'Restore',
      export: 'Export',
      add: 'Add',
      back: 'Back',
      edit: 'Edit',
      share: 'Share',
      print: 'Print',
      unnamed: 'Untitled',
      cardFallback: 'Card',
    },
    header: {
      landingSubtitle: 'Local-First Vault',
      aboutShort: 'About',
      aboutFull: 'About eerum · Net to Dot',
      myCard: 'My Card',
      vault: 'Vault',
      sampleCreateAccount: 'Sample · Create Account',
      createAccount: 'Create Account',
      exitSample: 'Exit Sample',
      lockScreen: 'Lock',
      lockScreenTitle: 'Lock Screen Now',
      switchAccount: 'Switch Account',
      addLocalAccount: 'Add Local Account',
      lockOrLogout: 'Lock / Sign Out',
      pinLockedBadge: 'PIN Locked',
      noLockBadge: 'No Lock',
      accountSecuritySection: 'Security & Backup',
      changePin: 'Change PIN',
      setupPin: 'Set 4-Digit PIN',
      encryptedBackup: 'Encrypted Backup (.eerum)',
      settingsAria: 'Settings Menu',
      settingsTitle: 'Security & Device Settings',
      managePin: 'Manage 4-Digit PIN',
      setupPinFull: 'Set 4-Digit Security PIN',
      biometrics: 'Biometrics (Face ID / Touch ID)',
      exportBackup: 'Export Vault Backup (.eerum)',
      restoreBackup: 'Restore from Backup',
      deviceSync: 'Device Sync (P2P)',
      pwaInstall: 'Install App (PWA)',
      pwaInstalled: 'Installed',
      legalPrivacyTerms: 'Privacy · Terms · Licenses',
      resetLocalData: 'Reset Local Data',
      switchToVault: 'Switch to Vault',
      switchToMyCard: 'Switch to My Card',
      switchViewAria: 'Switch View',
      localAccountMenuAria: 'Local Account Menu',
      mainNavAria: 'Main Navigation',
      localAccountTitle: (name) => `Local Account: ${name}`,
      accountCardCounts: (myCount, vaultCount) => `My Card ${myCount} · Vault ${vaultCount}`,
      pinPromptForAccount: (name) => `Enter the 4-digit PIN for '${name}'.`,
      screenLockedToast: 'Screen locked.',
      languageToggleAria: 'Switch language (Korean / English)',
    },
    welcome: {
      sectionAria: 'eerum Local Account and Digital Business Card Studio',
      eyebrow: 'Private Digital Identity Studio',
      titleKr: '',
      heroSubLine1: 'Zero-server, on-device encrypted studio',
      heroSubLine2: 'for your personal digital business cards and private vault.',
      existingAccountTitle: 'Sign In to Local Vault',
      accountCount: (count) => `${count} ${count === 1 ? 'account' : 'accounts'}`,
      pinProtected: 'PIN Protected',
      noPin: 'No PIN',
      pinPlaceholder: '4-digit PIN',
      pinAria: (name) => `Enter 4-digit PIN for ${name}`,
      login: 'Unlock',
      bioQuickLogin: (label) => `Unlock with ${label}`,
      bioPolicyExpired: '7-day security policy: please re-authenticate with your 4-digit PIN.',
      openVaultFor: (name) => `Open '${name}' Vault`,
      createNewLocalAccount: 'Create Local Account',
      createLocalAccount: 'Create Local Account',
      exploreSample: 'Explore Sample',
      deleteAccountAria: (name) => `Delete ${name} account`,
      deleteAccountTitle: 'Delete local account',
      loginFailed: 'Could not sign in.',
      bioLoginFailed: 'Biometric sign-in failed.',
      recentlyUsed: 'Recently used',
      justNow: 'Just now',
      hoursAgo: (hours) => `${hours}h ago`,
      yesterday: 'Yesterday',
      daysAgo: (days) => `${days}d ago`,
      features: [
        { title: '3D Studio', sub: '3D Canvas / Custom Card' },
        { title: 'Instant Share', sub: 'Offline QR / 300 DPI PDF' },
        { title: 'Zero-Server Vault', sub: 'AES-256 / On-Device' },
      ],
    },
    onboarding: {
      myCardEmptyAria: 'Get started with My Card',
      myCardEmptyTitle: 'No personal cards yet',
      myCardEmptyDesc: 'Create your first digital business card to share instantly via QR or link.',
      createMyCard: 'Create My Card',
      importVcfLink: 'Import Contacts (.vcf)',
      restoreBackupLink: 'Restore Backup (.eerum)',
      nextStepAria: 'Next step guide',
      nextStepTitle: 'Your card is ready',
      nextStepDesc: 'Now import your existing phone contacts or scan physical cards to build your vault.',
      importContactsBtn: 'Import Contacts',
      scanCardBtn: 'Scan Card',
      dismissAria: 'Dismiss tip',
      sampleEmptyAria: 'Create a sample card',
      sampleEmptyTitle: 'No sample personal cards',
      sampleEmptyDesc: 'Design a card in Sample Mode and create a local account to save it permanently.',
      backToVaultList: 'Back to Vault',
      backToSampleVault: 'Back to Sample Vault',
      saveSharedToVault: 'Save to Vault',
      createOwnCardCta: 'Create Your Own Digital Card',
    },
    locked: {
      title: 'Vault Locked',
      description: 'Your card vault is protected by a 4-digit PIN to prevent unauthorized access on shared devices.',
      buttonLabel: 'Enter PIN to Unlock',
    },
    cardActions: {
      toolbarAria: 'Card quick actions',
      myCardToolbarAria: 'My card quick actions',
      quickQr: 'Quick QR',
      nfc: 'NFC',
      copyLink: 'Copy Link',
      editMyCard: 'Edit',
      editCard: 'Edit',
      print: 'Print',
      shareCard: 'Share',
      shareCardTitle: 'Share Card (QR, Link, Print, HTML Export)',
      deleteMyCard: 'Delete Card',
      call: 'Call',
      sms: 'Message',
      email: 'Email',
      websiteOwner: 'View Website',
      websiteVisitor: 'Visit Website',
      saveContact: 'Save Contact',
      saveContactTitle: 'Save to Contacts (vCard)',
      shareLink: 'Share Link',
      orientationLandscape: 'Landscape View',
      orientationPortrait: 'Portrait View',
      memoOpen: 'Open Memo',
      memoClose: 'Close Memo',
      linkCopiedToast: 'Card link copied.',
      linkCopyFailedToast: 'Failed to copy link.',
      vcardDownloadedToast: (name) => `Saved ${name}'s contact (.vcf).`,
      newCardTitle: 'Create New Card',
      newCardEmptyDesc: 'No personal cards found. Create your first digital business card.',
      newCardEmptyCta: 'Create First Card',
      newCardGhostDesc: 'Add a card for another role or organization',
      addNewCardShort: 'New Card',
      prevCard: 'Previous Card',
      nextCard: 'Next Card',
      gridMode: 'Grid View',
      carouselMode: '3D Carousel',
    },
    vault: {
      toolbarAria: 'Vault search and filter toolbar',
      searchAria: 'Search card vault',
      searchPlaceholder: 'Search name, company, place, memo...',
      listeningPlaceholder: 'Listening...',
      listeningBadge: 'Listening',
      clearSearch: 'Clear search',
      voiceStartAria: 'Search by voice',
      voiceStopAria: 'Stop voice search',
      voiceStartTitle: 'Voice search',
      voiceStopTitle: 'Listening (click to stop)',
      sortBtnAria: (label) => `Sort cards: ${label}`,
      sortBtnTitle: 'Change sort order',
      sortMenuAria: 'Sort options',
      sortOptions: {
        smart: { label: 'Smart Sort', description: 'Frequency & recency' },
        frequency: { label: 'Most Frequent', description: 'Views & contact count' },
        newest: { label: 'Newest', description: 'Recently added' },
        oldest: { label: 'Oldest', description: 'Earliest added' },
        name: { label: 'Name (A–Z)' },
        company: { label: 'Company' },
      },
      manageCategories: 'Manage Categories',
      viewModeAria: 'Vault view mode',
      gridView: 'Grid View',
      listView: 'List View',
      addCardMobile: 'Add',
      addCardDesktop: 'Add Card',
      scanCardTitle: 'Scan or Add Card',
      exportFiltered: (count) => `Export filtered (.vcf · ${count})`,
      exportAll: (count) => `Export all (.vcf · ${count})`,
      exportedVcfToast: (count) => `Exported ${count} contacts to .vcf.`,
      duplicatesFound: (count) => `Merge ${count} duplicate ${count === 1 ? 'group' : 'groups'}`,
      categoryFilterAria: 'Vault category filter',
      categoryAllLabel: 'All',
      newCategoryPlaceholder: 'New category',
      newCategoryAria: 'Enter new category name',
      saveCategoryAria: 'Save category',
      cancelCategoryAria: 'Cancel adding category',
      addCategoryAria: 'Add new category',
      addCategoryBtn: 'Add',
      sampleCategoryAddWarn: 'Categories cannot be added in Sample Mode. Create a local account first.',
      sampleCategoryEditWarn: 'Categories cannot be edited in Sample Mode. Create a local account first.',
      sampleEditBlocked: 'Cannot edit in Sample Mode.',
      categoryAddFailed: 'Could not add category.',
      onboardingAria: 'Start building your vault',
      onboardingTitle: 'Build Your Vault',
      onboardingDesc: 'Import existing contacts or scan physical cards to start your private archive.',
      importContactsTitle: 'Import Contacts',
      importContactsDesc: 'Batch import phone contacts or .vcf files',
      scanCardCardTitle: 'Scan Card',
      scanCardCardDesc: 'Extract name & contact info from card photos',
      manualEntryTitle: 'Enter Manually',
      manualEntryDesc: 'Create a new business contact entry',
      emptyCategoryTitle: (category) => `No cards in '${category}'.`,
      emptySearchTitle: 'No matching cards found.',
      emptyFilteredDesc: 'Try scanning a physical card or adding a new contact.',
      emptyFilteredCta: 'Scan Card',
      backupNudgeAria: 'Vault backup reminder',
      backupNudge30Days: 'It has been over 30 days since your last backup.',
      backupNudgeCards: (count) => `Back up your ${count} saved cards to protect against device loss.`,
      backupNudgeSub: 'Restore anytime with an encrypted .eerum backup file — no account required.',
      backupSaveBtn: 'Backup & Restore',
      backupDismissAria: 'Dismiss backup reminder',
      backupDismissTitle: 'Remind me later',
      table: {
        name: 'Name',
        sortByNameTitle: 'Sort by name',
        title: 'Title',
        company: 'Company',
        sortByCompanyTitle: 'Sort by company',
        category: 'Category',
        photo: 'Photo',
        contact: 'Contact',
        actions: 'Actions',
      },
      myCardBadge: '· My Card',
      viewPhoto: 'View Photo',
      cardDetailAria: (name) => `View ${name}'s card`,
      cardDetailTitle: 'View full card',
      kebabMenuAria: (name) => `More options for ${name}`,
      kebabMenuTitle: 'Card actions (Edit, Delete, vCard, HTML)',
      kebabEdit: 'Edit',
      kebabSaveVcf: 'Save Contact (.vcf)',
      kebabExportHtml: 'Export HTML',
      kebabOriginalPhoto: 'Original Photo',
      kebabDelete: 'Delete Card',
      voiceUnsupported:
        'Voice search (Web Speech API) is not supported in this browser. Try Chrome or Safari.',
      voiceListening: 'Listening...',
      voiceRecognized: (text) => `Heard: "${text}"`,
      voiceMicDenied: 'Microphone access was blocked. Allow microphone permission in browser settings.',
      voiceNoSpeech: 'No speech detected. Please speak into the microphone and try again.',
      voiceNetworkError: 'Network error during speech recognition.',
      voiceGenericError: (err) => `Voice search failed (${err})`,
      voiceStartFailed: 'Could not start voice search. Check your microphone settings.',
      instantCallAria: (name) => `Call ${name}`,
      instantSmsAria: (name) => `Message ${name}`,
      instantEmailAria: (name) => `Email ${name}`,
    },
    modals: {
      shareAria: 'Share digital business card',
      qrTypeAria: 'QR code type',
      webLinkQr: 'Web Link QR',
      vcardQr: 'Contact (.vcf) QR',
      qrGenerating: 'Generating QR...',
      scanToViewCard: 'Scan to open digital card',
      scanToSaveContact: 'Scan to save contact',
      downloadVcf: 'Download .vcf',
      printPdf: 'Print · PDF',
      emailSignature: 'Email Signature',
      saveWallpaper: 'Wallpaper',
      generatingWallpaper: 'Creating...',
      htmlExport: 'Export HTML',
      saveWallpaperFull: 'Save Lockscreen Wallpaper',
      wallpaperThemeAria: 'Lockscreen wallpaper theme',
      darkWallpaper: 'Dark wallpaper',
      lightWallpaper: 'Light wallpaper',
      emailSigBanner: 'Create HTML Email Signature (Gmail · Mail · Outlook)',
      shareToolbarAria: 'Share and export tools',
      saveContactShort: 'Save Contact',
      shareShort: 'Share',
      wallpaperSavedToast: (theme) => `Lockscreen QR wallpaper (${theme}) saved.`,
      wallpaperFailedToast: 'Failed to save lockscreen wallpaper.',
      shareCardIntroText: (summary) => `Digital business card for ${summary}.`,
      quickQrBadge: 'QUICK QR PASS',
      quickQrWakeLock: 'Screen stays awake',
      quickQrAria: 'Quick QR Pass',
      quickQrScanUrlHint: 'Scan with camera to open digital card',
      quickQrScanVcardHint: 'Scan with camera to save contact directly',
      nfcBadge: 'WEB NFC BEAM',
      nfcAria: 'NFC Card Beam',
      nfcModeUrl: 'Card Link',
      nfcModeVcard: 'Contact vCard',
      nfcModeBoth: 'Link + Contact',
      nfcOpenQuickQr: 'Open Quick QR',
      nfcCopyLink: 'Copy Link',
      printTitle: 'Print & PDF Export',
      printSubtitle: 'Generate 300 DPI print-ready sheets with bleed & crop marks',
      backToShare: 'Back to Share',
      exportTitle: 'Standalone HTML Export',
      exportSubtitle: 'Single self-contained index.html requiring no server or build',
      exportTabDeploy: 'Deploy Guide',
      exportTabCode: 'Source Preview',
      emailSigTitle: 'Email Signature',
      emailSigSubtitle: 'Inline HTML table signature for Gmail · Apple Mail · Outlook',
      backupTitle: 'Backup & Restore',
      backupTabExport: 'Export Backup',
      backupTabRestore: 'Restore Backup',
      importContactsTitle: 'Import Contacts',
      scanCardTitle: 'Scan Card',
      photoArchiveTitle: 'Photo Archive',
      aboutTitle: 'About eerum · Net to Dot',
      createAccountTitle: 'Create Local Account',
      createAccountSubtitle: 'Encrypted on-device account stored only on this browser — never uploaded.',
      deleteMyCardTitle: 'Delete this personal card?',
      deleteVaultCardTitle: 'Delete this card?',
      deleteMyCardDesc:
        'This personal card will be permanently removed from your device. This action cannot be undone.',
      deleteVaultCardDesc:
        'This card, its memo, and attached photo record will be permanently deleted from this device.',
      memoAria: 'Memo',
      memoPlaceholder: 'Record meeting notes, key interests, or follow-up plans privately.',
      nfcCloseAria: 'Close NFC beam modal',
      nfcTabAria: 'Choose NFC payload format',
      nfcHttpsRequired: 'HTTPS connection is required.',
      nfcUnsupportedTitle: 'Web NFC is not supported in this browser',
      nfcUnsupportedDesc:
        'Direct Web NFC beaming works on Android Chrome (HTTPS) and installed PWAs. Use Quick QR or Copy Link below to share right away.',
      nfcWaitingTitle: 'Tap the back of the recipient’s phone',
      nfcWaitingDesc:
        'Hold your phone near the NFC antenna area on the back of their Android phone.',
      nfcSuccessTitle: 'Card beamed via NFC',
      nfcSuccessDesc: 'The recipient can now open your card or save your contact directly.',
      nfcErrorTitle: 'NFC transfer failed',
      nfcReadyTitle: 'Ready to beam via NFC',
      nfcReadyDesc:
        'Tap the button below to begin waiting, then hold your phone against the recipient’s phone.',
      nfcCancelBeam: 'Cancel Waiting',
      nfcRetry: 'Try Again',
      nfcResend: 'Beam Again',
      nfcStartBeam: 'Start NFC Beam',
      nfcSwitchQuickQr: 'Switch to Quick QR',
      nfcToolbarAria: 'Alternative sharing options',
      nfcShareSheet: 'More Sharing Options',
      nfcUrlSummary: (host, bytes) => `Opens ${host} card page immediately on tap (${bytes} B)`,
      nfcVcardSummary: (bytes) => `Transfers vCard (.vcf) contact directly (${bytes} B)`,
      nfcBothSummary: (bytes) => `Writes both web link and vCard (.vcf) (${bytes} B)`,
    },
    footer: {
      navAria: 'Legal & Licenses',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      licenses: 'Licenses · Open Source',
    },
    toasts: {
      sampleSaved: 'Saved temporarily in Sample Mode. Create a local account to keep it permanently.',
      sampleDeleted: 'Removed from Sample Mode.',
      accountCreated: (name, bioError) =>
        bioError
          ? `'${name}' account created. (${bioError})`
          : `Local account '${name}' is ready.`,
      accountSignedIn: (name) => `Signed in to '${name}'.`,
      accountBioSignedIn: (name) => `Unlocked '${name}' with biometrics.`,
      accountSignedOut: 'Signed out of local account.',
      accountDeleted: (name) =>
        name ? `Deleted local account '${name}'.` : 'Local account deleted.',
      unlocked: 'Vault unlocked.',
      unlockedBio: 'Unlocked with biometrics.',
      pinSetup: '4-digit PIN lock enabled.',
      pinChanged: 'PIN updated successfully.',
      lazyPinDismissed: 'You can configure a 4-digit PIN anytime in Settings.',
      pwaAlreadyInstalled: 'Already running as an installed standalone PWA.',
      pwaInstallSuccess: 'App installed successfully.',
      noMyCardForQuickQr: 'No personal cards found. Please create a card first.',
      importedContacts: (count) => `Imported ${count} ${count === 1 ? 'contact' : 'contacts'} to your vault.`,
      sharedCardRequiresAccount: 'Create a local account first to save shared cards to your vault.',
      sharedCardSaved: (name) => `Saved ${name}'s card to your vault.`,
      myCardCreated: 'New personal card created.',
      myCardUpdated: 'Personal card updated.',
      slugConflict: (slug) => `Address '${slug}' was already in use; saved with a unique link instead.`,
      vaultCardUpdated: 'Vault card updated.',
      vaultCardSaved: (name) => `Saved ${name}'s card to your vault.`,
      localDataReset: 'Local vault data on this device has been reset.',
      myCardDeleted: 'Personal card deleted.',
      vaultCardDeleted: 'Card removed from vault.',
      categoryRenamed: (oldName, newName, count) =>
        count > 0
          ? `Renamed '${oldName}' to '${newName}' (${count} updated).`
          : `Renamed '${oldName}' to '${newName}'.`,
      categoryMerged: (source, target, count) =>
        `Merged ${count} cards from '${source}' into '${target}'.`,
      categoryDeleted: (name, fallback, count) =>
        count > 0
          ? `Deleted '${name}' and moved ${count} cards to '${fallback}'.`
          : `Deleted '${name}'.`,
      duplicatesMerged: (count, targetName) =>
        `Merged ${count} duplicate cards into '${targetName}'.`,
      backupRestoredReplace: (count) => `Replaced vault from backup (${count} cards).`,
      backupRestoredUpToDate: (count) =>
        `All ${count} cards are already up to date. Nothing new to restore.`,
      backupRestoredUpdated: (added, updated, skipped) =>
        `Backup restored: ${added} added, ${updated} updated${skipped > 0 ? `, ${skipped} unchanged` : ''}.`,
      backupRestoredMerged: (added, skipped) =>
        `Backup merged: ${added} added${skipped > 0 ? ` (${skipped} duplicates kept)` : ''}.`,
      backupRestoredAdded: (added) => `Restored ${added} new cards from backup.`,
      sharedLinkCopiedWithUrl: (url) => `Card link copied: ${url}`,
      nfcSentToast: 'Card beamed via NFC.',
    },
  },
};
