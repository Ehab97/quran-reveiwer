import { useState, useCallback, useRef } from 'react';
import { Search, ExternalLink, BookOpen, RefreshCw, X, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import VoiceInput from './VoiceInput';
import { useApp } from '../../context/AppContext';

interface SearchResult {
  title: string;
  snippet: string;
  pageid: number;
  url: string;
}

export function IslamicSearch() {
  const { isDark, t } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [instantAnswer, setInstantAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setError('');
    setResults([]);
    setHasSearched(true);
    setInstantAnswer('');
    setExpandedItem(null);

    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery + ' islam')}&format=json&origin=*&srprop=snippet&srlimit=8`;
      const wikiRes = await fetch(wikiUrl);
      const wikiData = await wikiRes.json();

      const wikiResults: SearchResult[] = (wikiData.query?.search || []).map((item: { title: string; snippet: string; pageid: number }) => ({
        title: item.title,
        snippet: item.snippet.replace(/<[^>]+>/g, ''),
        pageid: item.pageid,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      }));

      if (wikiResults.length > 0) {
        try {
          const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&pageids=${wikiResults[0].pageid}&format=json&origin=*`;
          const extractRes = await fetch(extractUrl);
          const extractData = await extractRes.json();
          const pages = extractData.query?.pages;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            const extract = pages[pageId]?.extract;
            if (extract) {
              setInstantAnswer(extract.substring(0, 600) + (extract.length > 600 ? '...' : ''));
            }
          }
        } catch {
          // ignore extract errors
        }
      }

      setResults(wikiResults);
    } catch {
      setError(t.search.error);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const handleVoiceTranscript = useCallback((text: string) => {
    setQuery(text);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) performSearch(query.trim());
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setInstantAnswer('');
    setError('');
    inputRef.current?.focus();
  };

  const bg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const border = isDark ? 'border-gray-700' : 'border-gray-200';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  return (
    <div className={`flex flex-col h-full ${bg}`}>
      {/* Search Header */}
      <div className={`px-4 pt-6 pb-4 ${cardBg} border-b ${border}`}>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-emerald-600" />
          <h2 className={textMain}>{t.search.title}</h2>
        </div>

        {/* Text search bar */}
        <form onSubmit={handleSubmit} className="relative mb-5">
          <div className="relative flex items-center">
            <Search className={`absolute start-3 w-4 h-4 ${textSub} pointer-events-none`} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search.placeholder}
              className={`w-full ps-10 pe-10 py-3 rounded-xl border ${inputBg} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`}
              dir="ltr"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className={`absolute end-3 ${textSub} hover:text-red-500 transition-colors`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span className="text-sm">{isLoading ? t.search.searching : t.search.button}</span>
          </button>
        </form>

        {/* Voice Input */}
        <VoiceInput
          onTranscript={handleVoiceTranscript}
          onSearch={performSearch}
        />
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-y-auto">
        {/* Suggested topics */}
        {!hasSearched && !isLoading && (
          <div className="p-4">
            <p className={`text-xs uppercase tracking-wider mb-3 ${textSub}`}>{t.search.suggestedTopics}</p>
            <div className="grid grid-cols-2 gap-2">
              {t.search.suggestedList.map((topic) => (
                <button
                  key={topic}
                  onClick={() => {
                    setQuery(topic);
                    performSearch(topic);
                  }}
                  className={`text-start px-3 py-2.5 rounded-xl border ${border} ${cardBg} hover:border-emerald-500 hover:text-emerald-600 transition-all text-sm ${textMain}`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`${cardBg} rounded-xl p-4 border ${border}`}>
                <div className={`h-4 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'} w-3/4 mb-2 animate-pulse`} />
                <div className={`h-3 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'} w-full mb-1.5 animate-pulse`} />
                <div className={`h-3 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'} w-5/6 animate-pulse`} />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Results */}
        {!isLoading && results.length > 0 && (
          <div className="p-4 space-y-3">
            {/* Instant answer card */}
            {instantAnswer && (
              <div className={`${cardBg} rounded-xl border-2 border-emerald-500 p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">{t.search.topResult}</span>
                </div>
                <h3 className={`mb-2 ${textMain}`}>{results[0].title}</h3>
                <p className={`text-sm leading-relaxed ${textSub}`} dir="ltr">{instantAnswer}</p>
                <a
                  href={results[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm text-emerald-600 hover:text-emerald-500 font-medium"
                >
                  {t.search.readFull} <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <p className={`text-xs uppercase tracking-wider ${textSub} pt-1`}>
              {t.search.results(results.length, query)}
            </p>

            {results.slice(instantAnswer ? 1 : 0).map((result, idx) => (
              <div key={result.pageid} className={`${cardBg} rounded-xl border ${border} overflow-hidden`}>
                <button
                  className="w-full text-start p-4"
                  onClick={() => setExpandedItem(expandedItem === result.pageid ? null : result.pageid)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                          #{idx + (instantAnswer ? 2 : 1)}
                        </span>
                        <h4 className={`truncate ${textMain}`}>{result.title}</h4>
                      </div>
                      <p className={`text-sm leading-relaxed line-clamp-2 ${textSub}`} dir="ltr">{result.snippet}</p>
                    </div>
                    <div className={`flex-shrink-0 mt-1 ${textSub}`}>
                      {expandedItem === result.pageid ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </button>
                {expandedItem === result.pageid && (
                  <div className={`px-4 pb-4 border-t ${border} pt-3`}>
                    <p className={`text-sm leading-relaxed mb-3 ${textSub}`} dir="ltr">{result.snippet}</p>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-500 font-medium"
                    >
                      {t.search.openWiki} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!isLoading && hasSearched && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Search className={`w-10 h-10 mb-3 ${textSub}`} />
            <p className={`mb-1 ${textMain}`}>{t.search.noResultsTitle}</p>
            <p className={`text-sm ${textSub}`}>{t.search.noResultsDesc}</p>
          </div>
        )}
      </div>
    </div>
  );
}
