const { prisma } = require('../src/database/connection');
const config = require('../src/config/default');
const { hashPassword } = require('../src/utils/password');
const time = require('../src/utils/time');

// ============================ NAMUNA MA'LUMOTLAR ============================

const CLINIC = {
  id: 1,
  name: 'Tabassum Dental',
  phone: '+998712000000',
  phone2: '+998901000000',
  addressUz: "Toshkent sh., Chilonzor tumani, Bunyodkor shoh ko'chasi, 12-uy",
  addressRu: 'г. Ташкент, Чиланзарский район, проспект Бунёдкор, дом 12',
  landmarkUz: 'Chilonzor metro bekati yonida',
  landmarkRu: 'Рядом со станцией метро «Чиланзар»',
  latitude: 41.2756,
  longitude: 69.2034,
  workingHoursUz: 'Dushanba–Shanba: 09:00–18:00, Yakshanba — dam olish kuni',
  workingHoursRu: 'Понедельник–Суббота: 09:00–18:00, воскресенье — выходной',
  aboutUz:
    "Zamonaviy uskunalar, tajribali shifokorlar va og'riqsiz davolash. 2012-yildan beri minglab bemorlarga chiroyli va sog'lom tabassum hadya etdik.",
  aboutRu:
    'Современное оборудование, опытные врачи и безболезненное лечение. С 2012 года мы подарили здоровую и красивую улыбку тысячам пациентов.',
};

const CATEGORIES = [
  { key: 'diag', icon: '🩺', nameUz: 'Diagnostika', nameRu: 'Диагностика' },
  { key: 'therapy', icon: '🦷', nameUz: 'Terapiya', nameRu: 'Терапия' },
  { key: 'hygiene', icon: '✨', nameUz: 'Gigiena va oqartirish', nameRu: 'Гигиена и отбеливание' },
  { key: 'surgery', icon: '🩹', nameUz: 'Jarrohlik va implantatsiya', nameRu: 'Хирургия и имплантация' },
  { key: 'ortho', icon: '😁', nameUz: 'Ortodontiya', nameRu: 'Ортодонтия' },
  { key: 'prosthetics', icon: '👑', nameUz: 'Protezlash', nameRu: 'Протезирование' },
  { key: 'kids', icon: '🧸', nameUz: 'Bolalar stomatologiyasi', nameRu: 'Детская стоматология' },
];

const AFTER_EXTRACTION_UZ =
  "• Tamponni 20–30 daqiqadan so'ng olib tashlang.\n• 2–3 soat ovqat yemang, kun davomida issiq ichimlik ichmang.\n• Og'izni qattiq chayqamang, yarani til bilan tegmang.\n• 2–3 kun chekmang va spirtli ichimlik ichmang.\n• Kuchli og'riq, shish yoki qon ketishi to'xtamasa — darhol qo'ng'iroq qiling.";
const AFTER_EXTRACTION_RU =
  '• Уберите тампон через 20–30 минут.\n• Не ешьте 2–3 часа, в течение дня не пейте горячее.\n• Не полощите рот активно и не трогайте лунку языком.\n• 2–3 дня не курите и не употребляйте алкоголь.\n• При сильной боли, отёке или непрекращающемся кровотечении — сразу позвоните нам.';

const SERVICES = [
  {
    key: 'consult', cat: 'diag', popular: true, price: 0, oldPrice: 100000, duration: 30,
    doctors: ['aziz', 'malika', 'jasur', 'nilufar'],
    nameUz: "Birlamchi ko'rik va konsultatsiya", nameRu: 'Первичный осмотр и консультация',
    descUz: "Shifokor ko'rigi va shikoyatlarni aniqlash\nTishlar va milklar holatini baholash\nDavolash rejasi va taxminiy narx\nGigiena bo'yicha tavsiyalar",
    descRu: 'Осмотр врача и выяснение жалоб\nОценка состояния зубов и дёсен\nПлан лечения и примерная стоимость\nРекомендации по гигиене',
  },
  {
    key: 'xray', cat: 'diag', price: 120000, duration: 30, doctors: ['aziz', 'malika', 'jasur'],
    nameUz: 'Panoramik rentgen (OPTG)', nameRu: 'Панорамный снимок (ОПТГ)',
    descUz: "Barcha tishlar va jag'ning to'liq tasviri\nYashirin karies va yallig'lanishni aniqlash\nNatija 10 daqiqada tayyor",
    descRu: 'Полный снимок всех зубов и челюстей\nВыявление скрытого кариеса и воспалений\nРезультат готов через 10 минут',
  },
  {
    key: 'caries', cat: 'therapy', popular: true, price: 350000, priceFrom: true, duration: 60, doctors: ['aziz'],
    nameUz: 'Kariesni davolash (plomba)', nameRu: 'Лечение кариеса (пломба)',
    descUz: "Og'riqsizlantirish (anesteziya)\nKariesdan tozalash\nZamonaviy fotopolimer plomba\nSilliqlash va polirovka",
    descRu: 'Обезболивание (анестезия)\nОчистка от кариеса\nСовременная светоотверждаемая пломба\nШлифовка и полировка',
    afterUz: "• 2 soat davomida ovqat yemang.\n• Birinchi kuni qahva, choy va rangli ichimliklardan saqlaning.\n• Plomba baland tuyulsa yoki og'riq bo'lsa, klinikaga murojaat qiling.",
    afterRu: '• Не принимайте пищу в течение 2 часов.\n• В первый день откажитесь от кофе, чая и красящих напитков.\n• Если пломба мешает или появилась боль — обратитесь в клинику.',
  },
  {
    key: 'canal', cat: 'therapy', price: 600000, priceFrom: true, duration: 90, doctors: ['aziz'],
    nameUz: 'Kanal davolash (pulpit)', nameRu: 'Лечение каналов (пульпит)',
    descUz: "Anesteziya ostida og'riqsiz davolash\nKanallarni tozalash va dezinfeksiya\nKanallarni plombalash\nRentgen nazorati",
    descRu: 'Безболезненное лечение под анестезией\nОчистка и дезинфекция каналов\nПломбирование каналов\nРентген-контроль',
    afterUz: "• Anesteziya tarqalguncha (2–3 soat) ovqat yemang.\n• 2–3 kun davomida biroz sezuvchanlik bo'lishi normal holat.\n• Davolangan tish tomonida qattiq ovqat chaynamang.",
    afterRu: '• Не ешьте, пока не пройдёт анестезия (2–3 часа).\n• Небольшая чувствительность 2–3 дня — это нормально.\n• Не жуйте твёрдую пищу на стороне пролеченного зуба.',
  },
  {
    key: 'restoration', cat: 'therapy', price: 700000, priceFrom: true, duration: 90, doctors: ['aziz'],
    nameUz: 'Estetik restavratsiya', nameRu: 'Эстетическая реставрация',
    descUz: "Tish shakli va rangini tiklash\nSinish va darzlarni bartaraf etish\nTabiiy ko'rinishdagi materiallar",
    descRu: 'Восстановление формы и цвета зуба\nУстранение сколов и трещин\nМатериалы с естественным видом',
  },
  {
    key: 'hygiene', cat: 'hygiene', popular: true, price: 400000, oldPrice: 500000, duration: 60, doctors: ['aziz', 'nilufar'],
    nameUz: 'Professional gigiena (Air Flow)', nameRu: 'Профессиональная гигиена (Air Flow)',
    descUz: "Ultratovush bilan tish toshini olib tashlash\nAir Flow bilan pigment dog'larini tozalash\nPolirovka va ftorlash\nUyda parvarish bo'yicha tavsiyalar",
    descRu: 'Удаление зубного камня ультразвуком\nОчистка пигментного налёта Air Flow\nПолировка и фторирование\nРекомендации по домашнему уходу',
    afterUz: "• 2 soat davomida ovqat yemang va chekmang.\n• 2 kun qahva, choy va rangli mahsulotlardan saqlaning.\n• Yumshoq cho'tka va tish ipidan foydalaning.",
    afterRu: '• 2 часа не ешьте и не курите.\n• 2 дня избегайте кофе, чая и красящих продуктов.\n• Пользуйтесь мягкой щёткой и зубной нитью.',
  },
  {
    key: 'whitening', cat: 'hygiene', popular: true, price: 2500000, oldPrice: 3000000, duration: 90, doctors: ['aziz'],
    nameUz: 'Tish oqartirish (ZOOM 4)', nameRu: 'Отбеливание зубов (ZOOM 4)',
    descUz: "Tishlarni 8–10 tongacha oqartirish\nEmalga zarar yetkazmaydigan texnologiya\nBir tashrifda natija\nParvarish uchun maxsus to'plam",
    descRu: 'Осветление зубов до 8–10 тонов\nБезопасная для эмали технология\nРезультат за одно посещение\nНабор для ухода в подарок',
    afterUz: "• 48 soat «oq parhez»ga amal qiling: qahva, choy, sharob, ketchup va rangli sharbatlardan voz keching.\n• 2 kun chekmang.\n• Sezuvchanlik bo'lsa, sezuvchan tishlar uchun pasta ishlating.",
    afterRu: '• 48 часов соблюдайте «белую диету»: откажитесь от кофе, чая, вина, кетчупа и цветных соков.\n• 2 дня не курите.\n• При чувствительности используйте пасту для чувствительных зубов.',
  },
  {
    key: 'extraction', cat: 'surgery', price: 250000, priceFrom: true, duration: 30, doctors: ['jasur'],
    nameUz: "Tish sug'urish", nameRu: 'Удаление зуба',
    descUz: "Og'riqsizlantirish\nEhtiyotkorlik bilan olib tashlash\nYarani parvarish qilish bo'yicha tavsiyalar",
    descRu: 'Обезболивание\nБережное удаление\nРекомендации по уходу за лункой',
    afterUz: AFTER_EXTRACTION_UZ,
    afterRu: AFTER_EXTRACTION_RU,
  },
  {
    key: 'wisdom', cat: 'surgery', price: 700000, priceFrom: true, duration: 60, doctors: ['jasur'],
    nameUz: 'Aql tishini olib tashlash', nameRu: 'Удаление зуба мудрости',
    descUz: "Rentgen asosida reja\nOg'riqsiz jarrohlik usuli\nChok qo'yish va nazorat ko'rigi",
    descRu: 'План на основе снимка\nБезболезненная хирургическая методика\nНаложение швов и контрольный осмотр',
    afterUz: `${AFTER_EXTRACTION_UZ}\n• Yuzga 15 daqiqa davomida sovuq narsa qo'ying.\n• Nazorat ko'rigiga 5–7 kundan keyin keling.`,
    afterRu: `${AFTER_EXTRACTION_RU}\n• Приложите холод к щеке на 15 минут.\n• Приходите на контрольный осмотр через 5–7 дней.`,
  },
  {
    key: 'implant', cat: 'surgery', popular: true, price: 4500000, priceFrom: true, duration: 120, doctors: ['jasur'],
    nameUz: "Implant o'rnatish", nameRu: 'Установка импланта',
    descUz: "3D-diagnostika va rejalashtirish\nPremium implant tizimlari\nUmrbod kafolat\nOg'riqsiz o'rnatish",
    descRu: '3D-диагностика и планирование\nПремиальные системы имплантов\nПожизненная гарантия\nБезболезненная установка',
    afterUz: "• 3 soat ovqat yemang, keyingi 3 kun yumshoq va iliq taomlar iste'mol qiling.\n• Shifokor buyurgan dorilarni o'z vaqtida qabul qiling.\n• Bir hafta sauna, hammom va og'ir jismoniy mashqlardan saqlaning.\n• Chekish implant bitishiga xalaqit beradi — undan voz keching.",
    afterRu: '• 3 часа не ешьте, следующие 3 дня употребляйте мягкую и тёплую пищу.\n• Принимайте назначенные врачом препараты вовремя.\n• Неделю избегайте сауны, бани и тяжёлых нагрузок.\n• Курение мешает приживлению импланта — откажитесь от него.',
  },
  {
    key: 'ortho_consult', cat: 'ortho', price: 100000, duration: 30, doctors: ['malika'],
    nameUz: 'Ortodont konsultatsiyasi', nameRu: 'Консультация ортодонта',
    descUz: "Tishlash holatini tekshirish\nTishlarni to'g'rilash usulini tanlash\nDavolash muddati va narxini hisoblash",
    descRu: 'Диагностика прикуса\nВыбор метода выравнивания зубов\nРасчёт сроков и стоимости лечения',
  },
  {
    key: 'braces', cat: 'ortho', price: 8000000, priceFrom: true, duration: 120, doctors: ['malika'],
    nameUz: "Breket-tizim o'rnatish", nameRu: 'Установка брекет-системы',
    descUz: "Metall, keramik yoki safir breketlar\nShaxsiy davolash rejasi\nMuntazam nazorat ko'riklari",
    descRu: 'Металлические, керамические или сапфировые брекеты\nИндивидуальный план лечения\nРегулярные контрольные осмотры',
    afterUz: "• Dastlabki 3–5 kun biroz noqulaylik bo'lishi normal holat.\n• Qattiq va yopishqoq ovqatlardan (yong'oq, saqich, iris) saqlaning.\n• Har ovqatdan keyin tishlarni maxsus cho'tka bilan tozalang.",
    afterRu: '• Небольшой дискомфорт первые 3–5 дней — это нормально.\n• Избегайте твёрдой и липкой пищи (орехи, жвачка, ириски).\n• После каждого приёма пищи чистите зубы специальной щёткой.',
  },
  {
    key: 'aligners', cat: 'ortho', price: 15000000, priceFrom: true, duration: 60, doctors: ['malika'],
    nameUz: 'Elaynerlar (shaffof kapa)', nameRu: 'Элайнеры (прозрачные капы)',
    descUz: "Ko'rinmas usulda tishlashni tuzatish\nIstalgan vaqtda yechib olish mumkin\n3D modellashtirish",
    descRu: 'Незаметное исправление прикуса\nМожно снять в любой момент\n3D-моделирование',
  },
  {
    key: 'crown_mc', cat: 'prosthetics', price: 1200000, duration: 60, doctors: ['aziz', 'jasur'],
    nameUz: 'Metallokeramik toj', nameRu: 'Металлокерамическая коронка',
    descUz: "Mustahkam va bardoshli\nTabiiy tish rangida\n5 yil kafolat",
    descRu: 'Прочная и долговечная\nЕстественный цвет зуба\nГарантия 5 лет',
  },
  {
    key: 'crown_zr', cat: 'prosthetics', price: 2500000, duration: 60, doctors: ['aziz', 'jasur'],
    nameUz: 'Sirkoniy toj', nameRu: 'Циркониевая коронка',
    descUz: "Maksimal estetika va mustahkamlik\nMetallsiz, allergiya chaqirmaydi\n10 yil kafolat",
    descRu: 'Максимальная эстетика и прочность\nБез металла, не вызывает аллергии\nГарантия 10 лет',
  },
  {
    key: 'veneer', cat: 'prosthetics', price: 3500000, oldPrice: 4000000, duration: 60, doctors: ['aziz'],
    nameUz: 'Vinir (E-max)', nameRu: 'Винир (E-max)',
    descUz: "«Gollivud» tabassumi\nYupqa keramik qoplama\nVaqt o'tishi bilan rangi o'zgarmaydi",
    descRu: 'Голливудская улыбка\nТонкая керамическая накладка\nНе меняет цвет со временем',
  },
  {
    key: 'kids_exam', cat: 'kids', price: 50000, duration: 30, doctors: ['nilufar'],
    nameUz: "Bolalar ko'rigi", nameRu: 'Детский осмотр',
    descUz: "Bolaga do'stona muhit\nTishlar va tishlash holatini tekshirish\nOta-onalar uchun parvarish tavsiyalari",
    descRu: 'Дружелюбная для ребёнка атмосфера\nПроверка зубов и прикуса\nРекомендации по уходу для родителей',
  },
  {
    key: 'kids_treat', cat: 'kids', price: 250000, priceFrom: true, duration: 60, doctors: ['nilufar'],
    nameUz: 'Sut tishini davolash', nameRu: 'Лечение молочного зуба',
    descUz: "O'yin tarzida, qo'rquvsiz davolash\nRangli plombalar\nBolalar uchun xavfsiz materiallar",
    descRu: 'Лечение в игровой форме, без страха\nЦветные пломбы\nБезопасные для детей материалы',
    afterUz: "• 2 soat ovqat yemang.\n• Bola lunjini tishlab olmasligini kuzating (anesteziyadan keyin).\n• Kun davomida shirinliklarni cheklang.",
    afterRu: '• 2 часа не ешьте.\n• Следите, чтобы ребёнок не прикусил щёку после анестезии.\n• В течение дня ограничьте сладкое.',
  },
  {
    key: 'fluoride', cat: 'kids', price: 150000, duration: 30, doctors: ['nilufar'],
    nameUz: 'Ftorlash va germetizatsiya', nameRu: 'Фторирование и герметизация',
    descUz: "Emalni mustahkamlash\nKariesdan himoya\nOg'riqsiz va tez",
    descRu: 'Укрепление эмали\nЗащита от кариеса\nБыстро и безболезненно',
  },
];

const day = (on, start = '09:00', end = '18:00', breakStart = '13:00', breakEnd = '14:00') => ({
  on,
  start,
  end,
  breakStart,
  breakEnd,
});

const DOCTORS = [
  {
    key: 'aziz',
    fullName: 'Dr. Aziz Karimov',
    specialtyUz: 'Stomatolog-terapevt',
    specialtyRu: 'Стоматолог-терапевт',
    experienceYears: 12,
    color: '#2563eb',
    bioUz: "Karies va kanallarni og'riqsiz davolash, estetik restavratsiya bo'yicha mutaxassis. Germaniyada malaka oshirgan.",
    bioRu: 'Специалист по безболезненному лечению кариеса и каналов, эстетической реставрации. Повышал квалификацию в Германии.',
    schedule: { 0: day(false), 1: day(true), 2: day(true), 3: day(true), 4: day(true), 5: day(true), 6: day(true) },
  },
  {
    key: 'malika',
    fullName: 'Dr. Malika Rahimova',
    specialtyUz: 'Ortodont',
    specialtyRu: 'Ортодонт',
    experienceYears: 9,
    color: '#db2777',
    bioUz: "Breketlar va elaynerlar yordamida tishlashni tuzatish bo'yicha mutaxassis. 1500 dan ortiq bemorga tekis tabassum hadya etgan.",
    bioRu: 'Специалист по исправлению прикуса брекетами и элайнерами. Подарила ровную улыбку более чем 1500 пациентам.',
    schedule: {
      0: day(false),
      1: day(true, '10:00', '17:00'),
      2: day(false, '10:00', '17:00'),
      3: day(true, '10:00', '17:00'),
      4: day(false, '10:00', '17:00'),
      5: day(true, '10:00', '17:00'),
      6: day(true, '10:00', '17:00'),
    },
  },
  {
    key: 'jasur',
    fullName: 'Dr. Jasur Toshmatov',
    specialtyUz: 'Jarroh-implantolog',
    specialtyRu: 'Хирург-имплантолог',
    experienceYears: 15,
    color: '#059669',
    bioUz: "Murakkab tish sug'urish va implantatsiya bo'yicha mutaxassis. 3000 dan ortiq implant o'rnatgan.",
    bioRu: 'Специалист по сложному удалению зубов и имплантации. Установил более 3000 имплантов.',
    schedule: {
      0: day(false),
      1: day(true, '09:00', '17:00'),
      2: day(true, '09:00', '17:00'),
      3: day(true, '09:00', '17:00'),
      4: day(true, '09:00', '17:00'),
      5: day(true, '09:00', '17:00'),
      6: day(true, '09:00', '14:00', null, null),
    },
  },
  {
    key: 'nilufar',
    fullName: 'Dr. Nilufar Saidova',
    specialtyUz: 'Bolalar stomatologi',
    specialtyRu: 'Детский стоматолог',
    experienceYears: 7,
    color: '#d97706',
    bioUz: "Bolalar bilan ishlashni yaxshi ko'radi: davolash qo'rquvsiz va o'yin tarzida o'tadi.",
    bioRu: 'Любит работать с детьми: лечение проходит без страха и в игровой форме.',
    schedule: {
      0: day(false, '09:00', '15:00', null, null),
      1: day(true, '09:00', '15:00', null, null),
      2: day(true, '09:00', '15:00', null, null),
      3: day(true, '09:00', '15:00', null, null),
      4: day(true, '09:00', '15:00', null, null),
      5: day(true, '09:00', '15:00', null, null),
      6: day(true, '09:00', '15:00', null, null),
    },
  },
];

const PATIENTS = [
  ['Dilshod', 'Ergashev', '+998901000101', 'uz'],
  ['Gulnora', 'Yusupova', '+998931000102', 'uz'],
  ['Sardor', 'Aliyev', '+998971000103', 'uz'],
  ['Анна', 'Ким', '+998901000104', 'ru'],
  ['Bekzod', 'Nurmatov', '+998911000105', 'uz'],
  ['Madina', 'Xolmatova', '+998941000106', 'uz'],
  ['Ольга', 'Петрова', '+998901000107', 'ru'],
  ['Javohir', 'Qodirov', '+998991000108', 'uz'],
  ['Shahnoza', 'Azimova', '+998901000109', 'uz'],
  ['Тимур', 'Ахмедов', '+998931000110', 'ru'],
  ['Zarina', 'Mirzayeva', '+998971000111', 'uz'],
  ['Otabek', 'Sobirov', '+998901000112', 'uz'],
];

const TEXTS = {
  uz: {
    diagnosis: [
      'Tishlar va milklar holati qoniqarli',
      "O'rta karies, 36-tish. Fotopolimer plomba qo'yildi",
      'Tish toshi, yengil gingivit belgilari',
      'Surunkali pulpit, 46-tish. Kanallar plombalandi',
      "Tishlash buzilishi (II sinf). Davolash rejasi tuzildi",
    ],
    recommendation: [
      "6 oydan so'ng profilaktik ko'rikka keling",
      'Tish ipidan har kuni foydalaning',
      'Sezuvchan tishlar uchun pasta ishlating',
      "Bir haftadan so'ng nazorat ko'rigiga keling",
      'Kuniga 2 marta, kamida 2 daqiqa tish yuving',
    ],
    feedback: ["Juda yoqdi, og'riqsiz davolashdi!", "Shifokor juda e'tiborli, rahmat!", 'Tez va sifatli xizmat'],
    complaint: ["Tishim og'riyapti", 'Sovuqqa sezuvchanlik', "Milkim qonayapti", "Profilaktik ko'rik"],
    cancel: "Rejalar o'zgardi",
  },
  ru: {
    diagnosis: [
      'Состояние зубов и дёсен удовлетворительное',
      'Средний кариес, зуб 36. Установлена светоотверждаемая пломба',
      'Зубной камень, признаки лёгкого гингивита',
      'Хронический пульпит, зуб 46. Каналы запломбированы',
    ],
    recommendation: [
      'Профилактический осмотр через 6 месяцев',
      'Используйте зубную нить ежедневно',
      'Используйте пасту для чувствительных зубов',
      'Контрольный осмотр через неделю',
    ],
    feedback: ['Всё прошло отлично, спасибо доктору!', 'Очень внимательный персонал', 'Быстро и качественно'],
    complaint: ['Болит зуб', 'Чувствительность к холодному', 'Кровоточат дёсны', 'Профилактический осмотр'],
    cancel: 'Планы изменились',
  },
};

// ============================ YORDAMCHI FUNKSIYALAR ============================

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function ensureAdmin() {
  const count = await prisma.admin.count();
  if (count > 0) return;
  await prisma.admin.create({
    data: {
      username: config.admin.username.toLowerCase(),
      passwordHash: hashPassword(config.admin.password),
      fullName: 'Administrator',
    },
  });
}

async function wipe() {
  await prisma.notification.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.timeOff.deleteMany();
  await prisma.service.deleteMany();
  await prisma.category.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.broadcast.deleteMany();
  await prisma.clinic.deleteMany();
}

function buildDemoAppointments({ doctors, services, patients }) {
  const random = createRandom(20260915);
  const pickOne = (list) => list[Math.floor(random() * list.length)];
  const now = new Date();
  const today = time.nowLocal().date;
  const busy = new Map();
  const rows = [];

  const tryAdd = (offset, doctor) => {
    const date = time.addDays(today, offset);
    const schedule = doctor.schedule[time.weekday(date)];
    if (!schedule?.on) return;

    const service = pickOne(services.filter((s) => s.doctorKeys.includes(doctor.key)));
    const duration = service.durationMin;
    const start = time.toMinutes(schedule.start);
    const end = time.toMinutes(schedule.end);
    const breakStart = schedule.breakStart ? time.toMinutes(schedule.breakStart) : null;
    const breakEnd = schedule.breakEnd ? time.toMinutes(schedule.breakEnd) : null;
    const key = `${doctor.id}|${date}`;
    const taken = busy.get(key) || [];

    const candidates = [];
    for (let t = start; t + duration <= end; t += 30) {
      if (breakStart !== null && t < breakEnd && t + duration > breakStart) continue;
      if (taken.some(([s, e]) => t < e && t + duration > s)) continue;
      candidates.push(t);
    }
    if (!candidates.length) return;

    const t = pickOne(candidates);
    busy.set(key, [...taken, [t, t + duration]]);

    const startTime = time.toTime(t);
    const endTime = time.toTime(t + duration);
    const startAt = time.toInstant(date, startTime);
    const endAt = time.toInstant(date, endTime);
    const patient = pickOne(patients);
    const lang = patient.language === 'ru' ? 'ru' : 'uz';
    const texts = TEXTS[lang];

    let status;
    if (endAt < now) {
      const r = random();
      status = r < 0.82 ? 'COMPLETED' : r < 0.91 ? 'NO_SHOW' : 'CANCELLED';
    } else {
      status = random() < 0.6 ? 'CONFIRMED' : 'PENDING';
    }

    const createdAt = new Date(Math.min(startAt.getTime() - (1 + Math.floor(random() * 5)) * 86400000, now.getTime() - 3600000));
    const row = {
      userId: patient.id,
      doctorId: doctor.id,
      serviceId: service.id,
      date,
      startTime,
      endTime,
      startAt,
      endAt,
      status,
      source: random() < 0.55 ? 'BOT' : 'ADMIN',
      createdAt,
    };

    if (random() < 0.35) row.complaint = pickOne(texts.complaint);
    if (status === 'COMPLETED') {
      row.price = service.price + (service.priceFrom ? Math.floor(random() * 4) * 50000 : 0);
      row.diagnosis = pickOne(texts.diagnosis);
      row.recommendation = pickOne(texts.recommendation);
      if (random() < 0.65) {
        row.rating = random() < 0.75 ? 5 : 4;
        if (random() < 0.5) row.feedback = pickOne(texts.feedback);
      }
    }
    if (status === 'CANCELLED') {
      row.cancelledBy = random() < 0.5 ? 'PATIENT' : 'ADMIN';
      row.cancelReason = texts.cancel;
    }
    rows.push(row);
  };

  for (let offset = -60; offset <= 10; offset += 1) {
    for (const doctor of doctors) {
      if (offset === 0) {
        tryAdd(offset, doctor);
        tryAdd(offset, doctor);
      } else if (random() < (offset < 0 ? 0.35 : 0.5)) {
        tryAdd(offset, doctor);
      }
    }
  }
  return rows;
}

// ============================ ASOSIY SEED ============================

async function seedIfEmpty({ force = false } = {}) {
  const clinic = await prisma.clinic.findUnique({ where: { id: 1 } });
  if (clinic && !force) {
    await ensureAdmin();
    return false;
  }

  await wipe();
  await ensureAdmin();

  // Kategoriyalar
  const categoryIds = {};
  for (let i = 0; i < CATEGORIES.length; i += 1) {
    const { key, ...data } = CATEGORIES[i];
    const category = await prisma.category.create({ data: { ...data, sortOrder: i } });
    categoryIds[key] = category.id;
  }

  // Shifokorlar
  const doctors = [];
  for (let i = 0; i < DOCTORS.length; i += 1) {
    const { key, ...data } = DOCTORS[i];
    const doctor = await prisma.doctor.create({ data: { ...data, sortOrder: i } });
    doctors.push({ ...doctor, key });
  }
  const doctorIdByKey = Object.fromEntries(doctors.map((d) => [d.key, d.id]));

  // Xizmatlar
  const services = await Promise.all(
    SERVICES.map((s, i) =>
      prisma.service
        .create({
          data: {
            categoryId: categoryIds[s.cat],
            nameUz: s.nameUz,
            nameRu: s.nameRu,
            descriptionUz: s.descUz,
            descriptionRu: s.descRu,
            aftercareUz: s.afterUz || null,
            aftercareRu: s.afterRu || null,
            price: s.price,
            oldPrice: s.oldPrice || null,
            priceFrom: Boolean(s.priceFrom),
            durationMin: s.duration,
            isPopular: Boolean(s.popular),
            sortOrder: i,
            doctors: { connect: s.doctors.map((key) => ({ id: doctorIdByKey[key] })) },
          },
        })
        .then((service) => ({ ...service, doctorKeys: s.doctors })),
    ),
  );

  // Namuna bemorlar (Telegram'ga ulanmagan, "demo" belgisi bilan)
  await prisma.user.createMany({
    data: PATIENTS.map(([firstName, lastName, phone, language], i) => ({
      firstName,
      lastName,
      phone,
      language,
      isDemo: true,
      createdAt: new Date(Date.now() - (90 - i * 5) * 86400000),
    })),
  });
  const patients = await prisma.user.findMany({ where: { isDemo: true } });

  // Namuna qabullar
  const appointments = buildDemoAppointments({ doctors, services, patients });
  await prisma.appointment.createMany({ data: appointments });

  for (const patient of patients) {
    const last = await prisma.appointment.findFirst({
      where: { userId: patient.id, status: 'COMPLETED' },
      orderBy: { startAt: 'desc' },
    });
    if (last) await prisma.user.update({ where: { id: patient.id }, data: { lastVisitAt: last.startAt } });
  }

  // Admin Panel uchun bir nechta bildirishnoma
  const recentBookings = await prisma.appointment.findMany({
    where: { source: 'BOT', status: 'PENDING', startAt: { gte: new Date() } },
    orderBy: { startAt: 'asc' },
    take: 3,
  });
  for (const a of recentBookings) {
    await prisma.notification.create({ data: { type: 'NEW_BOOKING', appointmentId: a.id } });
  }

  // Shifokor ta'tili (namuna)
  const today = time.nowLocal().date;
  await prisma.timeOff.create({
    data: {
      doctorId: doctorIdByKey.malika,
      dateFrom: time.addDays(today, 14),
      dateTo: time.addDays(today, 16),
      reason: 'Malaka oshirish kursi',
    },
  });

  // Klinika sozlamalari eng oxirida yoziladi
  await prisma.clinic.create({ data: CLINIC });
  return true;
}

if (require.main === module) {
  const force = process.argv.includes('--force');
  seedIfEmpty({ force })
    .then((done) => {
      console.log(
        done
          ? "✅ Namuna ma'lumotlar bazaga yozildi"
          : "ℹ️  Bazada ma'lumotlar allaqachon bor. Hammasini qaytadan yozish uchun: npm run seed -- --force",
      );
    })
    .catch((err) => {
      console.error('❌ Seed xatosi:', err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { seedIfEmpty };
