import type { Localised } from './types';

/**
 * Brand story copy for the About, Atelier and Sustainability pages.
 *
 * These three are editorial rather than reference pages, so they carry their own
 * shapes — a hero, a lead paragraph, image-paired chapters and a timeline —
 * instead of the flat section list the legal and help documents use.
 */

/** Placeholder photography, same deterministic source the catalogue seed uses. */
export const storyPhoto = (seed: string, width = 1400, height = 1000) =>
  `https://picsum.photos/seed/velora-${seed}/${width}/${height}`;

export interface StoryChapter {
  eyebrow: string;
  title: string;
  body: string[];
  image: string;
  imageAlt: string;
}

export interface StoryStat {
  value: string;
  label: string;
}

export interface TimelineEntry {
  year: string;
  title: string;
  body: string;
}

export interface StoryPage {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  lead: string;
  heroImage: string;
  heroAlt: string;
  chapters: StoryChapter[];
  stats?: StoryStat[];
  timeline?: TimelineEntry[];
  closing?: { title: string; body: string; ctaLabel: string; ctaHref: string };
}

export const aboutPage: Localised<StoryPage> = {
  tr: {
    metaTitle: 'Hakkımızda',
    metaDescription:
      'Velora, 1994’ten bu yana Karaköy’deki atölyesinde bitkisel tabaklanmış deriden çanta ve aksesuar üretiyor.',
    eyebrow: 'Hakkımızda',
    title: 'Bir tezgâhta başladı, bir tezgâhta devam ediyor',
    lead: 'Velora, 1994 yılında Karaköy’de tek bir dikiş tezgâhıyla kuruldu. Otuz yıl sonra hâlâ aynı sokakta, aynı ilkeyle çalışıyoruz: iyi deri, sabırlı el işçiliği ve gereğinden fazla süslenmemiş bir tasarım.',
    heroImage: storyPhoto('about-hero', 2000, 1100),
    heroAlt: 'Velora atölyesinde deri kesim tezgâhı',
    chapters: [
      {
        eyebrow: 'Malzeme',
        title: 'Deriyi kimyaya değil zamana bırakıyoruz',
        body: [
          'Kullandığımız her deri bitkisel tabaklanmıştır. Meşe palamudu ve mimoza kabuğuyla, doksan güne yayılan bir süreçte işlenir. Krom tabaklama bunu bir günde bitirir; biz beklemeyi tercih ediyoruz çünkü bitkisel deri yaşlandıkça sertleşmez, yumuşar.',
          'Deri, gıda endüstrisinin yan ürünüdür. Hiçbir hayvan yalnızca derisi için yetiştirilmez; kullandığımız tabakaların tamamı sertifikalı tabakhanelerden gelir ve her partinin izini sürebiliriz.',
        ],
        image: storyPhoto('about-material', 1200, 1500),
        imageAlt: 'Bitkisel tabaklanmış deri tabakaları',
      },
      {
        eyebrow: 'Tasarım',
        title: 'Bir çantayı kırk parçadan kırk yıla taşımak',
        body: [
          'Bir Velora çantası ortalama kırk parçadan oluşur ve tamamı tek bir ustanın elinden çıkar. Bant üretimde her usta tek bir işlemi tekrarlar; bizde bir usta çantayı baştan sona kendi bitirir ve iç etikete kendi numarasını vurur.',
          'Tasarımda moda takvimini takip etmiyoruz. Bir modeli koleksiyona almadan önce iki sezon boyunca atölye ekibi kullanır; askı dikişi ilk yılda gevşiyorsa model koleksiyona hiç girmez.',
        ],
        image: storyPhoto('about-design', 1200, 1500),
        imageAlt: 'Çanta askısı diken usta',
      },
      {
        eyebrow: 'Onarım',
        title: 'Sattığımız her parçayı geri kabul ederiz',
        body: [
          'Velora atölyesi yalnızca üretim yapmaz, onarır. Yıllar önce alınmış bir çantanın astarını değiştirir, fermuarını yeniler, askısını yeniden dikeriz. Garanti süresi dolmuş olsa bile onarım ücreti yeni ürün fiyatının küçük bir bölümüdür.',
          'Amacımız daha çok satmak değil, sattığımızın daha uzun kullanılması. Bir çantanın ikinci sahibine geçmesi bizim için başarısızlık değil, ölçüttür.',
        ],
        image: storyPhoto('about-repair', 1200, 1500),
        imageAlt: 'Onarım tezgâhında çanta',
      },
    ],
    stats: [
      { value: '1994', label: 'Kuruluş yılı' },
      { value: '18', label: 'Atölye ustası' },
      { value: '40+', label: 'Bir çantadaki işlem' },
      { value: '%92', label: 'Onarılıp geri dönen parça' },
    ],
    timeline: [
      {
        year: '1994',
        title: 'İlk tezgâh',
        body: 'Karaköy’de on iki metrekarelik bir dükkânda, tek dikiş makinesiyle sipariş usulü üretim başladı.',
      },
      {
        year: '2003',
        title: 'İlk koleksiyon',
        body: 'Sipariş üretiminden kendi tasarımlarımıza geçtik. Atlas evrak çantası bugün hâlâ katalogda.',
      },
      {
        year: '2011',
        title: 'Onarım atölyesi',
        body: 'Satış sonrası onarımı ayrı bir bölüm hâline getirdik; ekipte üç usta yalnızca onarımla ilgileniyor.',
      },
      {
        year: '2019',
        title: 'Bitkisel tabaklamaya tam geçiş',
        body: 'Krom tabaklanmış deri kullanımını tamamen bıraktık ve tedarik zincirini sertifikalı tabakhanelere daralttık.',
      },
      {
        year: '2026',
        title: 'Velora çevrim içi',
        body: 'Mağaza ve atölyeyi tek bir dijital vitrinde birleştirdik; onarım talepleri de aynı hesaptan açılıyor.',
      },
    ],
    closing: {
      title: 'Atölyeyi görmek ister misiniz?',
      body: 'Karaköy’deki atölyemiz hafta içi her gün ziyarete açık. Randevu almanıza gerek yok, kapıyı çalmanız yeterli.',
      ctaLabel: 'Atölyeyi keşfet',
      ctaHref: '/atolye',
    },
  },
  en: {
    metaTitle: 'About Velora',
    metaDescription:
      'Since 1994 Velora has made bags and accessories from vegetable-tanned leather in its Karaköy atelier.',
    eyebrow: 'About',
    title: 'It started at one bench, and it is still at one bench',
    lead: 'Velora was founded in 1994 on a single sewing bench in Karaköy, Istanbul. Thirty years later we are on the same street with the same principle: good leather, patient handwork and a design that is not decorated more than it needs.',
    heroImage: storyPhoto('about-hero', 2000, 1100),
    heroAlt: 'The cutting bench in the Velora atelier',
    chapters: [
      {
        eyebrow: 'Material',
        title: 'We leave leather to time, not to chemistry',
        body: [
          'Every hide we use is vegetable tanned, worked with oak and mimosa bark over ninety days. Chrome tanning does the same job in one; we prefer to wait, because vegetable-tanned leather softens with age instead of hardening.',
          'Leather is a by-product of the food industry. No animal is raised for its hide alone, every hide comes from a certified tannery, and each batch can be traced.',
        ],
        image: storyPhoto('about-material', 1200, 1500),
        imageAlt: 'Vegetable-tanned hides',
      },
      {
        eyebrow: 'Design',
        title: 'Forty pieces, meant to last forty years',
        body: [
          'A Velora bag is around forty cut pieces and one maker. On a production line each worker repeats a single operation; here one maker finishes the bag end to end and stamps their own number into the lining label.',
          'We do not follow the fashion calendar. Before a model joins the collection the atelier team carries it for two seasons; if a strap seam loosens in the first year, that model never ships.',
        ],
        image: storyPhoto('about-design', 1200, 1500),
        imageAlt: 'A maker stitching a bag strap',
      },
      {
        eyebrow: 'Repair',
        title: 'We take back everything we sell',
        body: [
          'The atelier does not only make, it repairs. We reline bags bought years ago, replace zips and restitch straps. Even out of warranty, a repair costs a small fraction of a new piece.',
          'The point is not to sell more but to have what we sold used for longer. A bag reaching a second owner is not a failure here, it is the measure.',
        ],
        image: storyPhoto('about-repair', 1200, 1500),
        imageAlt: 'A bag on the repair bench',
      },
    ],
    stats: [
      { value: '1994', label: 'Founded' },
      { value: '18', label: 'Makers in the atelier' },
      { value: '40+', label: 'Operations per bag' },
      { value: '92%', label: 'Repaired and returned' },
    ],
    timeline: [
      {
        year: '1994',
        title: 'The first bench',
        body: 'Made-to-order work began in a twelve square metre shop in Karaköy with one sewing machine.',
      },
      {
        year: '2003',
        title: 'The first collection',
        body: 'We moved from commissions to our own designs. The Atlas briefcase from that year is still in the catalogue.',
      },
      {
        year: '2011',
        title: 'The repair bench',
        body: 'After-sales repair became its own department; three makers now work on nothing else.',
      },
      {
        year: '2019',
        title: 'Fully vegetable tanned',
        body: 'We dropped chrome-tanned leather entirely and narrowed the supply chain to certified tanneries.',
      },
      {
        year: '2026',
        title: 'Velora online',
        body: 'Shop and atelier came together in one storefront; repair requests open from the same account.',
      },
    ],
    closing: {
      title: 'Would you like to see the atelier?',
      body: 'Our Karaköy workshop is open to visitors on weekdays. No appointment needed, just knock.',
      ctaLabel: 'Visit the atelier',
      ctaHref: '/atolye',
    },
  },
};

export const ateliePage: Localised<StoryPage> = {
  tr: {
    metaTitle: 'Atölye',
    metaDescription: 'Bir Velora çantasının kesimden son cilaya kadar geçtiği kırk adım.',
    eyebrow: 'Atölye',
    title: 'Kırk adım, iki gün, tek usta',
    lead: 'Bir çanta tezgâha girdiğinde kırk ayrı işlemden geçer ve ortalama iki gün sonra çıkar. Aşağıda o iki günün nasıl geçtiği anlatılıyor.',
    heroImage: storyPhoto('atelier-hero', 2000, 1100),
    heroAlt: 'Velora atölyesinin genel görünümü',
    chapters: [
      {
        eyebrow: 'Birinci adım',
        title: 'Kesim: tabakanın hangi bölgesi hangi parça olur',
        body: [
          'Bir dana tabakası her yerinde aynı değildir. Sırt bölgesi en sıkı liflere sahiptir ve çantanın taşıyıcı parçalarına ayrılır; karın bölgesi daha esnektir ve iç ceplere gider. Usta tabakayı ışığa tutarak bu haritayı çıkarır.',
          'Kesim el bıçağıyla yapılır. Presle kesim daha hızlıdır ama kenarı ezer; el bıçağı kenarı dik bırakır ve cila daha iyi tutar.',
        ],
        image: storyPhoto('atelier-cut', 1200, 1500),
        imageAlt: 'El bıçağıyla deri kesimi',
      },
      {
        eyebrow: 'İkinci adım',
        title: 'Dikiş: makine değil, iki iğne',
        body: [
          'Taşıyıcı dikişlerin tamamı el ile, saddle stitch tekniğiyle atılır. İki iğne aynı deliğe ters yönlerden girer; bu yüzden bir ilmek koptuğunda dikişin geri kalanı sökülmez. Makine dikişi bunu yapamaz.',
          'İpliğimiz balmumu geçirilmiş keten. Sentetik iplik daha güçlüdür ama deriden önce deriyi keser; keten deriyle birlikte yaşlanır.',
        ],
        image: storyPhoto('atelier-stitch', 1200, 1500),
        imageAlt: 'El dikişi atan usta',
      },
      {
        eyebrow: 'Üçüncü adım',
        title: 'Kenar: yedi kat, arada zımpara',
        body: [
          'Görünen her kenar zımparalanır, renklendirilir, cilalanır ve yeniden zımparalanır. İşlem yedi kez tekrarlanır. Bu, bir çantanın en çok zaman alan ve ilk bakışta en az fark edilen kısmıdır; kenarı kötü bitirilmiş bir çanta iki yılda dağılır.',
        ],
        image: storyPhoto('atelier-edge', 1200, 1500),
        imageAlt: 'Kenar cilalama işlemi',
      },
      {
        eyebrow: 'Son adım',
        title: 'Kontrol ve numara',
        body: [
          'Bitmiş çanta yirmi maddelik bir kontrol listesinden geçer: dikiş aralığı, kenar düzgünlüğü, fermuar akışı, astar gerginliği, aksesuar sıkılığı. Geçen çantanın iç etiketine ustanın numarası vurulur.',
          'Kontrolden geçemeyen çanta atölye içinde kalır ve personel kullanımına ayrılır; ikinci kalite olarak satılmaz.',
        ],
        image: storyPhoto('atelier-qc', 1200, 1500),
        imageAlt: 'Son kontrolden geçen çanta',
      },
    ],
    stats: [
      { value: '90', label: 'Gün tabaklama' },
      { value: '7', label: 'Kat kenar cilası' },
      { value: '2', label: 'Gün üretim' },
      { value: '20', label: 'Maddelik son kontrol' },
    ],
    closing: {
      title: 'Onarım da bu tezgâhta',
      body: 'Yıllar önce aldığınız bir Velora parçasını atölyeye getirebilir ya da kargoyla gönderebilirsiniz. Onarım süresi ortalama on gündür.',
      ctaLabel: 'Bakım rehberini oku',
      ctaHref: '/yardim/bakim',
    },
  },
  en: {
    metaTitle: 'The Atelier',
    metaDescription: 'The forty steps a Velora bag passes through, from cutting to the final burnish.',
    eyebrow: 'Atelier',
    title: 'Forty steps, two days, one maker',
    lead: 'A bag entering the bench goes through forty separate operations and leaves about two days later. Here is how those two days go.',
    heroImage: storyPhoto('atelier-hero', 2000, 1100),
    heroAlt: 'A wide view of the Velora atelier',
    chapters: [
      {
        eyebrow: 'Step one',
        title: 'Cutting: which part of the hide becomes which piece',
        body: [
          'A calf hide is not the same everywhere. The back has the tightest fibre and becomes the load-bearing panels; the belly is more elastic and goes to inner pockets. The maker holds the hide to the light to map it.',
          'Cutting is done with a hand knife. A press is faster but crushes the edge; a knife leaves it square so the burnish holds.',
        ],
        image: storyPhoto('atelier-cut', 1200, 1500),
        imageAlt: 'Cutting leather with a hand knife',
      },
      {
        eyebrow: 'Step two',
        title: 'Stitching: not a machine, two needles',
        body: [
          'Every load-bearing seam is hand sewn with a saddle stitch. Two needles enter the same hole from opposite sides, so a broken loop does not unzip the rest of the seam. A machine stitch cannot do that.',
          'The thread is waxed linen. Synthetic thread is stronger, but it cuts the leather before it gives; linen ages alongside it.',
        ],
        image: storyPhoto('atelier-stitch', 1200, 1500),
        imageAlt: 'A maker hand stitching',
      },
      {
        eyebrow: 'Step three',
        title: 'Edges: seven coats, sanded between each',
        body: [
          'Every visible edge is sanded, dyed, burnished and sanded again, seven times over. It is the slowest part of a bag and the least noticed at first glance; a badly finished edge is what falls apart in two years.',
        ],
        image: storyPhoto('atelier-edge', 1200, 1500),
        imageAlt: 'Burnishing an edge',
      },
      {
        eyebrow: 'Last step',
        title: 'Inspection and number',
        body: [
          'A finished bag goes through a twenty-point check: stitch pitch, edge finish, zip travel, lining tension, hardware torque. What passes gets the maker number stamped into the lining label.',
          'What fails stays in the atelier for staff use. It is never sold as a second.',
        ],
        image: storyPhoto('atelier-qc', 1200, 1500),
        imageAlt: 'A bag in final inspection',
      },
    ],
    stats: [
      { value: '90', label: 'Days of tanning' },
      { value: '7', label: 'Coats on an edge' },
      { value: '2', label: 'Days of making' },
      { value: '20', label: 'Point final check' },
    ],
    closing: {
      title: 'Repairs happen at this bench too',
      body: 'Bring a Velora piece bought years ago to the atelier or send it by carrier. A repair takes about ten days.',
      ctaLabel: 'Read the care guide',
      ctaHref: '/yardim/bakim',
    },
  },
};

export const sustainabilityPage: Localised<StoryPage> = {
  tr: {
    metaTitle: 'Sürdürülebilirlik',
    metaDescription: 'Velora’nın malzeme, üretim ve ambalaj tarafındaki taahhütleri ve ölçülen sonuçları.',
    eyebrow: 'Sürdürülebilirlik',
    title: 'Az üretmek, uzun kullandırmak',
    lead: 'Bir deri ürünün çevresel yükü büyük ölçüde üretim anında oluşur. Bu yüzden en etkili adım daha az ürünü daha uzun süre kullandırmaktır. Aşağıdaki maddeler taahhüt değil, ölçtüğümüz sonuçlar.',
    heroImage: storyPhoto('sustain-hero', 2000, 1100),
    heroAlt: 'Atölyede kesim artıklarının ayrıştırılması',
    chapters: [
      {
        eyebrow: 'Malzeme',
        title: 'Krom yok, izlenebilir tabakhane var',
        body: [
          '2019’dan bu yana krom tabaklanmış deri kullanmıyoruz. Bitkisel tabaklama daha yavaş ve daha pahalıdır, ancak atık suyunda ağır metal bırakmaz. Çalıştığımız üç tabakhanenin tamamı Leather Working Group denetiminden geçmiştir.',
          'Metal aksesuarlarımız solid pirinçtir; kaplama değildir, dolayısıyla aşındığında altından farklı bir metal çıkmaz ve ömrünün sonunda tek malzeme olarak geri dönüştürülebilir.',
        ],
        image: storyPhoto('sustain-material', 1200, 1500),
        imageAlt: 'Tabakhaneden gelen sertifikalı deri',
      },
      {
        eyebrow: 'Atık',
        title: 'Kesim artığı çöp değil, küçük deri',
        body: [
          'Bir tabakanın ortalama yüzde on sekizi büyük parçalara ayrıldıktan sonra artar. Bu artık kartlık, anahtarlık ve etiket üretimine gider. Kalan küçük parçalar öğütülüp ambalaj dolgusuna dönüşür.',
          'Geçen yıl atölyeden çıkan katı atığın yüzde altısı depolama sahasına gitti; hedefimiz bu oranı 2027 sonunda yüzde ikinin altına indirmek.',
        ],
        image: storyPhoto('sustain-waste', 1200, 1500),
        imageAlt: 'Kesim artıklarından üretilen küçük deri ürünler',
      },
      {
        eyebrow: 'Ambalaj',
        title: 'Plastik yok, baskı yok, dolgu nişasta',
        body: [
          'Kutularımız yüzde yüz geri dönüştürülmüş karton, toz torbalarımız organik pamuktur. Dolgu malzemesi mısır nişastası bazlıdır ve suda çözünür. Kutuların üzerinde plastik laminasyon ve metalik baskı yoktur; ikisi de kartonu geri dönüştürülemez hâle getirir.',
        ],
        image: storyPhoto('sustain-packaging', 1200, 1500),
        imageAlt: 'Geri dönüştürülmüş kartondan Velora kutusu',
      },
    ],
    stats: [
      { value: '%100', label: 'Bitkisel tabaklanmış deri' },
      { value: '%18', label: 'Küçük ürüne dönen artık' },
      { value: '%6', label: 'Depolamaya giden atık' },
      { value: '0', label: 'Ambalajda plastik' },
    ],
    timeline: [
      {
        year: '2027',
        title: 'Atığı yüzde ikiye indirmek',
        body: 'Depolama sahasına giden katı atık oranını yüzde altıdan yüzde ikinin altına çekmek.',
      },
      {
        year: '2028',
        title: 'Onarım oranını yükseltmek',
        body: 'Satılan her yüz parçadan en az on beşinin ömrü boyunca en az bir kez atölyeye onarıma gelmesi.',
      },
      {
        year: '2030',
        title: 'Yenilenebilir enerji',
        body: 'Atölye ve depo elektriğinin tamamının yenilenebilir kaynaktan sözleşmeli olarak sağlanması.',
      },
    ],
    closing: {
      title: 'Onarım en iyi geri dönüşümdür',
      body: 'Elinizdeki Velora parçası yıprandıysa yenisini almadan önce atölyeye sorun. Çoğu zaman bir astar veya fermuar değişimi yeterli oluyor.',
      ctaLabel: 'İletişime geç',
      ctaHref: '/iletisim',
    },
  },
  en: {
    metaTitle: 'Sustainability',
    metaDescription: 'Velora commitments on material, making and packaging, with the numbers we measure.',
    eyebrow: 'Sustainability',
    title: 'Make less, have it used longer',
    lead: 'Most of a leather good environmental cost is spent the moment it is made. So the effective move is fewer pieces, used for longer. What follows are measured results, not pledges.',
    heroImage: storyPhoto('sustain-hero', 2000, 1100),
    heroAlt: 'Sorting offcuts in the atelier',
    chapters: [
      {
        eyebrow: 'Material',
        title: 'No chrome, and a traceable tannery',
        body: [
          'We have used no chrome-tanned leather since 2019. Vegetable tanning is slower and dearer, but leaves no heavy metal in the effluent. All three tanneries we buy from are Leather Working Group audited.',
          'Our hardware is solid brass, not plated, so wear does not expose a different metal underneath and it recycles as a single material at end of life.',
        ],
        image: storyPhoto('sustain-material', 1200, 1500),
        imageAlt: 'Certified hides from the tannery',
      },
      {
        eyebrow: 'Waste',
        title: 'Offcuts are not rubbish, they are small leather goods',
        body: [
          'About eighteen per cent of a hide is left once the large panels are cut. That goes into card holders, key fobs and labels. What remains is milled into packaging fill.',
          'Six per cent of the solid waste leaving the atelier last year went to landfill. The target is under two per cent by the end of 2027.',
        ],
        image: storyPhoto('sustain-waste', 1200, 1500),
        imageAlt: 'Small goods made from offcuts',
      },
      {
        eyebrow: 'Packaging',
        title: 'No plastic, no foil, starch fill',
        body: [
          'Boxes are fully recycled board and dust bags are organic cotton. The void fill is corn starch and dissolves in water. There is no plastic lamination or metallic print on the boxes; both would make the board unrecyclable.',
        ],
        image: storyPhoto('sustain-packaging', 1200, 1500),
        imageAlt: 'A Velora box in recycled board',
      },
    ],
    stats: [
      { value: '100%', label: 'Vegetable-tanned leather' },
      { value: '18%', label: 'Offcuts into small goods' },
      { value: '6%', label: 'Waste to landfill' },
      { value: '0', label: 'Plastic in packaging' },
    ],
    timeline: [
      {
        year: '2027',
        title: 'Waste down to two per cent',
        body: 'Cut solid waste going to landfill from six per cent to under two.',
      },
      {
        year: '2028',
        title: 'Raise the repair rate',
        body: 'At least fifteen of every hundred pieces sold coming back to the bench for repair at least once.',
      },
      {
        year: '2030',
        title: 'Renewable energy',
        body: 'All atelier and warehouse electricity on a contracted renewable supply.',
      },
    ],
    closing: {
      title: 'Repair is the best recycling',
      body: 'If a Velora piece is looking worn, ask the atelier before buying a new one. A lining or a zip is usually all it takes.',
      ctaLabel: 'Get in touch',
      ctaHref: '/iletisim',
    },
  },
};
