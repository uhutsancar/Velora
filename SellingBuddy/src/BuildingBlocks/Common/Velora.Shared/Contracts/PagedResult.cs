namespace Velora.Shared.Contracts
{
    /// <summary>
    /// Single paging envelope shared by every Velora service so the frontend
    /// has exactly one shape to deal with.
    /// </summary>
    public class PagedResult<T>
    {
        public PagedResult()
        {
        }

        public PagedResult(IReadOnlyCollection<T> items, int pageIndex, int pageSize, long totalCount)
        {
            Items = items;
            PageIndex = pageIndex;
            PageSize = pageSize;
            TotalCount = totalCount;
        }

        public IReadOnlyCollection<T> Items { get; set; } = Array.Empty<T>();

        public int PageIndex { get; set; }

        public int PageSize { get; set; }

        public long TotalCount { get; set; }

        public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);

        public bool HasPrevious => PageIndex > 0;

        public bool HasNext => PageIndex + 1 < TotalPages;
    }

    /// <summary>Query parameters every list endpoint accepts.</summary>
    public class PageQuery
    {
        private const int MaxPageSize = 100;

        private int pageSize = 20;

        public int PageIndex { get; set; }

        public int PageSize
        {
            get => pageSize;
            set => pageSize = value <= 0 ? 20 : Math.Min(value, MaxPageSize);
        }
    }
}
