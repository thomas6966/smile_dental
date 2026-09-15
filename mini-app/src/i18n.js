const pluralRu = (n, one, few, many) => {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
};

const uz = {
  common: {
    loading: 'Yuklanmoqda...',
    retry: 'Qayta urinish',
    close: 'Yopish',
    cancel: 'Bekor qilish',
    save: 'Saqlash',
    next: 'Davom etish',
    back: 'Orqaga',
    free: 'Bepul',
    minutes: ({ n }) => `${n} daq`,
    all: 'Barchasi',
    change: "O'zgartirish",
    send: 'Yuborish',
    yes: 'Ha',
    no: "Yo'q",
    today: 'Bugun',
    tomorrow: 'Ertaga',
  },
  nav: {
    home: 'Asosiy',
    services: 'Xizmatlar',
    appointments: 'Qabullarim',
    profile: 'Profil',
  },
  onboarding: {
    skip: "O'tkazib yuborish",
    start: 'Boshlash',
    s1: {
      title: 'Chiroyli tabassum shu yerdan boshlanadi',
      text: 'Zamonaviy stomatologiya va tajribali shifokorlar — endi telefoningizda.',
    },
    s2: {
      title: "Navbatsiz va qo'ng'iroqsiz",
      text: "Shifokorni tanlang, kalendardan qulay kun va vaqtni belgilang — 1 daqiqada yoziling.",
    },
    s3: {
      title: "Sog'lig'ingiz doim nazoratda",
      text: "Davolanish tarixi, shifokor tavsiyalari va ko'rik eslatmalari — hammasi bir joyda.",
    },
  },
  home: {
    greeting: { morning: 'Xayrli tong', day: 'Xayrli kun', evening: 'Xayrli kech' },
    subtitle: "Tabassumingiz ishonchli qo'llarda 🦷",
    heroBadge: '1 daqiqada',
    heroTitle: 'Qabulga yozilish',
    heroText: "Shifokor, kun va o'zingizga qulay vaqtni tanlang",
    nextVisit: 'Keyingi qabulingiz',
    checkupTitle: "Profilaktik ko'rik vaqti keldi",
    checkupText: ({ n }) => `Oxirgi tashrifingizdan beri ${n} oy o'tdi. Muntazam ko'rik muammolarni erta aniqlaydi.`,
    checkupBtn: "Ko'rikka yozilish",
    quick: { prices: 'Narxlar', doctors: 'Shifokorlar', address: 'Manzil', call: "Qo'ng'iroq" },
    promos: 'Aksiyalar',
    popular: 'Ommabop xizmatlar',
    doctors: 'Shifokorlarimiz',
    seeAll: 'Barchasi',
    discount: ({ n }) => `−${n}%`,
  },
  stories: [
    {
      label: 'Maslahat',
      emoji: '🪥',
      title: "To'g'ri tish yuvish",
      text: "Tishlarni kuniga 2 marta, kamida 2 daqiqa yuving. Cho'tkani 45° burchak ostida tuting va har 3 oyda almashtiring.",
    },
    {
      label: 'Profilaktika',
      emoji: '🗓',
      title: "Har 6 oyda ko'rik",
      text: "Muntazam ko'rik kariesni erta bosqichda aniqlaydi — davolash oson, tez va arzonroq bo'ladi.",
    },
    {
      label: 'Oq tabassum',
      emoji: '✨',
      title: 'Oqartirishdan keyin',
      text: "48 soat davomida qahva, choy va rangli ichimliklardan saqlaning — natija uzoq saqlanadi.",
    },
    {
      label: 'Bolalar',
      emoji: '🧸',
      title: 'Bolalar tishlari',
      text: "Birinchi ko'rikka bola 1 yoshga to'lganda boring. Sut tishlarini ham albatta davolash kerak.",
    },
    {
      label: 'Klinika',
      emoji: '🏥',
      title: 'Nega aynan biz?',
      text: "Zamonaviy uskunalar, steril muhit, og'riqsiz davolash va bajarilgan ishlarga kafolat.",
    },
  ],
  storyCta: 'Qabulga yozilish',
  services: {
    title: 'Xizmatlar va narxlar',
    search: 'Xizmatni qidirish',
    empty: 'Hech narsa topilmadi',
    note: "Aniq narx shifokor ko'rigidan so'ng belgilanadi",
    price: 'Narxi',
    includes: 'Xizmat tarkibi',
    duration: 'Davomiyligi',
    doctors: 'Bu xizmatni bajaradigan shifokorlar',
    book: ({ price }) => `Yozilish — ${price}`,
  },
  doctors: {
    title: 'Shifokorlarimiz',
    experience: ({ n }) => `${n} yillik tajriba`,
    reviews: ({ n }) => `${n} ta baho`,
    about: 'Shifokor haqida',
    services: 'Xizmatlari',
    schedule: 'Ish jadvali',
    dayOff: 'Dam olish',
    book: 'Shu shifokorga yozilish',
  },
  booking: {
    title: 'Qabulga yozilish',
    rescheduleTitle: "Vaqtni o'zgartirish",
    steps: { service: 'Xizmat', doctor: 'Shifokor', time: 'Vaqt', confirm: 'Tasdiqlash' },
    stepOf: ({ n, total }) => `Qadam ${n}/${total}`,
    chooseService: 'Qanday xizmat kerak?',
    notSure: 'Aniq bilmayman',
    notSureText: "Shifokor ko'rikdan so'ng o'zi maslahat beradi",
    chooseDoctor: 'Shifokorni tanlang',
    chooseTime: 'Kun va vaqtni tanlang',
    legend: { available: "Bo'sh", full: 'Band', off: 'Dam olish' },
    noSlots: "Bu kunda bo'sh vaqt qolmagan",
    dayOff: 'Shifokorning dam olish kuni',
    pickDay: 'Kalendardan kunni tanlang',
    periods: { morning: 'Ertalab', day: 'Kunduzi', evening: 'Kechqurun' },
    confirmTitle: "Ma'lumotlarni tekshiring",
    name: 'Ismingiz',
    phone: 'Telefon raqamingiz',
    sharePhone: 'Telegram raqamni ulash',
    complaint: 'Shikoyat yoki izoh (ixtiyoriy)',
    complaintPlaceholder: "Masalan: tishim og'riyapti",
    cancelNote: ({ n }) => `Qabulni ${n} soat oldingacha bekor qilish yoki boshqa vaqtga ko'chirish mumkin.`,
    confirm: 'Qabulni tasdiqlash',
    confirmReschedule: 'Yangi vaqtni tasdiqlash',
    success: 'Siz qabulga yozildingiz!',
    rescheduled: "Qabul vaqti o'zgartirildi",
    successText: 'Tasdiqlash va eslatmalar Telegram botga yuboriladi.',
    toAppointments: 'Mening qabullarim',
    toHome: 'Bosh sahifaga',
  },
  status: {
    PENDING: 'Tasdiqlanmoqda',
    CONFIRMED: 'Tasdiqlangan',
    COMPLETED: 'Yakunlangan',
    CANCELLED: 'Bekor qilingan',
    NO_SHOW: 'Kelinmagan',
  },
  appointments: {
    title: 'Mening qabullarim',
    upcoming: 'Kelgusi',
    history: 'Tarix',
    emptyUpcoming: "Rejalashtirilgan qabul yo'q",
    emptyUpcomingText: 'Qulay vaqtni tanlab, hoziroq yoziling',
    emptyHistory: "Davolanish tarixi hozircha bo'sh",
    emptyHistoryText: "Birinchi tashrifdan so'ng bu yerda xulosa va tavsiyalar paydo bo'ladi",
    reschedule: "Ko'chirish",
    cancel: 'Bekor qilish',
    cancelTitle: 'Qabulni bekor qilasizmi?',
    cancelText: "Bekor qilingan vaqt boshqa bemorlarga beriladi.",
    cancelReason: 'Sabab (ixtiyoriy)',
    cancelConfirm: 'Ha, bekor qilish',
    cancelled: 'Qabul bekor qilindi',
    callToChange: ({ n }) => `Qabulga ${n} soatdan kam vaqt qoldi. O'zgartirish uchun klinikaga qo'ng'iroq qiling.`,
    repeat: 'Yana yozilish',
    details: 'Batafsil',
    service: 'Xizmat',
    doctor: 'Shifokor',
    dateTime: 'Sana va vaqt',
    duration: 'Davomiyligi',
    complaint: 'Shikoyat',
    diagnosis: 'Shifokor xulosasi',
    recommendation: 'Tavsiyalar',
    paid: "To'lov",
    cancelReasonLabel: 'Bekor qilish sababi',
    rateTitle: 'Qabulni baholang',
    rateText: 'Fikringiz xizmatimizni yaxshilashga yordam beradi',
    feedback: 'Fikringiz (ixtiyoriy)',
    rated: 'Bahoyingiz uchun rahmat!',
    yourRating: 'Sizning bahoyingiz',
    route: "Yo'nalish",
    call: "Qo'ng'iroq",
    consultation: "Ko'rik",
  },
  profile: {
    title: 'Profil',
    visits: 'Tashriflar',
    lastVisit: 'Oxirgi tashrif',
    nextCheckup: "Keyingi ko'rik",
    personal: "Shaxsiy ma'lumotlar",
    language: 'Til',
    history: 'Davolanish tarixi',
    clinic: 'Klinika haqida',
    call: "Klinikaga qo'ng'iroq",
    firstName: 'Ism',
    lastName: 'Familiya',
    phone: 'Telefon raqam',
    birthDate: "Tug'ilgan sana",
    saved: "Ma'lumotlar saqlandi",
    noPhone: "Telefon raqam ko'rsatilmagan",
  },
  clinic: {
    title: 'Klinika haqida',
    address: 'Manzil',
    landmark: "Mo'ljal",
    hours: 'Ish vaqti',
    phones: 'Telefon',
    map: 'Xaritada ochish',
    socials: 'Ijtimoiy tarmoqlar',
  },
  auth: {
    title: 'Ilovani Telegram orqali oching',
    text: 'Bu ilova Telegram bot ichida ishlaydi. Botga kiring va «Klinika» tugmasini bosing.',
    button: 'Botni ochish',
  },
  errors: {
    ERROR: "Xatolik yuz berdi. Qaytadan urinib ko'ring",
    NETWORK: 'Internet aloqasini tekshiring',
    SLOT_TAKEN: 'Afsuski, bu vaqt hozirgina band qilindi. Boshqa vaqtni tanlang',
    PHONE_REQUIRED: 'Telefon raqamingizni kiriting',
    BAD_PHONE: "Telefon raqam noto'g'ri kiritildi",
    NAME_REQUIRED: 'Ismingizni kiriting',
    TOO_MANY: "Sizda faol qabullar juda ko'p. Avval mavjudlarini yakunlang",
    TOO_LATE: ({ hours }) => `Qabulga ${hours} soatdan kam vaqt qoldi. Klinikaga qo'ng'iroq qiling`,
    NOT_ALLOWED: "Bu amalni bajarib bo'lmaydi",
    NOT_FOUND: "Ma'lumot topilmadi",
    loadTitle: "Ma'lumotlarni yuklab bo'lmadi",
  },
};

const ru = {
  common: {
    loading: 'Загрузка...',
    retry: 'Повторить',
    close: 'Закрыть',
    cancel: 'Отмена',
    save: 'Сохранить',
    next: 'Продолжить',
    back: 'Назад',
    free: 'Бесплатно',
    minutes: ({ n }) => `${n} мин`,
    all: 'Все',
    change: 'Изменить',
    send: 'Отправить',
    yes: 'Да',
    no: 'Нет',
    today: 'Сегодня',
    tomorrow: 'Завтра',
  },
  nav: {
    home: 'Главная',
    services: 'Услуги',
    appointments: 'Записи',
    profile: 'Профиль',
  },
  onboarding: {
    skip: 'Пропустить',
    start: 'Начать',
    s1: {
      title: 'Красивая улыбка начинается здесь',
      text: 'Современная стоматология и опытные врачи — теперь в вашем телефоне.',
    },
    s2: {
      title: 'Без очередей и звонков',
      text: 'Выберите врача, отметьте удобный день и время в календаре — запись за 1 минуту.',
    },
    s3: {
      title: 'Здоровье под контролем',
      text: 'История лечения, рекомендации врача и напоминания об осмотре — всё в одном месте.',
    },
  },
  home: {
    greeting: { morning: 'Доброе утро', day: 'Добрый день', evening: 'Добрый вечер' },
    subtitle: 'Ваша улыбка в надёжных руках 🦷',
    heroBadge: 'За 1 минуту',
    heroTitle: 'Записаться на приём',
    heroText: 'Выберите врача, день и удобное для вас время',
    nextVisit: 'Ваш следующий приём',
    checkupTitle: 'Пора на профилактический осмотр',
    checkupText: ({ n }) =>
      `С последнего визита прошло ${n} ${pluralRu(n, 'месяц', 'месяца', 'месяцев')}. Регулярный осмотр помогает выявить проблемы на ранней стадии.`,
    checkupBtn: 'Записаться на осмотр',
    quick: { prices: 'Цены', doctors: 'Врачи', address: 'Адрес', call: 'Позвонить' },
    promos: 'Акции',
    popular: 'Популярные услуги',
    doctors: 'Наши врачи',
    seeAll: 'Все',
    discount: ({ n }) => `−${n}%`,
  },
  stories: [
    {
      label: 'Совет',
      emoji: '🪥',
      title: 'Правильная чистка зубов',
      text: 'Чистите зубы 2 раза в день не менее 2 минут. Держите щётку под углом 45° и меняйте её каждые 3 месяца.',
    },
    {
      label: 'Профилактика',
      emoji: '🗓',
      title: 'Осмотр каждые 6 месяцев',
      text: 'Регулярный осмотр выявляет кариес на ранней стадии — лечение проще, быстрее и дешевле.',
    },
    {
      label: 'Белая улыбка',
      emoji: '✨',
      title: 'После отбеливания',
      text: 'В течение 48 часов откажитесь от кофе, чая и красящих напитков — результат сохранится надолго.',
    },
    {
      label: 'Детям',
      emoji: '🧸',
      title: 'Детские зубы',
      text: 'Первый визит к стоматологу — в 1 год. Молочные зубы тоже обязательно нужно лечить.',
    },
    {
      label: 'Клиника',
      emoji: '🏥',
      title: 'Почему мы?',
      text: 'Современное оборудование, стерильность, безболезненное лечение и гарантия на работы.',
    },
  ],
  storyCta: 'Записаться на приём',
  services: {
    title: 'Услуги и цены',
    search: 'Поиск услуги',
    empty: 'Ничего не найдено',
    note: 'Точная стоимость определяется после осмотра врача',
    price: 'Стоимость',
    includes: 'Что входит',
    duration: 'Длительность',
    doctors: 'Врачи, выполняющие услугу',
    book: ({ price }) => `Записаться — ${price}`,
  },
  doctors: {
    title: 'Наши врачи',
    experience: ({ n }) => `Стаж ${n} ${pluralRu(n, 'год', 'года', 'лет')}`,
    reviews: ({ n }) => `${n} ${pluralRu(n, 'оценка', 'оценки', 'оценок')}`,
    about: 'О враче',
    services: 'Услуги',
    schedule: 'График работы',
    dayOff: 'Выходной',
    book: 'Записаться к врачу',
  },
  booking: {
    title: 'Запись на приём',
    rescheduleTitle: 'Перенос записи',
    steps: { service: 'Услуга', doctor: 'Врач', time: 'Время', confirm: 'Подтверждение' },
    stepOf: ({ n, total }) => `Шаг ${n} из ${total}`,
    chooseService: 'Какая услуга вам нужна?',
    notSure: 'Не знаю точно',
    notSureText: 'Врач всё подскажет после осмотра',
    chooseDoctor: 'Выберите врача',
    chooseTime: 'Выберите день и время',
    legend: { available: 'Свободно', full: 'Занято', off: 'Выходной' },
    noSlots: 'На этот день свободного времени нет',
    dayOff: 'Выходной день врача',
    pickDay: 'Выберите день в календаре',
    periods: { morning: 'Утро', day: 'День', evening: 'Вечер' },
    confirmTitle: 'Проверьте данные',
    name: 'Ваше имя',
    phone: 'Номер телефона',
    sharePhone: 'Взять номер из Telegram',
    complaint: 'Жалоба или комментарий (необязательно)',
    complaintPlaceholder: 'Например: болит зуб',
    cancelNote: ({ n }) => `Отменить или перенести запись можно не позднее чем за ${n} ч. до приёма.`,
    confirm: 'Подтвердить запись',
    confirmReschedule: 'Подтвердить новое время',
    success: 'Вы записаны на приём!',
    rescheduled: 'Время записи изменено',
    successText: 'Подтверждение и напоминания придут в Telegram-бот.',
    toAppointments: 'Мои записи',
    toHome: 'На главную',
  },
  status: {
    PENDING: 'Ожидает',
    CONFIRMED: 'Подтверждена',
    COMPLETED: 'Завершена',
    CANCELLED: 'Отменена',
    NO_SHOW: 'Неявка',
  },
  appointments: {
    title: 'Мои записи',
    upcoming: 'Предстоящие',
    history: 'История',
    emptyUpcoming: 'Нет запланированных записей',
    emptyUpcomingText: 'Выберите удобное время и запишитесь прямо сейчас',
    emptyHistory: 'История лечения пока пуста',
    emptyHistoryText: 'После первого визита здесь появятся заключения и рекомендации врача',
    reschedule: 'Перенести',
    cancel: 'Отменить',
    cancelTitle: 'Отменить запись?',
    cancelText: 'Освободившееся время будет предложено другим пациентам.',
    cancelReason: 'Причина (необязательно)',
    cancelConfirm: 'Да, отменить',
    cancelled: 'Запись отменена',
    callToChange: ({ n }) => `До приёма меньше ${n} ч. Чтобы изменить запись, позвоните в клинику.`,
    repeat: 'Записаться снова',
    details: 'Подробнее',
    service: 'Услуга',
    doctor: 'Врач',
    dateTime: 'Дата и время',
    duration: 'Длительность',
    complaint: 'Жалоба',
    diagnosis: 'Заключение врача',
    recommendation: 'Рекомендации',
    paid: 'Оплата',
    cancelReasonLabel: 'Причина отмены',
    rateTitle: 'Оцените приём',
    rateText: 'Ваше мнение помогает нам становиться лучше',
    feedback: 'Ваш отзыв (необязательно)',
    rated: 'Спасибо за оценку!',
    yourRating: 'Ваша оценка',
    route: 'Маршрут',
    call: 'Позвонить',
    consultation: 'Осмотр',
  },
  profile: {
    title: 'Профиль',
    visits: 'Визиты',
    lastVisit: 'Последний визит',
    nextCheckup: 'Следующий осмотр',
    personal: 'Личные данные',
    language: 'Язык',
    history: 'История лечения',
    clinic: 'О клинике',
    call: 'Позвонить в клинику',
    firstName: 'Имя',
    lastName: 'Фамилия',
    phone: 'Номер телефона',
    birthDate: 'Дата рождения',
    saved: 'Данные сохранены',
    noPhone: 'Номер не указан',
  },
  clinic: {
    title: 'О клинике',
    address: 'Адрес',
    landmark: 'Ориентир',
    hours: 'Режим работы',
    phones: 'Телефон',
    map: 'Открыть на карте',
    socials: 'Социальные сети',
  },
  auth: {
    title: 'Откройте приложение в Telegram',
    text: 'Это приложение работает внутри Telegram-бота. Перейдите в бот и нажмите кнопку «Klinika».',
    button: 'Открыть бота',
  },
  errors: {
    ERROR: 'Произошла ошибка. Попробуйте ещё раз',
    NETWORK: 'Проверьте подключение к интернету',
    SLOT_TAKEN: 'К сожалению, это время только что заняли. Выберите другое',
    PHONE_REQUIRED: 'Укажите номер телефона',
    BAD_PHONE: 'Неверный номер телефона',
    NAME_REQUIRED: 'Укажите имя',
    TOO_MANY: 'У вас слишком много активных записей',
    TOO_LATE: ({ hours }) => `До приёма меньше ${hours} ч. Позвоните в клинику`,
    NOT_ALLOWED: 'Это действие недоступно',
    NOT_FOUND: 'Данные не найдены',
    loadTitle: 'Не удалось загрузить данные',
  },
};

export const dictionaries = { uz, ru };

const lookup = (dict, key) => key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);

export function translate(lang, key, vars = {}) {
  let value = lookup(dictionaries[lang] || uz, key);
  if (value === undefined) value = lookup(uz, key);
  if (typeof value === 'function') return value(vars);
  if (value === undefined) return key;
  return value;
}

export function hasKey(lang, key) {
  return lookup(dictionaries[lang] || uz, key) !== undefined;
}

export const pick = (obj, field, lang) => {
  if (!obj) return '';
  return obj[`${field}${lang === 'ru' ? 'Ru' : 'Uz'}`] || obj[`${field}Uz`] || '';
};

export const groupDigits = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export function formatPrice(lang, amount, from = false) {
  if (!amount) return translate(lang, 'common.free');
  const value = groupDigits(amount);
  return lang === 'ru' ? `${from ? 'от ' : ''}${value} сум` : `${value} so'm${from ? 'dan' : ''}`;
}

const MONTHS = {
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
};
const MONTHS_TITLE = {
  uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
};
const MONTHS_SHORT = {
  uz: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'],
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
};
const WEEKDAYS = {
  uz: ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'],
  ru: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
};
const WEEKDAYS_SHORT = {
  uz: ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
};

const L = (lang) => (lang === 'ru' ? 'ru' : 'uz');

export function parseDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

export function formatDate(lang, date, { weekday = true, year = false } = {}) {
  const { y, m, d, weekday: wd } = parseDate(date);
  if (L(lang) === 'ru') {
    return `${d} ${MONTHS.ru[m - 1]}${year ? ` ${y}` : ''}${weekday ? `, ${WEEKDAYS.ru[wd]}` : ''}`;
  }
  return `${year ? `${y}-yil ` : ''}${d}-${MONTHS.uz[m - 1]}${weekday ? `, ${WEEKDAYS.uz[wd]}` : ''}`;
}

export const monthTitle = (lang, month) => {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_TITLE[L(lang)][m - 1]} ${y}`;
};

export const monthShort = (lang, date) => MONTHS_SHORT[L(lang)][parseDate(date).m - 1];
export const weekdayShort = (lang, index) => WEEKDAYS_SHORT[L(lang)][index];
export const weekdayName = (lang, date) => WEEKDAYS[L(lang)][parseDate(date).weekday];

export function toLocalDate(value) {
  if (!value) return null;
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
