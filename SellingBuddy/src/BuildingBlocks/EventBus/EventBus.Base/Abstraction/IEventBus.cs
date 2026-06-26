using EventBus.Base.Events;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EventBus.Base.Abstraction
{

    //Bu arayüz, her mikroservisin sahip olması gereken 3 temel aksiyonu tanımlıyor: Yayınla, Abone Ol ve Abonelikten Çık.
    public interface IEventBus: IDisposable
    {
        void Publish(IntegrationEvent @event);

        void Subscribe<T, TH>() where T : IntegrationEvent where TH : IIntegrationEventHandler<T>;

        void UnSubscribe<T, TH>() where T : IntegrationEvent where TH : IIntegrationEventHandler<T>;
    }
}
