using EventBus.Base.Events;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EventBus.Base.Abstraction
{

    // Generic Yapı (<TIntegrationEvent>): Buradaki T, "dinamik tip" demek. Yani sen SiparisEvent de göndersin,
    // OdemeEvent de gönderse bu arayüz hepsini kabul eder.
    //where TIntegrationEvent : IntegrationEvent(Constraint - Kısıtlama) :
    //Bu kodun en kritik yeri burası! Diyor ki: "Bana T olarak her şeyi verme!
    //Sadece IntegrationEvent sınıfından türetilmiş olanları ver."

    //Neden? Çünkü sen az önce IntegrationEvent sınıfını oluştururken içine
    //Id ve CreatedDate eklemiştin.
    //Eğer bu kısıtlama olmazsa, herhangi bir sınıfı buraya gönderebilirsin ve sistem patlar.
    //Bu kısıtlama sayesinde sistem "Hah, bu doğru bir mesaj, içinde ID ve tarih var" diyebiliyor.
    public interface IIntegrationEventHandler<TIntegrationEvent> : IntegrationEventHandler where TIntegrationEvent : IntegrationEvent
    {
        //Olay yakalandığında tetiklenecek olan fonksiyon.
        Task Handle(TIntegrationEvent @event);
    }

    public interface IntegrationEventHandler
    {

    }
}
