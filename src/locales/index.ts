import type { SupportedLanguageCode } from '@/types/language'

export interface TranslationDictionary {
  nav: {
    dashboard: string
    courses: string
    tutor: string
    quiz: string
    progress: string
    studyPlan: string
    revision: string
    recommendations: string
    knowledgeMap: string
    evaluation: string
    settings: string
    logout: string
  }
  dashboard: {
    tagline: string
    overallMastery: string
    questionsAttempted: string
    quizAccuracy: string
    todaysPlan: string
    revisionDue: string
    startRevision: string
    createPlan: string
    topicsTracked: string
    weakAreas: string
    recommendations: string
  }
  studyPlan: {
    title: string
    subtitle: string
    createButton: string
    todaysGoal: string
    tasks: string
    targetDate: string
    availableTime: string
    preferredDays: string
    planAdjusted: string
    recalculate: string
    markComplete: string
    markIncomplete: string
    min: string
    hours: string
  }
  revision: {
    title: string
    subtitle: string
    reviseNow: string
    dueToday: string
    upcoming: string
    mastered: string
    startSession: string
    lastStudied: string
    dueDate: string
    attempts: string
    recap: string
    keyPoints: string
    mistakes: string
    takeQuiz: string
  }
  common: {
    save: string
    cancel: string
    edit: string
    delete: string
    confirm: string
    loading: string
    error: string
    success: string
    grounded: string
    page: string
    slide: string
    timestamp: string
    language: string
  }
}

export const translations: Record<SupportedLanguageCode, TranslationDictionary> = {
  en: {
    nav: {
      dashboard: 'Dashboard',
      courses: 'My Courses',
      tutor: 'AI Tutor',
      quiz: 'Adaptive Quiz',
      progress: 'Mastery & Progress',
      studyPlan: 'Study Plan',
      revision: 'Revision Engine',
      recommendations: 'Recommendations',
      knowledgeMap: 'Knowledge Map',
      evaluation: 'Evaluation',
      settings: 'Settings',
      logout: 'Sign Out',
    },
    dashboard: {
      tagline: 'Multimodal, Source-Grounded & Adaptive AI Learning Companion',
      overallMastery: 'Overall Mastery',
      questionsAttempted: 'Questions Attempted',
      quizAccuracy: 'Quiz Accuracy',
      todaysPlan: "Today's Study Plan",
      revisionDue: 'Revision Due',
      startRevision: 'Start Revision',
      createPlan: 'Create Study Plan',
      topicsTracked: 'topics tracked',
      weakAreas: 'Weak Topics Needing Attention',
      recommendations: 'Personalized Next Steps',
    },
    studyPlan: {
      title: 'Personalized Study Plan',
      subtitle: 'Goal-oriented curriculum dynamically calibrated to your exam date and mastery.',
      createButton: 'Generate Study Plan',
      todaysGoal: "Today's Goal",
      tasks: 'Daily Planned Tasks',
      targetDate: 'Target / Exam Date',
      availableTime: 'Available Study Time',
      preferredDays: 'Preferred Study Days',
      planAdjusted: 'Your study plan was adjusted based on your recent progress and missed tasks.',
      recalculate: 'Recalculate Plan',
      markComplete: 'Mark Complete',
      markIncomplete: 'Mark Incomplete',
      min: 'min',
      hours: 'hours/day',
    },
    revision: {
      title: 'Spaced-Repetition Revision Engine',
      subtitle: 'Ebbinghaus forgetting-curve schedule targeting conceptual gaps and recent mistakes.',
      reviseNow: 'Revise Now',
      dueToday: 'Due Today',
      upcoming: 'Upcoming Review',
      mastered: 'Recently Mastered',
      startSession: 'Start Guided Revision',
      lastStudied: 'Last studied',
      dueDate: 'Revision due',
      attempts: 'attempts',
      recap: 'Concept Recap',
      keyPoints: 'Important Points',
      mistakes: 'Previous Mistakes & Misconceptions',
      takeQuiz: 'Take 5-Question Revision Quiz',
    },
    common: {
      save: 'Save Changes',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      confirm: 'Confirm',
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Completed successfully',
      grounded: 'Source Grounded',
      page: 'Page',
      slide: 'Slide',
      timestamp: 'Timestamp',
      language: 'Language',
    },
  },
  ta: {
    nav: {
      dashboard: 'முகப்பு பலகை',
      courses: 'எனது பாடங்கள்',
      tutor: 'AI ஆசிரியர்',
      quiz: 'தகவமைப்பு வினாடி வினா',
      progress: 'தேர்ச்சி மற்றும் முன்னேற்றம்',
      studyPlan: 'படிப்பு திட்டம்',
      revision: 'மீள்பார்வை பொறிமுறை',
      recommendations: 'பரிந்துரைகள்',
      knowledgeMap: 'அறிவு வரைபடம்',
      evaluation: 'மதிப்பீடு',
      settings: 'அமைப்புகள்',
      logout: 'வெளியேறு',
    },
    dashboard: {
      tagline: 'பல்வகை மூல ஆதார-அடிப்படையிலான தகவமைப்பு AI கற்றல் துணை',
      overallMastery: 'ஒட்டுமொத்த தேர்ச்சி',
      questionsAttempted: 'முயன்ற கேள்விகள்',
      quizAccuracy: 'வினாடி வினா துல்லியம்',
      todaysPlan: 'இன்றைய படிப்பு திட்டம்',
      revisionDue: 'மீள்பார்வை தேவைப்படுபவை',
      startRevision: 'மீள்பார்வையைத் தொடங்கு',
      createPlan: 'படிப்பு திட்டத்தை உருவாக்கு',
      topicsTracked: 'தலைப்புகள் கண்காணிக்கப்படுகின்றன',
      weakAreas: 'கவனம் தேவைப்படும் பலவீனமான தலைப்புகள்',
      recommendations: 'தனிப்பயனாக்கப்பட்ட அடுத்த படிகள்',
    },
    studyPlan: {
      title: 'தனிப்பயனாக்கப்பட்ட படிப்பு திட்டம்',
      subtitle: 'தேர்வு தேதி மற்றும் தேர்ச்சிக்கு ஏற்ப மாறும் படிப்பு அட்டவணை.',
      createButton: 'படிப்பு திட்டத்தை உருவாக்கு',
      todaysGoal: 'இன்றைய இலக்கு',
      tasks: 'இன்றைய பணிகள்',
      targetDate: 'இலக்கு / தேர்வு தேதி',
      availableTime: 'படிப்புக்கான நேரம்',
      preferredDays: 'விரும்பும் படிப்பு நாட்கள்',
      planAdjusted: 'உங்கள் முன்னேற்றம் மற்றும் விடுபட்ட பணிகளுக்கு ஏற்ப திட்டம் சரிசெய்யப்பட்டது.',
      recalculate: 'திட்டத்தை மறுசீரமைக்கவும்',
      markComplete: 'முடிந்தது எனக் குறிக்கவும்',
      markIncomplete: 'முடிக்கப்படவில்லை',
      min: 'நிமிடம்',
      hours: 'மணி/நாள்',
    },
    revision: {
      title: 'இடைவெளி மீள்பார்வை பொறிமுறை',
      subtitle: 'மறதி வளைவை எதிர்கொண்டு பலவீனமான கருத்துகளை சரிசெய்யும் அமைப்பு.',
      reviseNow: 'இப்போதே மீள்பார்வை செய்',
      dueToday: 'இன்று நிலுவையில் உள்ளவை',
      upcoming: 'வரவிருக்கும் மீள்பார்வை',
      mastered: 'முழுமையாக தேர்ச்சி பெற்றவை',
      startSession: 'வழிகாட்டப்பட்ட மீள்பார்வையைத் தொடங்கு',
      lastStudied: 'கடைசியாக படித்தது',
      dueDate: 'மீள்பார்வை நாள்',
      attempts: 'முயற்சிகள்',
      recap: 'கருத்து சுருக்கம்',
      keyPoints: 'முக்கிய குறிப்புகள்',
      mistakes: 'முந்தைய தவறுகள் மற்றும் தவறான புரிதல்கள்',
      takeQuiz: '5-கேள்வி மீள்பார்வை வினாடி வினா',
    },
    common: {
      save: 'சேமிக்க',
      cancel: 'ரத்து',
      edit: 'திருத்து',
      delete: 'நீக்கு',
      confirm: 'உறுதி செய்',
      loading: 'ஏற்றுகிறது...',
      error: 'பிழை ஏற்பட்டது',
      success: 'வெற்றிகரமாக முடிந்தது',
      grounded: 'ஆதார அடிப்படையிலானது',
      page: 'பக்கம்',
      slide: 'ஸ்லைடு',
      timestamp: 'நேரம்',
      language: 'மொழி',
    },
  },
  hi: {
    nav: {
      dashboard: 'डैशबोर्ड',
      courses: 'मेरे पाठ्यक्रम',
      tutor: 'AI ट्यूटर',
      quiz: 'अनुकूली प्रश्नोत्तरी',
      progress: 'दक्षता एवं प्रगति',
      studyPlan: 'अध्ययन योजना',
      revision: 'पुनरावृत्ति इंजन',
      recommendations: 'सिफारिशें',
      knowledgeMap: 'ज्ञान मानचित्र',
      evaluation: 'मूल्यांकन',
      settings: 'सेटिंग्स',
      logout: 'लॉग आउट',
    },
    dashboard: {
      tagline: 'मल्टीमॉडल, स्रोत-आधारित और अनुकूली AI शिक्षण साथी',
      overallMastery: 'कुल दक्षता',
      questionsAttempted: 'हल किए गए प्रश्न',
      quizAccuracy: 'प्रश्नोत्तरी सटीकता',
      todaysPlan: 'आज की अध्ययन योजना',
      revisionDue: 'पुनरावृत्ति देय',
      startRevision: 'पुनरावृत्ति शुरू करें',
      createPlan: 'अध्ययन योजना बनाएं',
      topicsTracked: 'विषय ट्रैक किए गए',
      weakAreas: 'कमजोर विषय जिन पर ध्यान देना जरूरी है',
      recommendations: 'व्यक्तिगत अगले कदम',
    },
    studyPlan: {
      title: 'व्यक्तिगत अध्ययन योजना',
      subtitle: 'आपकी परीक्षा तिथि और दक्षता के अनुसार स्वचालित रूप से तैयार पाठ्यक्रम।',
      createButton: 'अध्ययन योजना बनाएं',
      todaysGoal: 'आज का लक्ष्य',
      tasks: 'दैनिक नियोजित कार्य',
      targetDate: 'लक्ष्य / परीक्षा तिथि',
      availableTime: 'दैनिक उपलब्ध समय',
      preferredDays: 'पसंदीदा अध्ययन दिवस',
      planAdjusted: 'आपकी प्रगति और छूटे कार्यों के आधार पर योजना को समायोजित किया गया।',
      recalculate: 'योजना पुनर्गणना करें',
      markComplete: 'पूर्ण चिह्नित करें',
      markIncomplete: 'अपूर्ण चिह्नित करें',
      min: 'मिनट',
      hours: 'घंटे/दिन',
    },
    revision: {
      title: 'स्थानिक-पुनरावृत्ति इंजन',
      subtitle: 'अवधारणात्मक कमियों और हाल की गलतियों को सुधारने के लिए वैज्ञानिक कार्यक्रम।',
      reviseNow: 'अभी दोहराएं',
      dueToday: 'आज देय',
      upcoming: 'आगामी समीक्षा',
      mastered: 'सफलतापूर्वक महारत हासिल',
      startSession: 'निर्देशित पुनरावृत्ति शुरू करें',
      lastStudied: 'अंतिम अध्ययन',
      dueDate: 'पुनरावृत्ति देय',
      attempts: 'प्रयास',
      recap: 'अवधारणा सारांश',
      keyPoints: 'महत्वपूर्ण बिंदु',
      mistakes: 'पिछली गलतियां और भ्रांतियां',
      takeQuiz: '5-प्रश्नों की पुनरावृत्ति प्रश्नोत्तरी',
    },
    common: {
      save: 'परिवर्तन सहेजें',
      cancel: 'रद्द करें',
      edit: 'संपादित करें',
      delete: 'हटाएं',
      confirm: 'पुष्टि करें',
      loading: 'लोड हो रहा है...',
      error: 'त्रुटि हुई',
      success: 'सफलतापूर्वक पूरा हुआ',
      grounded: 'स्रोत-सत्यापित',
      page: 'पृष्ठ',
      slide: 'स्लाइड',
      timestamp: 'समय',
      language: 'भाषा',
    },
  },
  te: {
    nav: {
      dashboard: 'డాష్‌బోర్డ్',
      courses: 'నా కోర్సులు',
      tutor: 'AI ట్యూటర్',
      quiz: 'క్విజ్',
      progress: 'పురోగతి',
      studyPlan: 'స్టడీ ప్లాన్',
      revision: 'రివిజన్ ఇంజిన్',
      recommendations: 'సిఫార్సులు',
      knowledgeMap: 'నాలెడ్జ్ మ్యాప్',
      evaluation: 'మూల్యాంకనం',
      settings: 'సెట్టింగ్‌లు',
      logout: 'లాగ్ అవుట్',
    },
    dashboard: {
      tagline: 'మల్టీమోడల్, మూల-ఆధారిత మరియు అనుకూల AI లెర్నింగ్ కంపానియన్',
      overallMastery: 'మొత్తం నైపుణ్యం',
      questionsAttempted: 'ప్రయత్నించిన ప్రశ్నలు',
      quizAccuracy: 'క్విజ్ ఖచ్చితత్వం',
      todaysPlan: 'ఈ రోజు స్టడీ ప్లాన్',
      revisionDue: 'రివిజన్ బాకీ',
      startRevision: 'రివిజన్ ప్రారంభించండి',
      createPlan: 'స్టడీ ప్లాన్ రూపొందించండి',
      topicsTracked: 'టాపిక్స్ ట్రాక్ చేయబడ్డాయి',
      weakAreas: 'శ్రద్ధ అవసరమైన బలహీన అంశాలు',
      recommendations: 'వ్యక్తిగతీకరించిన తదుపరి దశలు',
    },
    studyPlan: {
      title: 'వ్యక్తిగతీకరించిన స్టడీ ప్లాన్',
      subtitle: 'పరీక్ష తేదీ మరియు నైపుణ్యానికి అనుగుణంగా రూపొందించబడింది.',
      createButton: 'ప్లాన్ రూపొందించండి',
      todaysGoal: 'ఈ రోజు లక్ష్యం',
      tasks: 'రోజువారీ పనులు',
      targetDate: 'పరీక్ష తేదీ',
      availableTime: 'అందుబాటులో ఉన్న సమయం',
      preferredDays: 'ప్రాధాన్య రోజులు',
      planAdjusted: 'మీ పురోగతి ఆధారంగా ప్లాన్ సర్దుబాటు చేయబడింది.',
      recalculate: 'మళ్లీ లెక్కించండి',
      markComplete: 'పూర్తయిందిగా గుర్తించండి',
      markIncomplete: 'అసంపూర్తిగా గుర్తించండి',
      min: 'నిమిషాలు',
      hours: 'గంటలు/రోజు',
    },
    revision: {
      title: 'స్పేస్డ్ రిపీటీషన్ రివిజన్ ఇంజిన్',
      subtitle: 'బలహీన అంశాలను సరిదిద్దడానికి శాస్త్రీయ పద్ధతి.',
      reviseNow: 'ఇప్పుడే రివైజ్ చేయండి',
      dueToday: 'ఈ రోజు బాకీ',
      upcoming: 'రాబోయే రివిజన్',
      mastered: 'నైపుణ్యం సాధించబడింది',
      startSession: 'రివిజన్ ప్రారంభించండి',
      lastStudied: 'చివరిగా చదివినది',
      dueDate: 'రివిజన్ గడువు',
      attempts: 'ప్రయత్నాలు',
      recap: 'కాన్సెప్ట్ సారాంశం',
      keyPoints: 'ముఖ్యమైన అంశాలు',
      mistakes: 'మునుపటి తప్పులు',
      takeQuiz: '5 ప్రశ్నల రివిజన్ క్విజ్',
    },
    common: {
      save: 'సేవ్ చేయండి',
      cancel: 'రద్దు చేయండి',
      edit: 'సవరించండి',
      delete: 'తొలగించండి',
      confirm: 'నిర్ధారించండి',
      loading: 'లోడ్ అవుతోంది...',
      error: 'లోపం సంభవించింది',
      success: 'విజయవంతంగా పూర్తయింది',
      grounded: 'మూల ఆధారితం',
      page: 'పేజీ',
      slide: 'స్లైడ్',
      timestamp: 'సమయముద్ర',
      language: 'భాష',
    },
  },
  ml: {
    nav: {
      dashboard: 'ഡാഷ്‌ബോർഡ്',
      courses: 'എന്റെ കോഴ്സുകൾ',
      tutor: 'AI ട്യൂട്ടർ',
      quiz: 'ക്വിസ്',
      progress: 'പുരോഗതി',
      studyPlan: 'പഠന പദ്ധതി',
      revision: 'റിവിഷൻ എഞ്ചിൻ',
      recommendations: 'ശുപാർശകൾ',
      knowledgeMap: 'നോളജ് മാപ്പ്',
      evaluation: 'മൂല്യനിർണ്ണയം',
      settings: 'ക്രമീകരണങ്ങൾ',
      logout: 'പുറത്തുകടക്കുക',
    },
    dashboard: {
      tagline: 'മൾട്ടിമോഡൽ, ഉറവിട അധിഷ്ഠിത അഡാപ്റ്റീവ് AI പഠന സഹായി',
      overallMastery: 'മൊത്തത്തിലുള്ള വൈദഗ്ദ്ധ്യം',
      questionsAttempted: 'പരിശീലിച്ച ചോദ്യങ്ങൾ',
      quizAccuracy: 'കൃത്യത',
      todaysPlan: 'ഇന്നത്തെ പഠന പദ്ധതി',
      revisionDue: 'റിവിഷൻ ആവശ്യമുള്ളവ',
      startRevision: 'റിവിഷൻ ആരംഭിക്കുക',
      createPlan: 'പദ്ധതി തയ്യാറാക്കുക',
      topicsTracked: 'വിഷയങ്ങൾ',
      weakAreas: 'ശ്രദ്ധിക്കേണ്ട ദുർബല വിഷയങ്ങൾ',
      recommendations: 'വ്യക്തിഗത നിർദ്ദേശങ്ങൾ',
    },
    studyPlan: {
      title: 'വ്യക്തിഗത പഠന പദ്ധതി',
      subtitle: 'പരീക്ഷാ തീയതിക്കനുസരിച്ച് തയ്യാറാക്കിയത്.',
      createButton: 'പദ്ധതി തയ്യാറാക്കുക',
      todaysGoal: 'ഇന്നത്തെ ലക്ഷ്യം',
      tasks: 'ഇന്നത്തെ ജോലികൾ',
      targetDate: 'പരീക്ഷാ തീയതി',
      availableTime: 'ലഭ്യമായ സമയം',
      preferredDays: 'ദിവസങ്ങൾ',
      planAdjusted: 'നിങ്ങളുടെ പുരോഗതിക്കനുസരിച്ച് പദ്ധതി പരിഷ്കരിച്ചു.',
      recalculate: 'പുനർഗണിക്കുക',
      markComplete: 'പൂർത്തിയായതായി അടയാളപ്പെടുത്തുക',
      markIncomplete: 'അപൂർണ്ണം',
      min: 'മിനിറ്റ്',
      hours: 'മണിക്കൂർ/ദിവസം',
    },
    revision: {
      title: 'സ്പേസ്ഡ് റിപ്പറ്റീഷൻ റിവിഷൻ',
      subtitle: 'മറവി തടയാനും ധാരണകൾ ഉറപ്പിക്കാനുമുള്ള സംവിധാനം.',
      reviseNow: 'ഇപ്പോൾ റിവൈസ് ചെയ്യുക',
      dueToday: 'ഇന്ന് ചെയ്യേണ്ടത്',
      upcoming: 'വരാനിരിക്കുന്നവ',
      mastered: 'പൂർണ്ണ വൈദഗ്ദ്ധ്യം നേടിയവ',
      startSession: 'റിവിഷൻ സെഷൻ ആരംഭിക്കുക',
      lastStudied: 'അവസാനം പഠിച്ചത്',
      dueDate: 'തീയതി',
      attempts: 'ശ്രമങ്ങൾ',
      recap: 'ആശയ സംഗ്രഹം',
      keyPoints: 'പ്രധാന പോയിന്റുകൾ',
      mistakes: 'മുൻകാല തെറ്റുകൾ',
      takeQuiz: '5 ചോദ്യങ്ങളുടെ റിവിഷൻ ക്വിസ്',
    },
    common: {
      save: 'സംരക്ഷിക്കുക',
      cancel: 'റദ്ദാക്കുക',
      edit: 'തിരുത്തുക',
      delete: 'മായ്ക്കുക',
      confirm: 'സ്ഥിരീകരിക്കുക',
      loading: 'ലോഡ് ചെയ്യുന്നു...',
      error: 'പിശക് സംഭവിച്ചു',
      success: 'വിജയകരമായി പൂർത്തിയായി',
      grounded: 'ഉറവിടം പരിശോധിച്ചു',
      page: 'പേജ്',
      slide: 'സ്ലൈഡ്',
      timestamp: 'സമയം',
      language: 'ഭാഷ',
    },
  },
  kn: {
    nav: {
      dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
      courses: 'ನನ್ನ ಕೋರ್ಸ್‌ಗಳು',
      tutor: 'AI ಶಿಕ್ಷಕ',
      quiz: 'ರಸಪ್ರಶ್ನೆ',
      progress: 'ಪ್ರಗತಿ',
      studyPlan: 'ಅಧ್ಯಯನ ಯೋಜನೆ',
      revision: 'ಪುನರಾವರ್ತನೆ ಎಂಜಿನ್',
      recommendations: 'ಶಿಫಾರಸುಗಳು',
      knowledgeMap: 'ಜ್ಞಾನ ನಕ್ಷೆ',
      evaluation: 'ಮೌಲ್ಯಮಾಪನ',
      settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
      logout: 'ಲಾಗ್ ಔಟ್',
    },
    dashboard: {
      tagline: 'ಮಲ್ಟಿಮೋಡಲ್, ಆಧಾರ-ಆಧಾರಿತ ಹೊಂದಾಣಿಕೆಯ AI ಕಲಿಕಾ ಒಡನಾಡಿ',
      overallMastery: 'ಒಟ್ಟಾರೆ ಪಾಂಡಿತ್ಯ',
      questionsAttempted: 'ಪ್ರಯತ್ನಿಸಿದ ಪ್ರಶ್ನೆಗಳು',
      quizAccuracy: 'ನಿಖರತೆ',
      todaysPlan: 'ಇಂದಿನ ಅಧ್ಯಯನ ಯೋಜನೆ',
      revisionDue: 'ಪುನರಾವರ್ತನೆ ಬಾಕಿ',
      startRevision: 'ಪುನರಾವರ್ತನೆ ಪ್ರಾರಂಭಿಸಿ',
      createPlan: 'ಯೋಜನೆ ರಚಿಸಿ',
      topicsTracked: 'ವಿಷಯಗಳು',
      weakAreas: 'ಗಮನ ಹರಿಸಬೇಕಾದ ದುರ್ಬಲ ವಿಷಯಗಳು',
      recommendations: 'ಮುಂದಿನ ಹಂತಗಳು',
    },
    studyPlan: {
      title: 'ವೈಯಕ್ತಿಕಗೊಳಿಸಿದ ಅಧ್ಯಯನ ಯೋಜನೆ',
      subtitle: 'ಪರೀಕ್ಷೆಯ ದಿನಾಂಕ ಮತ್ತು ಕಲಿಕೆಗೆ ಅನುಗುಣವಾಗಿ ರಚಿಸಲಾಗಿದೆ.',
      createButton: 'ಯೋಜನೆ ರಚಿಸಿ',
      todaysGoal: 'ಇಂದಿನ ಗುರಿ',
      tasks: 'ಕಾರ್ಯಗಳು',
      targetDate: 'ಪರೀಕ್ಷೆಯ ದಿನಾಂಕ',
      availableTime: 'ಲಭ್ಯವಿರುವ ಸಮಯ',
      preferredDays: 'ಆದ್ಯತೆಯ ದಿನಗಳು',
      planAdjusted: 'ನಿಮ್ಮ ಪ್ರಗತಿಯ ಆಧಾರದ ಮೇಲೆ ಯೋಜನೆ ಸರಿಹೊಂದಿಸಲಾಗಿದೆ.',
      recalculate: 'ಮರುಲೆಕ್ಕಾಚಾರ',
      markComplete: 'ಪೂರ್ಣಗೊಂಡಿದೆ ಎಂದು ಗುರುತಿಸಿ',
      markIncomplete: 'ಅಪೂರ್ಣ',
      min: 'ನಿಮಿಷ',
      hours: 'ಗಂಟೆಗಳು/ದಿನ',
    },
    revision: {
      title: 'ಪುನರಾವರ್ತನೆ ಎಂಜಿನ್',
      subtitle: 'ದುರ್ಬಲ ಪರಿಕಲ್ಪನೆಗಳನ್ನು ಬಲಪಡಿಸಲು ವೈಜ್ಞಾನಿಕ ವೇಳಾಪಟ್ಟಿ.',
      reviseNow: 'ಈಗಲೇ ಪುನರಾವರ್ತಿಸಿ',
      dueToday: 'ಇಂದು ಬಾಕಿ',
      upcoming: 'ಮುಂಬರುವ',
      mastered: 'ಪಾಂಡಿತ್ಯ ಸಾಧಿಸಿದೆ',
      startSession: 'ಪುನರಾವರ್ತನೆ ಪ್ರಾರಂಭಿಸಿ',
      lastStudied: 'ಕೊನೆಯ ಅಧ್ಯಯನ',
      dueDate: 'ದಿನಾಂಕ',
      attempts: 'ಪ್ರಯತ್ನಗಳು',
      recap: 'ಪರಿಕಲ್ಪನೆ ಸಾರಾಂಶ',
      keyPoints: 'ಮುಖ್ಯ ಅಂಶಗಳು',
      mistakes: 'ಹಿಂದಿನ ತಪ್ಪುಗಳು',
      takeQuiz: '5 ಪ್ರಶ್ನೆಗಳ ರಸಪ್ರಶ್ನೆ',
    },
    common: {
      save: 'ಉಳಿಸಿ',
      cancel: 'ರದ್ದುಮಾಡಿ',
      edit: 'ತಿದ್ದಿ',
      delete: 'ಅಳಿಸಿ',
      confirm: 'ಖಚಿತಪಡಿಸಿ',
      loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
      error: 'ದೋಷ ಸಂಭವಿಸಿದೆ',
      success: 'ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಂಡಿದೆ',
      grounded: 'ಆಧಾರ-ಸಹಿತ',
      page: 'ಪುಟ',
      slide: 'ಸ್ಲೈಡ್',
      timestamp: 'ಸಮಯಮುದ್ರೆ',
      language: 'ಭಾಷೆ',
    },
  },
  bn: {
    nav: {
      dashboard: 'ড্যাশবোর্ড',
      courses: 'আমার কোর্স',
      tutor: 'AI টিউটর',
      quiz: 'কুইজ',
      progress: 'অগ্রগতি',
      studyPlan: 'স্টাডি প্ল্যান',
      revision: 'রিভিশন ইঞ্জিন',
      recommendations: 'সুপারিশ',
      knowledgeMap: 'নলেজ ম্যাপ',
      evaluation: 'মূল্যায়ন',
      settings: 'সেটিংস',
      logout: 'লগ আউট',
    },
    dashboard: {
      tagline: 'মাল্টিমোডাল, উৎস-ভিত্তিক এবং অভিযোজিত AI শেখার সঙ্গী',
      overallMastery: 'সামগ্রিক দক্ষতা',
      questionsAttempted: 'সমাধানকৃত প্রশ্ন',
      quizAccuracy: 'সঠিকতার হার',
      todaysPlan: 'আজকের স্টাডি প্ল্যান',
      revisionDue: 'রিভিশন বাকি',
      startRevision: 'রিভিশন শুরু করুন',
      createPlan: 'প্ল্যান তৈরি করুন',
      topicsTracked: 'বিষয় ট্র্যাক করা হয়েছে',
      weakAreas: 'দুর্বল বিষয়',
      recommendations: 'পরবর্তী পদক্ষেপ',
    },
    studyPlan: {
      title: 'ব্যক্তিগতকৃত স্টাডি প্ল্যান',
      subtitle: 'পরীক্ষার তারিখ ও দক্ষতার ভিত্তিতে স্বয়ংক্রিয়ভাবে তৈরি।',
      createButton: 'প্ল্যান তৈরি করুন',
      todaysGoal: 'আজকের লক্ষ্য',
      tasks: 'দৈনিক কাজ',
      targetDate: 'পরীক্ষার তারিখ',
      availableTime: 'পড়ার সময়',
      preferredDays: 'পছন্দের দিন',
      planAdjusted: 'আপনার অগ্রগতির ভিত্তিতে প্ল্যানটি সামঞ্জস্য করা হয়েছে।',
      recalculate: 'পুনরায় হিসাব করুন',
      markComplete: 'সম্পূর্ণ চিহ্নিত করুন',
      markIncomplete: 'অসম্পূর্ণ',
      min: 'মিনিট',
      hours: 'ঘণ্টা/দিন',
    },
    revision: {
      title: 'স্পেসড রিপিটেশন রিভিশন ইঞ্জিন',
      subtitle: 'দুর্বল ধারণাগুলি পুনরায় ঝালাই করার বৈজ্ঞানিক পদ্ধতি।',
      reviseNow: 'এখনই রিভিশন দিন',
      dueToday: 'আজ বাকি',
      upcoming: 'আসন্ন',
      mastered: 'দক্ষতা অর্জিত',
      startSession: 'রিভিশন সেশন শুরু করুন',
      lastStudied: 'সর্বশেষ অধ্যয়ন',
      dueDate: 'তারিখ',
      attempts: 'চেষ্টা',
      recap: 'ধারণা সারাংশ',
      keyPoints: 'গুরুত্বপূর্ণ পয়েন্ট',
      mistakes: 'পূর্ববর্তী ভুল ধারণা',
      takeQuiz: '৫-প্রশ্নের রিভিশন কুইজ',
    },
    common: {
      save: 'সংরক্ষণ করুন',
      cancel: 'বাতিল',
      edit: 'সম্পাদনা',
      delete: 'মুছুন',
      confirm: 'নিশ্চিত করুন',
      loading: 'লোড হচ্ছে...',
      error: 'ত্রুটি ঘটেছে',
      success: 'সফলভাবে সম্পন্ন হয়েছে',
      grounded: 'উৎস-ভিত্তিক',
      page: 'পৃষ্ঠা',
      slide: 'স্লাইড',
      timestamp: 'টাইমস্ট্যাম্প',
      language: 'ভাষা',
    },
  },
  mr: {
    nav: {
      dashboard: 'डॅशबोर्ड',
      courses: 'माझे अभ्यासक्रम',
      tutor: 'AI शिक्षक',
      quiz: 'चाचणी',
      progress: 'प्रगती',
      studyPlan: 'अभ्यास योजना',
      revision: 'उजळणी इंजिन',
      recommendations: 'शिफारसी',
      knowledgeMap: 'ज्ञान नकाशा',
      evaluation: 'मूल्यमापन',
      settings: 'सेटिंग्ज',
      logout: 'लॉग आउट',
    },
    dashboard: {
      tagline: 'मल्टीमॉडल, संदर्भ-आधारित आणि अनुकूलनीय AI शिक्षण सोबती',
      overallMastery: 'एकूण प्रभुत्व',
      questionsAttempted: 'सोडवलेले प्रश्न',
      quizAccuracy: 'अचूकता',
      todaysPlan: 'आजची अभ्यास योजना',
      revisionDue: 'उजळणी बाकी',
      startRevision: 'उजळणी सुरू करा',
      createPlan: 'योजना तयार करा',
      topicsTracked: 'विषय',
      weakAreas: 'लक्षात घेण्यासारखे कच्चे विषय',
      recommendations: 'पुढील पावले',
    },
    studyPlan: {
      title: 'वैयक्तिकृत अभ्यास योजना',
      subtitle: 'परीक्षेच्या तारखेनुसार तयार केलेली योजना.',
      createButton: 'योजना तयार करा',
      todaysGoal: 'आजचे ध्येय',
      tasks: 'दैनिक कामे',
      targetDate: 'परीक्षेची तारीख',
      availableTime: 'उपलब्ध वेळ',
      preferredDays: 'पसंतीचे दिवस',
      planAdjusted: 'तुमच्या प्रगतीनुसार योजना सुधारित केली आहे.',
      recalculate: 'पुन्हा मोजा',
      markComplete: 'पूर्ण झाले',
      markIncomplete: 'अपूर्ण',
      min: 'मिनिटे',
      hours: 'तास/दिवस',
    },
    revision: {
      title: 'उजळणी इंजिन',
      subtitle: 'कच्च्या संकल्पना पक्क्या करण्यासाठी शास्त्रीय पद्धत.',
      reviseNow: 'आत्ता उजळणी करा',
      dueToday: 'आज देय',
      upcoming: 'पुढील उजळणी',
      mastered: 'प्रभुत्व मिळवले',
      startSession: 'उजळणी सुरू करा',
      lastStudied: 'शेवटचा अभ्यास',
      dueDate: 'तारीख',
      attempts: 'प्रयत्न',
      recap: 'संकल्पना सारांश',
      keyPoints: 'महत्त्वाचे मुद्दे',
      mistakes: 'मागील चुका',
      takeQuiz: '५ प्रश्नांची उजळणी चाचणी',
    },
    common: {
      save: 'जतन करा',
      cancel: 'रद्द करा',
      edit: 'संपादित करा',
      delete: 'हटवा',
      confirm: 'पुष्टी करा',
      loading: 'लोड होत आहे...',
      error: 'त्रुटी आढळली',
      success: 'यशस्वीरित्या पूर्ण झाले',
      grounded: 'संदर्भित',
      page: 'पान',
      slide: 'स्लाइड',
      timestamp: 'वेळ',
      language: 'भाषा',
    },
  },
}

/**
 * Resolves a nested translation key safely with fallback to English
 */
export const getTranslation = (
  lang: SupportedLanguageCode = 'en',
  section: keyof TranslationDictionary,
  key: string
): string => {
  const dict = translations[lang] || translations.en
  const sec = dict[section] as Record<string, string> | undefined
  if (sec && sec[key]) {
    return sec[key]
  }

  // Fallback to English
  const enSec = translations.en[section] as Record<string, string> | undefined
  if (enSec && enSec[key]) {
    return enSec[key]
  }

  return key
}
