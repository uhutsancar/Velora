import { COMMERCE } from '@velora/shared';
import type { ContentDoc, FaqEntry, Localised } from './types';

/**
 * Help centre copy: shipping, returns, leather care and the FAQ.
 *
 * These are the pages the footer has always linked to. Every commercial number
 * in the copy below is interpolated from COMMERCE in @velora/shared, the same
 * constant the basket and the checkout total read, so the help centre cannot
 * drift away from what the shopper is actually charged.
 */

export const shippingDoc: Localised<ContentDoc> = {
  tr: {
    title: 'Kargo ve Teslimat',
    subtitle: 'Siparişiniz atölyeden çıktıktan sonra ne olduğunu adım adım anlatır.',
    sections: [
      {
        heading: 'Hazırlık süresi',
        body: [
          `Stoktaki ürünler, iş günlerinde saat ${COMMERCE.sameDayCutoff}’a kadar verilen siparişlerde aynı gün kargoya verilir. Sonrasında verilen siparişler ertesi iş günü çıkar. Kişiye özel monogram işlenen ürünler için hazırlık üç iş günü sürer.`,
        ],
      },
      {
        heading: 'Teslimat süreleri ve ücretler',
        table: {
          head: ['Bölge', 'Süre', 'Ücret'],
          rows: [
            ['İstanbul, Ankara, İzmir', '1-2 iş günü', `${COMMERCE.freeShippingThreshold} TL üzeri ücretsiz`],
            ['Diğer il merkezleri', '2-3 iş günü', `${COMMERCE.freeShippingThreshold} TL üzeri ücretsiz`],
            ['İlçe ve beldeler', '3-4 iş günü', `${COMMERCE.freeShippingThreshold} TL üzeri ücretsiz`],
            ['Yurt dışı', '5-9 iş günü', 'Sepette hesaplanır'],
          ],
        },
        note: `${COMMERCE.freeShippingThreshold} TL altındaki siparişlerde kargo bedeli ${COMMERCE.shippingFee} TL’dir ve sepet özetinde gösterilir.`,
      },
      {
        heading: 'Siparişimi nasıl takip ederim',
        body: [
          'Kargo firmasına teslim edildiğinde takip numarasını e-posta ile gönderiyoruz. Aynı numarayı Hesabım › Siparişlerim sayfasındaki sipariş detayında da bulabilirsiniz.',
        ],
      },
      {
        heading: 'Teslimat sırasında',
        list: [
          'Paketi kurye yanınızdayken kontrol edin; dış ambalajda ezilme veya yırtılma varsa tutanak tutturun.',
          'Hasarlı paketi teslim almayın ve durumu aynı gün destek@velora.com adresine bildirin.',
          'Adreste bulunamazsanız kargo firması iki kez daha dener, sonrasında paket şubede beş iş günü bekletilir.',
        ],
      },
      {
        heading: 'Paketleme',
        body: [
          'Her ürün kendi toz torbasında, geri dönüştürülmüş kartondan üretilen Velora kutusunda gönderilir. Kutu içindeki dolgu malzemesi nişasta bazlıdır ve suda çözünür.',
        ],
      },
    ],
  },
  en: {
    title: 'Shipping and Delivery',
    subtitle: 'What happens after your order leaves the atelier.',
    sections: [
      {
        heading: 'Preparation time',
        body: [
          `In-stock items ordered before ${COMMERCE.sameDayCutoff} on a working day ship the same day. Later orders leave the next working day. Monogrammed pieces take three working days to prepare.`,
        ],
      },
      {
        heading: 'Delivery times and cost',
        table: {
          head: ['Region', 'Time', 'Cost'],
          rows: [
            ['Istanbul, Ankara, Izmir', '1-2 working days', `Free over ${COMMERCE.freeShippingThreshold} TL`],
            ['Other city centres', '2-3 working days', `Free over ${COMMERCE.freeShippingThreshold} TL`],
            ['Districts and towns', '3-4 working days', `Free over ${COMMERCE.freeShippingThreshold} TL`],
            ['International', '5-9 working days', 'Calculated at checkout'],
          ],
        },
        note: `Below ${COMMERCE.freeShippingThreshold} TL, shipping is ${COMMERCE.shippingFee} TL and is shown in the basket summary.`,
      },
      {
        heading: 'Tracking your order',
        body: [
          'We email the tracking number as soon as the carrier collects the parcel. The same number appears on the order detail page under Account › Orders.',
        ],
      },
      {
        heading: 'At delivery',
        list: [
          'Check the parcel while the courier is still there; ask for a report if the outer box is crushed or torn.',
          'Refuse a damaged parcel and tell destek@velora.com the same day.',
          'If nobody is at the address the carrier tries twice more, then holds the parcel at the branch for five working days.',
        ],
      },
      {
        heading: 'Packaging',
        body: [
          'Every piece ships in its own dust bag inside a Velora box made from recycled board. The void fill is starch based and dissolves in water.',
        ],
      },
    ],
  },
};

export const returnsDoc: Localised<ContentDoc> = {
  tr: {
    title: 'İade ve Değişim',
    subtitle: `${COMMERCE.returnDays} gün içinde, sorusuz.`,
    sections: [
      {
        heading: 'Koşullar',
        body: [
          `Teslim tarihinden itibaren ${COMMERCE.returnDays} gün içinde ürünü iade edebilir veya başka bir ürünle değiştirebilirsiniz. Yasal cayma süresi 14 gündür; kalan süre Velora’nın kendi taahhüdüdür.`,
        ],
        list: [
          'Ürün kullanılmamış ve orijinal ambalajında olmalıdır.',
          'Etiketler ve toz torbası paketle birlikte gönderilmelidir.',
          'Monogram işlenmiş ve kişiye özel üretilen ürünler iade edilemez.',
        ],
      },
      {
        heading: 'Adım adım iade',
        list: [
          'Hesabım › Siparişlerim sayfasından ilgili siparişi açın ve iade talebi oluşturun.',
          'Talep onaylandığında e-posta ile gelen kargo kodunu alın.',
          'Ürünü orijinal kutusuna yerleştirin ve anlaşmalı kargo şubesine kodu vererek teslim edin.',
          'Ürün atölyeye ulaştıktan sonra kontrol iki iş günü sürer.',
        ],
      },
      {
        heading: 'Para iadesi',
        body: [
          'Kontrol tamamlandığında tutar, ödemeyi yaptığınız karta iade edilir. Bankanızın hesabınıza yansıtma süresi kart tipine göre iki ile yedi iş günü arasında değişir; bu süre bankanın kontrolündedir.',
        ],
      },
      {
        heading: 'Değişim',
        body: [
          'Renk veya boy değişiminde yeni ürün, iade edilen ürün atölyeye ulaştığı gün kargoya verilir. Aradaki fiyat farkı varsa tahsil edilir veya iade edilir. Değişim kargosu Velora tarafından karşılanır.',
        ],
      },
      {
        heading: 'Ayıplı ürün',
        body: [
          'Üretim veya işçilik kaynaklı bir kusur varsa iki yıllık garanti kapsamında onarır, mümkün değilse yenisiyle değiştiririz. Bu durumda gidiş ve dönüş kargo bedeli bize aittir.',
        ],
        note: 'Fotoğrafla birlikte destek@velora.com adresine yazarsanız süreci hızlandırırız.',
      },
    ],
  },
  en: {
    title: 'Returns and Exchanges',
    subtitle: `${COMMERCE.returnDays} days, no questions.`,
    sections: [
      {
        heading: 'Conditions',
        body: [
          `You may return or exchange a piece within ${COMMERCE.returnDays} days of delivery. The statutory withdrawal period is 14 days; the rest is Velora own commitment.`,
        ],
        list: [
          'The item must be unused and in its original packaging.',
          'Tags and the dust bag must be in the parcel.',
          'Monogrammed and made-to-order pieces cannot be returned.',
        ],
      },
      {
        heading: 'Step by step',
        list: [
          'Open the order under Account › Orders and create a return request.',
          'Take the carrier code from the confirmation email.',
          'Put the piece back in its original box and hand it in at a partner carrier branch with that code.',
          'Inspection takes two working days once the parcel reaches the atelier.',
        ],
      },
      {
        heading: 'Refunds',
        body: [
          'After inspection the amount goes back to the card you paid with. How long your bank takes to show it depends on the card type, usually two to seven working days, and is outside our control.',
        ],
      },
      {
        heading: 'Exchanges',
        body: [
          'For a colour or size change the replacement ships the day the returned piece reaches the atelier. Any price difference is charged or refunded. Velora pays the exchange shipping.',
        ],
      },
      {
        heading: 'Faulty items',
        body: [
          'A manufacturing or workmanship defect is repaired under the two-year warranty, or replaced if repair is not possible. Shipping both ways is on us.',
        ],
        note: 'Email destek@velora.com with a photo and we will move faster.',
      },
    ],
  },
};

export const careDoc: Localised<ContentDoc> = {
  tr: {
    title: 'Deri Bakımı',
    subtitle: 'Bitkisel tabaklanmış deri yaşayan bir malzemedir. Doğru bakımla yıllar içinde güzelleşir.',
    sections: [
      {
        heading: 'Günlük kullanım',
        list: [
          'Çantanızı kuru ve havadar bir yerde, kendi toz torbasında saklayın.',
          'Uzun süre kullanmayacaksanız formunu koruması için içine asitsiz kâğıt doldurun.',
          'Doğrudan güneş ışığı ve kalorifer yakını rengi soldurur; ikisinden de uzak tutun.',
        ],
      },
      {
        heading: 'Islanırsa',
        body: [
          'Fön veya radyatör kullanmayın. Fazla suyu pamuklu bir bezle alın ve deriyi oda sıcaklığında kendi hızında kurumaya bırakın. Tamamen kuruduğunda ince bir kat bakım kremi uygulayın.',
        ],
      },
      {
        heading: 'Temizlik ve besleme',
        table: {
          head: ['İşlem', 'Sıklık', 'Ürün'],
          rows: [
            ['Toz alma', 'Haftada bir', 'Kuru pamuklu bez'],
            ['Besleme', 'Üç ayda bir', 'Renksiz deri kremi'],
            ['Su itici koruma', 'Altı ayda bir', 'Sprey koruyucu'],
            ['Profesyonel bakım', 'Yılda bir', 'Velora atölyesi'],
          ],
        },
      },
      {
        heading: 'Leke ve çizik',
        body: [
          'Yüzeydeki ince çizikler parmak ucuyla dairesel hareketle ovulduğunda kaybolur; bu, bitkisel tabaklanmış derinin kendini onarma biçimidir. Yağ lekelerine su ile müdahale etmeyin, lekeyi yayarsınız.',
        ],
        note: 'Derin leke ve kesiklerde onarım için atölyemize başvurun: atolye@velora.com',
      },
      {
        heading: 'Patina',
        body: [
          'Renk zamanla koyulaşır ve yüzey parlaklık kazanır. Bu bir kusur değil, kullanım izidir; her Velora parçası birkaç yıl içinde yalnızca size ait bir tona kavuşur.',
        ],
      },
    ],
  },
  en: {
    title: 'Leather Care',
    subtitle: 'Vegetable-tanned leather is a living material. Cared for properly, it improves for years.',
    sections: [
      {
        heading: 'Everyday use',
        list: [
          'Store your bag dry and ventilated, inside its dust bag.',
          'Fill it with acid-free paper when it will not be used for a while, so it keeps its shape.',
          'Direct sun and radiators fade the colour. Keep away from both.',
        ],
      },
      {
        heading: 'If it gets wet',
        body: [
          'No hair dryer, no radiator. Blot the water with a cotton cloth and let the leather dry at room temperature at its own pace. Apply a thin coat of conditioner once it is fully dry.',
        ],
      },
      {
        heading: 'Cleaning and feeding',
        table: {
          head: ['Task', 'Frequency', 'Product'],
          rows: [
            ['Dusting', 'Weekly', 'Dry cotton cloth'],
            ['Conditioning', 'Every three months', 'Colourless leather cream'],
            ['Water repellent', 'Every six months', 'Protective spray'],
            ['Professional service', 'Yearly', 'Velora atelier'],
          ],
        },
      },
      {
        heading: 'Marks and scratches',
        body: [
          'Light surface scratches disappear when rubbed in small circles with a fingertip; that is how vegetable-tanned leather heals itself. Never attack an oil stain with water, it spreads.',
        ],
        note: 'For deep stains and cuts, write to atolye@velora.com about a repair.',
      },
      {
        heading: 'Patina',
        body: [
          'The colour deepens and the surface gains a sheen over time. That is not a flaw but a record of use; within a few years every Velora piece settles into a tone that is only yours.',
        ],
      },
    ],
  },
};

export const faqEntries: Localised<FaqEntry[]> = {
  tr: [
    {
      group: 'Sipariş',
      question: 'Üye olmadan sipariş verebilir miyim?',
      answer:
        'Sepeti üye olmadan doldurabilirsiniz, ancak ödeme adımı için hesap gerekir. Hesap, sipariş takibi ve iade talebi oluşturabilmeniz için gereklidir ve kayıt bir dakika sürer.',
    },
    {
      group: 'Sipariş',
      question: 'Siparişimi verdikten sonra değiştirebilir miyim?',
      answer:
        'Sipariş “hazırlanıyor” durumundayken adres ve ürün değişikliği yapabiliriz. Kargoya verildikten sonra değişiklik mümkün değildir; bu durumda iade süreci işler.',
    },
    {
      group: 'Sipariş',
      question: 'Siparişimi nasıl iptal ederim?',
      answer:
        'Hesabım › Siparişlerim sayfasından, sipariş kargoya verilmemişse tek tıkla iptal edebilirsiniz. Tahsil edilen tutar aynı gün iade talimatına dönüşür.',
    },
    {
      group: 'Ödeme',
      question: 'Hangi ödeme yöntemlerini kabul ediyorsunuz?',
      answer:
        'Kredi ve banka kartları ile kapıda ödeme kabul ediyoruz. Kredi kartına anlaşmalı bankalarda üç, altı ve dokuz taksit uygulanır; taksit seçenekleri ödeme adımında gösterilir.',
    },
    {
      group: 'Ödeme',
      question: 'Kart bilgilerim güvende mi?',
      answer:
        'Kart numaranız Velora sunucularına hiç ulaşmaz. Ödeme, lisanslı ödeme kuruluşunun 3D Secure sayfasında tamamlanır; bize yalnızca işlem sonucu ve kartın son dört hanesi döner.',
    },
    {
      group: 'Ödeme',
      question: 'İndirim kodunu nereye giriyorum?',
      answer:
        'Sepet sayfasındaki “Kupon kodu” alanına girip uygula deyin. Kod geçerliyse indirim sepet özetinde ayrı satır olarak görünür. Bir siparişte tek kupon kullanılabilir.',
    },
    {
      group: 'Kargo',
      question: 'Kargo ne kadar sürüyor?',
      answer: `Şehir merkezlerine bir ile iki, ilçelere üç ile dört iş günü. ${COMMERCE.sameDayCutoff}’a kadar verilen siparişler aynı gün kargoya verilir.`,
    },
    {
      group: 'Kargo',
      question: 'Ücretsiz kargo sınırı nedir?',
      answer: `${COMMERCE.freeShippingThreshold} TL ve üzeri tüm yurt içi siparişlerde kargo ücretsizdir. Altındaki siparişlerde ${COMMERCE.shippingFee} TL kargo bedeli sepet özetinde gösterilir.`,
    },
    {
      group: 'Kargo',
      question: 'Yurt dışına gönderim yapıyor musunuz?',
      answer:
        'Evet. Avrupa ve Orta Doğu ülkelerine gönderim yapıyoruz; süre beş ile dokuz iş günü arasındadır. Gümrük vergisi alıcıya aittir ve ödeme adımında hesaplanmaz.',
    },
    {
      group: 'Ürün',
      question: 'Hangi deriyi kullanıyorsunuz?',
      answer:
        'Tüm ürünlerimizde bitkisel tabaklanmış tam tabaka dana derisi kullanıyoruz. Deri, gıda endüstrisinin yan ürünüdür; hiçbir hayvan yalnızca derisi için kesilmez.',
    },
    {
      group: 'Ürün',
      question: 'Ürünler garantili mi?',
      answer: `Tüm deri ürünler üretim ve işçilik hatalarına karşı ${COMMERCE.warrantyYears} yıl garantilidir. Normal kullanımdan doğan patina ve yumuşama kusur sayılmaz.`,
    },
    {
      group: 'Ürün',
      question: 'Monogram işletebilir miyim?',
      answer:
        'Seçili ürünlerde üç harfe kadar sıcak baskı monogram uygulanır. Ürün sayfasında bu seçenek varsa hazırlık süresi üç iş gününe çıkar ve ürün iade kapsamı dışında kalır.',
    },
    {
      group: 'İade',
      question: 'İade süresi kaç gün?',
      answer: `Teslim tarihinden itibaren ${COMMERCE.returnDays} gün. Ürün kullanılmamış ve orijinal ambalajında olmalıdır.`,
    },
    {
      group: 'İade',
      question: 'İade kargo ücretini kim ödüyor?',
      answer:
        `Ürün ayıplıysa veya yanlış gönderim yapılmışsa kargo bedeli Velora’ya aittir. Fikir değişikliğiyle yapılan iadelerde anlaşmalı kargo bedeli ${COMMERCE.shippingFee} TL iade tutarından düşülür.`,
    },
    {
      group: 'Hesap',
      question: 'Şifremi unuttum, ne yapmalıyım?',
      answer:
        'Giriş sayfasındaki “Şifremi unuttum” bağlantısından e-posta adresinizi girin. Sıfırlama bağlantısı bir saat geçerlidir ve yalnızca bir kez kullanılabilir.',
    },
    {
      group: 'Hesap',
      question: 'Hesabımı nasıl silerim?',
      answer:
        'Hesabım › Güvenlik sayfasından silme talebi oluşturabilirsiniz. Fatura kayıtları yasal saklama süresi boyunca korunur, kalan tüm kişisel veriler otuz gün içinde silinir.',
    },
  ],
  en: [
    {
      group: 'Orders',
      question: 'Can I order without an account?',
      answer:
        'You can fill the basket without one, but checkout needs an account. It is what lets you track the order and open a return, and signing up takes a minute.',
    },
    {
      group: 'Orders',
      question: 'Can I change an order after placing it?',
      answer:
        'While the order is still being prepared we can change the address or the items. Once it ships, changes go through the returns process instead.',
    },
    {
      group: 'Orders',
      question: 'How do I cancel?',
      answer:
        'From Account › Orders, in one click, as long as the parcel has not shipped. The captured amount is sent for refund the same day.',
    },
    {
      group: 'Payment',
      question: 'Which payment methods do you take?',
      answer:
        'Credit and debit cards, and cash on delivery. Partner banks offer three, six and nine instalments on credit cards; the options appear at checkout.',
    },
    {
      group: 'Payment',
      question: 'Are my card details safe?',
      answer:
        'Your card number never reaches Velora servers. Payment completes on the licensed provider 3D Secure page; only the result and the last four digits come back to us.',
    },
    {
      group: 'Payment',
      question: 'Where do I enter a discount code?',
      answer:
        'In the coupon field on the basket page. A valid code appears as its own line in the summary. One coupon per order.',
    },
    {
      group: 'Shipping',
      question: 'How long does delivery take?',
      answer: `One to two working days to city centres, three to four to districts. Orders placed before ${COMMERCE.sameDayCutoff} ship the same day.`,
    },
    {
      group: 'Shipping',
      question: 'What is the free shipping threshold?',
      answer: `Shipping is free on domestic orders of ${COMMERCE.freeShippingThreshold} TL and over. Below that it is ${COMMERCE.shippingFee} TL, shown in the basket summary.`,
    },
    {
      group: 'Shipping',
      question: 'Do you ship internationally?',
      answer:
        'Yes, to Europe and the Middle East, in five to nine working days. Customs duties are the buyer responsibility and are not calculated at checkout.',
    },
    {
      group: 'Products',
      question: 'What leather do you use?',
      answer:
        'Full-grain vegetable-tanned calfskin throughout. Leather is a by-product of the food industry; no animal is raised or killed for its hide alone.',
    },
    {
      group: 'Products',
      question: 'Is there a warranty?',
      answer: `Every leather piece carries a ${COMMERCE.warrantyYears}-year warranty against manufacturing and workmanship defects. Patina and softening from normal use are not defects.`,
    },
    {
      group: 'Products',
      question: 'Can I have a monogram?',
      answer:
        'Selected pieces take a hot-stamped monogram of up to three letters. Where the option appears on the product page, preparation moves to three working days and the piece falls outside returns.',
    },
    {
      group: 'Returns',
      question: 'How long do I have to return something?',
      answer: `${COMMERCE.returnDays} days from delivery. The piece must be unused and in its original packaging.`,
    },
    {
      group: 'Returns',
      question: 'Who pays return shipping?',
      answer:
        `Velora does, when the item is faulty or we sent the wrong one. For a change of mind, the ${COMMERCE.shippingFee} TL partner carrier fee comes off the refund.`,
    },
    {
      group: 'Account',
      question: 'I forgot my password.',
      answer:
        'Use the forgotten password link on the sign-in page. The reset link is valid for one hour and works once.',
    },
    {
      group: 'Account',
      question: 'How do I delete my account?',
      answer:
        'Open a deletion request under Account › Security. Invoice records are kept for the statutory period; everything else personal is erased within thirty days.',
    },
  ],
};

export const HELP_DOCS = {
  kargo: shippingDoc,
  iade: returnsDoc,
  bakim: careDoc,
} as const;

export type HelpSlug = keyof typeof HELP_DOCS;
