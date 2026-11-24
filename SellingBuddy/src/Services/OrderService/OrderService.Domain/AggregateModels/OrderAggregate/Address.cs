using OrderService.Domain.SeedWork;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OrderService.Domain.AggregateModels.OrderAggregate
{
    public record Address // : ValueObject
    {
        public string Street { get; private set; } = string.Empty;

        public string City { get; private set; } = string.Empty;

        public string State { get; private set; } = string.Empty;

        public string Country { get; private set; } = string.Empty;

        public string ZipCode { get; private set; } = string.Empty;

        public Address()
        {

        }

        public Address(string street, string city, string state, string country, string zipcode)
        {
            Street = street;
            City = city;
            State = state;
            Country = country;
            ZipCode = zipcode;
        }

        //protected override IEnumerable<object> GetEqualityComponents()
        //{
        //    // Using a yield return statement to return each element one at a time
        //    yield return Street;
        //    yield return City;
        //    yield return State;
        //    yield return Country;
        //    yield return ZipCode;
        //}
    }
}
