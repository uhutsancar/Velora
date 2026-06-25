using System.Text.Json.Serialization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EventBus.Base.Events
{
 public class IntegrationEvent
    {
        [JsonPropertyName("id")]
        public Guid Id { get; private set; }

        [JsonPropertyName("createdDate")]
        public DateTime CreatedDate { get;  private set; }



//        istemde yeni bir olay fırlatılacağı zaman(örneğin müşteri siparişi tamamla butonuna bastığında),
//        sen bu sınıfı çağırırsın(new IntegrationEvent()).

//Senin ekstra bir şey yazmana gerek kalmadan, bu blok anında o mesaja benzersiz bir
//Guid numarası atar ve saati o anki zamana(DateTime.Now) kurarak mesajı paketler.İşleri otomatize eder.

        public IntegrationEvent()
        {
            Id = Guid.NewGuid();
            CreatedDate = DateTime.Now;
        }


 // Diyelim ki Sipariş servisi bir mesajı EventBus'a (RabbitMQ'ya) gönderdi.
 // Bu mesaj ağ üzerinden JSON formatında gider.

//Ödeme servisi bu mesajı yakalayıp okumak istediğinde, o JSON metnini tekrar bu C#
//nesnesine dönüştürmesi (Deserialize etmesi) gerekir.

//İşte bu yapıcı metot, gelen paketin içindeki eski/var olan Id ve CreatedDate bilgilerini alıp nesneyi yeniden inşa etmek
//için kullanılır.Aksi takdirde, mesajı okuyan servis yanlışlıkla yeni bir Id ve yeni bir tarih atardı ve mesajın orijinalliği bozulurdu.



        [JsonConstructor]
        public IntegrationEvent(Guid id, DateTime createdDate) 
        {
            Id = id;
           CreatedDate =  createdDate;
        }
    }
}
