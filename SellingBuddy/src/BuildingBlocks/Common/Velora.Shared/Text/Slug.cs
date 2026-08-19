using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Velora.Shared.Text
{
    /// <summary>
    /// URL slug generation with Turkish character folding, so
    /// "Şık Deri Çanta" becomes "sik-deri-canta" instead of losing the words.
    /// </summary>
    public static partial class Slug
    {
        private static readonly Dictionary<char, string> TurkishMap = new()
        {
            ['ç'] = "c", ['Ç'] = "c",
            ['ğ'] = "g", ['Ğ'] = "g",
            ['ı'] = "i", ['I'] = "i", ['İ'] = "i",
            ['ö'] = "o", ['Ö'] = "o",
            ['ş'] = "s", ['Ş'] = "s",
            ['ü'] = "u", ['Ü'] = "u"
        };

        public static string From(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return string.Empty;

            var folded = new StringBuilder(value.Length);

            foreach (var ch in value)
            {
                if (TurkishMap.TryGetValue(ch, out var replacement))
                    folded.Append(replacement);
                else
                    folded.Append(char.ToLowerInvariant(ch));
            }

            var normalized = folded.ToString().Normalize(NormalizationForm.FormD);
            var stripped = new StringBuilder(normalized.Length);

            foreach (var ch in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                    stripped.Append(ch);
            }

            var slug = NonSlugCharacters().Replace(stripped.ToString().Normalize(NormalizationForm.FormC), "-");
            slug = MultipleDashes().Replace(slug, "-").Trim('-');

            return slug;
        }

        /// <summary>Appends a numeric suffix until <paramref name="isTaken"/> returns false.</summary>
        public static string Unique(string? value, Func<string, bool> isTaken, string fallback = "item")
        {
            var baseSlug = From(value);
            if (string.IsNullOrEmpty(baseSlug)) baseSlug = fallback;

            var candidate = baseSlug;
            var suffix = 2;

            while (isTaken(candidate))
                candidate = $"{baseSlug}-{suffix++}";

            return candidate;
        }

        [GeneratedRegex("[^a-z0-9]+")]
        private static partial Regex NonSlugCharacters();

        [GeneratedRegex("-{2,}")]
        private static partial Regex MultipleDashes();
    }
}
