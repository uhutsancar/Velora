import type { ContentDoc, Localised } from './types';

/**
 * Legal documents. The Turkish set is authoritative — Velora sells into Turkey,
 * so KVKK and the distance-selling regulation are the governing texts and the
 * English versions are courtesy translations of the same terms.
 */

const UPDATED = '2026-09-01';

export const privacyDoc: Localised<ContentDoc> = {
  tr: {
    title: 'Gizlilik Politikası',
    subtitle: 'Hangi verileri neden topladığımızı ve ne kadar süre sakladığımızı açıklıyoruz.',
    updatedAt: UPDATED,
    sections: [
      {
        heading: 'Topladığımız veriler',
        body: [
          'Velora, yalnızca siparişinizi karşılamak ve mağazayı çalışır durumda tutmak için gereken veriyi toplar. Bu veriler üç grupta toplanır.',
        ],
        list: [
          'Hesap verileri: ad, soyad, e-posta adresi, telefon numarası ve şifrenizin geri döndürülemez özeti.',
          'Sipariş verileri: teslimat ve fatura adresi, sipariş içeriği, tutar ve kargo takip numarası.',
          'Kullanım verileri: oturum kimliği, dil tercihi, sepet içeriği ve hata kayıtları.',
        ],
      },
      {
        heading: 'Ödeme bilgileri',
        body: [
          'Kart numaranızı görmüyoruz ve saklamıyoruz. Ödeme, lisanslı ödeme kuruluşunun sayfasında tamamlanır; bize yalnızca işlemin sonucu ve kartın son dört hanesi döner.',
        ],
      },
      {
        heading: 'Verileri neden işliyoruz',
        list: [
          'Sözleşmenin ifası: siparişin hazırlanması, kargolanması, iade ve değişim süreçleri.',
          'Hukuki yükümlülük: fatura ve ticari kayıtların saklanması.',
          'Meşru menfaat: dolandırıcılık tespiti ve hizmet kalitesinin ölçülmesi.',
          'Açık rıza: pazarlama e-postaları ve zorunlu olmayan çerezler.',
        ],
      },
      {
        heading: 'Kimlerle paylaşıyoruz',
        body: [
          'Veriniz üçüncü taraflara satılmaz. Yalnızca hizmetin verilebilmesi için gereken tedarikçilerle, gereken kadarıyla paylaşılır: kargo firması, ödeme kuruluşu, e-posta gönderim sağlayıcısı ve barındırma sağlayıcısı. Tedarikçilerin tamamı sözleşme ile veri işleyen sıfatıyla bağlıdır.',
        ],
      },
      {
        heading: 'Saklama süreleri',
        table: {
          head: ['Veri', 'Süre', 'Dayanak'],
          rows: [
            ['Sipariş ve fatura kayıtları', '10 yıl', 'Türk Ticaret Kanunu'],
            ['Hesap bilgileri', 'Hesap silinene kadar', 'Sözleşmenin ifası'],
            ['Pazarlama izni', 'İzin geri alınana kadar', 'Açık rıza'],
            ['Sunucu ve hata kayıtları', '90 gün', 'Meşru menfaat'],
          ],
        },
      },
      {
        heading: 'Haklarınız',
        body: [
          'KVKK madde 11 kapsamında verilerinize erişme, düzeltme, silme ve işlemeye itiraz etme hakkınız vardır. Başvurularınızı kvkk@velora.com adresine iletebilirsiniz; en geç otuz gün içinde yanıt veriyoruz.',
        ],
      },
      {
        heading: 'Güvenlik',
        body: [
          'Tüm trafik TLS ile şifrelenir. Şifreler geri döndürülemez biçimde saklanır, yönetim paneline erişim rol ve yetki bazlı sınırlandırılır, oturum kayıtları izlenir.',
        ],
        note: 'Bir güvenlik açığı fark ederseniz guvenlik@velora.com adresine bildirin.',
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    subtitle: 'What we collect, why we collect it, and how long we keep it.',
    updatedAt: UPDATED,
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Velora collects only the data needed to fulfil your order and keep the store running. It falls into three groups.',
        ],
        list: [
          'Account data: name, email address, phone number and an irreversible hash of your password.',
          'Order data: delivery and billing address, order contents, amount and tracking number.',
          'Usage data: session id, language preference, basket contents and error logs.',
        ],
      },
      {
        heading: 'Payment details',
        body: [
          'We never see or store your card number. Payment completes on the licensed payment provider page; only the result and the last four digits come back to us.',
        ],
      },
      {
        heading: 'Why we process it',
        list: [
          'Performance of a contract: preparing, shipping, returning and exchanging orders.',
          'Legal obligation: retaining invoices and commercial records.',
          'Legitimate interest: fraud detection and service quality measurement.',
          'Consent: marketing email and non-essential cookies.',
        ],
      },
      {
        heading: 'Who we share it with',
        body: [
          'Your data is never sold. It is shared only with the suppliers needed to deliver the service, and only as far as needed: the carrier, the payment institution, the email provider and the hosting provider. Every supplier is contractually bound as a processor.',
        ],
      },
      {
        heading: 'Retention',
        table: {
          head: ['Data', 'Period', 'Basis'],
          rows: [
            ['Orders and invoices', '10 years', 'Turkish Commercial Code'],
            ['Account details', 'Until the account is deleted', 'Contract'],
            ['Marketing consent', 'Until consent is withdrawn', 'Consent'],
            ['Server and error logs', '90 days', 'Legitimate interest'],
          ],
        },
      },
      {
        heading: 'Your rights',
        body: [
          'Under article 11 of the Turkish data protection law you may access, correct, erase and object to the processing of your data. Write to kvkk@velora.com and we answer within thirty days.',
        ],
      },
      {
        heading: 'Security',
        body: [
          'All traffic is encrypted with TLS. Passwords are stored irreversibly, access to the back office is limited by role and permission, and activity is logged.',
        ],
        note: 'Found a vulnerability? Report it to guvenlik@velora.com.',
      },
    ],
  },
};

export const termsDoc: Localised<ContentDoc> = {
  tr: {
    title: 'Kullanım Koşulları',
    subtitle: 'Velora üzerinden alışveriş yaparken geçerli olan sözleşme şartları.',
    updatedAt: UPDATED,
    sections: [
      {
        heading: 'Taraflar',
        body: [
          'Bu koşullar, Velora Deri Ürünleri A.Ş. ile velora.com üzerinden alışveriş yapan kullanıcı arasında kurulur. Siparişi onayladığınızda koşulları kabul etmiş sayılırsınız.',
        ],
      },
      {
        heading: 'Ürün ve fiyat',
        body: [
          'Site üzerindeki fiyatlar Türk Lirası cinsindendir ve KDV dahildir. Kargo ücreti sepet özetinde ayrıca gösterilir. Fiyat ve stok bilgisi anlık olarak güncellenir; bariz maddi hata içeren bir fiyatla verilen sipariş, tutar tahsil edilmeden iptal edilebilir ve iptal size bildirilir.',
        ],
      },
      {
        heading: 'Sipariş ve teslimat',
        body: [
          'Sipariş, ödeme onayının ardından hazırlanmaya başlar. Stoktaki ürünler, iş günlerinde saat 14.00’a kadar verilen siparişlerde aynı gün kargoya verilir. Teslimat süresi kargo firmasının hizmet ağına göre bir ile dört iş günü arasındadır.',
        ],
      },
      {
        heading: 'Cayma hakkı',
        body: [
          'Mesafeli Sözleşmeler Yönetmeliği uyarınca, teslim tarihinden itibaren 14 gün içinde gerekçe göstermeksizin cayma hakkınız vardır. Velora bu süreyi kendi isteğiyle 30 güne çıkarır.',
        ],
        list: [
          'Ürün kullanılmamış, orijinal ambalajında ve etiketleri sökülmemiş olmalıdır.',
          'Kişiye özel üretilen ve monogram işlenen ürünler cayma hakkı kapsamı dışındadır.',
          'İade kargo bedeli, ürün ayıplı ise Velora tarafından karşılanır.',
        ],
      },
      {
        heading: 'Garanti',
        body: [
          'Deri ürünler, üretim ve işçilik hatalarına karşı iki yıl garantilidir. Normal kullanımdan doğan patina, renk değişimi ve yumuşama kusur sayılmaz; deri malzemenin doğal davranışıdır.',
        ],
      },
      {
        heading: 'Fikri mülkiyet',
        body: [
          'Sitedeki görseller, ürün tasarımları, metinler ve marka unsurları Velora’ya aittir. Yazılı izin olmadan çoğaltılamaz ve ticari amaçla kullanılamaz.',
        ],
      },
      {
        heading: 'Uyuşmazlık',
        body: [
          'Uyuşmazlıklarda alıcının yerleşim yerindeki Tüketici Hakem Heyeti ve Tüketici Mahkemeleri yetkilidir. Şikâyetlerinizi önce destek@velora.com adresine iletmenizi rica ederiz.',
        ],
      },
    ],
  },
  en: {
    title: 'Terms of Sale',
    subtitle: 'The contract that applies when you buy from Velora.',
    updatedAt: UPDATED,
    sections: [
      {
        heading: 'Parties',
        body: [
          'These terms are agreed between Velora Leather Goods Inc. and the person buying through velora.com. Confirming an order means accepting them.',
        ],
      },
      {
        heading: 'Products and prices',
        body: [
          'Prices are in Turkish lira and include VAT. Shipping is shown separately in the basket summary. Prices and stock update continuously; an order placed at an obviously mistaken price may be cancelled before any amount is captured, and you will be told.',
        ],
      },
      {
        heading: 'Orders and delivery',
        body: [
          'An order enters preparation once payment is confirmed. In-stock items ordered before 14.00 on a working day ship the same day. Delivery takes one to four working days depending on the carrier network.',
        ],
      },
      {
        heading: 'Right of withdrawal',
        body: [
          'Under the Turkish distance selling regulation you may withdraw within 14 days of delivery without giving a reason. Velora extends this to 30 days voluntarily.',
        ],
        list: [
          'The item must be unused, in its original packaging, with tags attached.',
          'Made-to-order and monogrammed pieces are outside the right of withdrawal.',
          'Return shipping is paid by Velora when the item is faulty.',
        ],
      },
      {
        heading: 'Warranty',
        body: [
          'Leather goods carry a two-year warranty against manufacturing and workmanship defects. Patina, colour shift and softening from normal use are not defects; they are how leather behaves.',
        ],
      },
      {
        heading: 'Intellectual property',
        body: [
          'Images, product designs, copy and brand elements on this site belong to Velora and may not be reproduced or used commercially without written permission.',
        ],
      },
      {
        heading: 'Disputes',
        body: [
          'Consumer arbitration committees and consumer courts at the buyer place of residence have jurisdiction. Please write to destek@velora.com first.',
        ],
      },
    ],
  },
};

export const kvkkDoc: Localised<ContentDoc> = {
  tr: {
    title: 'KVKK Aydınlatma Metni',
    subtitle: '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında bilgilendirme.',
    updatedAt: UPDATED,
    sections: [
      {
        heading: 'Veri sorumlusu',
        body: [
          'Veri sorumlusu Velora Deri Ürünleri A.Ş.’dir. Adres: Kemankeş Mah. Deri Sk. No 14, Karaköy / İstanbul. E-posta: kvkk@velora.com.',
        ],
      },
      {
        heading: 'İşlenen veri kategorileri',
        list: [
          'Kimlik: ad, soyad.',
          'İletişim: e-posta, telefon, teslimat ve fatura adresi.',
          'Müşteri işlem: sipariş geçmişi, iade talepleri, ürün yorumları.',
          'İşlem güvenliği: oturum kayıtları, IP adresi, cihaz bilgisi.',
          'Pazarlama: bülten aboneliği ve tercih kayıtları.',
        ],
      },
      {
        heading: 'İşleme amaçları',
        body: [
          'Veriler; siparişin alınması ve teslimi, satış sonrası destek, muhasebe ve fatura süreçleri, hukuki yükümlülüklerin yerine getirilmesi, bilgi güvenliğinin sağlanması ve açık rızanız varsa pazarlama iletişimi amaçlarıyla işlenir.',
        ],
      },
      {
        heading: 'Hukuki sebepler',
        list: [
          'Madde 5/2-c: sözleşmenin kurulması ve ifası.',
          'Madde 5/2-ç: hukuki yükümlülüğün yerine getirilmesi.',
          'Madde 5/2-f: meşru menfaat.',
          'Madde 5/1: açık rıza (pazarlama ve zorunlu olmayan çerezler).',
        ],
      },
      {
        heading: 'Toplama yöntemi',
        body: [
          'Veriler; site üzerindeki formlar, çerezler, müşteri hizmetleri kanalları ve ödeme kuruluşundan gelen işlem sonuçları aracılığıyla elektronik ortamda toplanır.',
        ],
      },
      {
        heading: 'Yurt dışına aktarım',
        body: [
          'Barındırma ve e-posta gönderim hizmetleri Avrupa Birliği içindeki veri merkezlerinde çalışır. Aktarım, standart sözleşme hükümleri ve Kurul’un öngördüğü güvenlik tedbirleri ile yapılır.',
        ],
      },
      {
        heading: 'Başvuru',
        body: [
          'Kanunun 11. maddesindeki haklarınızı kullanmak için kvkk@velora.com adresine yazılı başvuru yapabilirsiniz. Başvurunuz en geç 30 gün içinde ücretsiz olarak sonuçlandırılır.',
        ],
      },
    ],
  },
  en: {
    title: 'Data Protection Notice',
    subtitle: 'Information under Turkish data protection law no. 6698 (KVKK).',
    updatedAt: UPDATED,
    sections: [
      {
        heading: 'Controller',
        body: [
          'The controller is Velora Leather Goods Inc., Kemankeş Mah. Deri Sk. No 14, Karaköy / İstanbul. Email: kvkk@velora.com.',
        ],
      },
      {
        heading: 'Categories of data',
        list: [
          'Identity: first and last name.',
          'Contact: email, phone, delivery and billing address.',
          'Customer activity: order history, return requests, product reviews.',
          'Transaction security: session records, IP address, device information.',
          'Marketing: newsletter subscription and preferences.',
        ],
      },
      {
        heading: 'Purposes',
        body: [
          'Data is processed to take and deliver orders, provide after-sales support, run accounting and invoicing, meet legal obligations, secure the service and, where you have consented, send marketing.',
        ],
      },
      {
        heading: 'Legal grounds',
        list: [
          'Art. 5/2-c: formation and performance of a contract.',
          'Art. 5/2-ç: compliance with a legal obligation.',
          'Art. 5/2-f: legitimate interest.',
          'Art. 5/1: explicit consent (marketing and non-essential cookies).',
        ],
      },
      {
        heading: 'How it is collected',
        body: [
          'Through forms on the site, cookies, customer service channels and transaction results returned by the payment institution.',
        ],
      },
      {
        heading: 'International transfers',
        body: [
          'Hosting and email delivery run in data centres inside the European Union. Transfers rely on standard contractual clauses and the safeguards required by the Board.',
        ],
      },
      {
        heading: 'Applications',
        body: [
          'To exercise your rights under article 11, write to kvkk@velora.com. We respond free of charge within 30 days.',
        ],
      },
    ],
  },
};

export const cookiesDoc: Localised<ContentDoc> = {
  tr: {
    title: 'Çerez Politikası',
    subtitle: 'Hangi çerezleri kullandığımızı ve tercihinizi nasıl değiştireceğinizi anlatır.',
    updatedAt: UPDATED,
    sections: [
      {
        heading: 'Çerez nedir',
        body: [
          'Çerez, siteyi ziyaret ettiğinizde tarayıcınıza kaydedilen küçük bir metin dosyasıdır. Oturumunuzun açık kalmasını, sepetinizin dolu kalmasını ve dil tercihinizin hatırlanmasını sağlar.',
        ],
      },
      {
        heading: 'Kullandığımız çerezler',
        table: {
          head: ['Tür', 'Amaç', 'Süre'],
          rows: [
            ['Zorunlu', 'Oturum, sepet ve güvenlik doğrulaması', 'Oturum – 30 gün'],
            ['Tercih', 'Dil ve para birimi seçimi', '1 yıl'],
            ['Analitik', 'Sayfa performansı ve hata ölçümü', '90 gün'],
            ['Pazarlama', 'Kampanya ölçümü ve yeniden hedefleme', '180 gün'],
          ],
        },
      },
      {
        heading: 'Tercihinizi değiştirmek',
        body: [
          'Zorunlu çerezler dışındaki tüm çerezler için onayınızı ilk ziyarette alırız. Kararınızı sayfanın altındaki çerez ayarları bağlantısından dilediğiniz zaman değiştirebilirsiniz. Tarayıcınızın ayarlarından da tüm çerezleri silebilirsiniz; bu durumda sepetiniz ve oturumunuz sıfırlanır.',
        ],
      },
      {
        heading: 'Üçüncü taraf çerezleri',
        body: [
          'Ödeme sayfasında ödeme kuruluşunun, gömülü videolarda video sağlayıcısının çerezleri çalışabilir. Bu çerezler ilgili sağlayıcının politikasına tabidir.',
        ],
      },
    ],
  },
  en: {
    title: 'Cookie Policy',
    subtitle: 'The cookies we set, and how to change your mind about them.',
    updatedAt: UPDATED,
    sections: [
      {
        heading: 'What a cookie is',
        body: [
          'A cookie is a small text file saved to your browser when you visit. It keeps you signed in, keeps your basket filled and remembers your language.',
        ],
      },
      {
        heading: 'Cookies we use',
        table: {
          head: ['Type', 'Purpose', 'Lifetime'],
          rows: [
            ['Essential', 'Session, basket and security checks', 'Session – 30 days'],
            ['Preference', 'Language and currency choice', '1 year'],
            ['Analytics', 'Page performance and error measurement', '90 days'],
            ['Marketing', 'Campaign measurement and retargeting', '180 days'],
          ],
        },
      },
      {
        heading: 'Changing your mind',
        body: [
          'We ask for consent on your first visit for everything except essential cookies. You can change that decision at any time from the cookie settings link in the footer. Clearing cookies in your browser also works, though it resets your basket and signs you out.',
        ],
      },
      {
        heading: 'Third-party cookies',
        body: [
          'The payment provider sets cookies on the payment page, and embedded video players set their own. Those are governed by the relevant provider policy.',
        ],
      },
    ],
  },
};

export const LEGAL_DOCS = {
  gizlilik: privacyDoc,
  kosullar: termsDoc,
  kvkk: kvkkDoc,
  cerez: cookiesDoc,
} as const;

export type LegalSlug = keyof typeof LEGAL_DOCS;
