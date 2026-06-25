using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Intrinsics.X86;
using System.Text;
using System.Threading.Tasks;

namespace EventBus.Base
{

    //SubscriptionInfo, senin EventBus'ının "Kim, hangi olaya abone oldu?" sorusunun cevabını tutan, sistemin hafızasıdır.
    //Hatırlarsan az önce Subscribe<T, TH>() metodunu yazmıştın.İşte bu SubscriptionInfo sınıfı,
    //o TH (yani Handler sınıfı) hakkında bilgiyi "paketleyip"
    //sistemin belleğinde saklaman için tasarlanmış basit ama kritik bir taşıyıcıdır.
    public class SubscriptionInfo
    {
        public Type HandlerType { get; }

        public SubscriptionInfo(Type handlerType)
        {
            HandlerType = handlerType ?? throw new ArgumentNullException(nameof(handlerType));
        }

        public static SubscriptionInfo Typed(Type handlerType)
        {
            return new SubscriptionInfo(handlerType);
        }

    }
}
