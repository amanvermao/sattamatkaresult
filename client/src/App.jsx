import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  History,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const PAGE_SIZE = 15;

function getLocalDateValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function hasResult(market) {
  const value = String(market.resultString ?? "").trim();

  return Boolean(
    value &&
    value !== "-" &&
    value !== "—" &&
    value.toLowerCase() !== "pending",
  );
}

function formatDate(value) {
  if (!value) return "—";

  const parts = value.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
}

function marketStatus(market) {
  if (hasResult(market)) {
    return {
      label: "Published",
      style: "bg-emerald-50 text-emerald-700",
    };
  }

  if (String(market.status).toLowerCase() === "open") {
    return {
      label: "In progress",
      style: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Upcoming",
    style: "bg-slate-100 text-slate-600",
  };
}

export default function App() {
  const [markets, setMarkets] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getLocalDateValue);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchResults = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/results?date=${encodeURIComponent(
            selectedDate,
          )}`,
        );

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Unable to load market results.");
        }

        if (!Array.isArray(payload.results)) {
          throw new Error("The API returned an unexpected response.");
        }

        setMarkets(payload.results);
        setLastUpdated(new Date());
        setPage(1);
      } catch (err) {
        setError(err.message || "Unable to connect to the results server.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate],
  );

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const publishedCount = markets.filter(hasResult).length;
  const pendingCount = markets.length - publishedCount;

  const filteredMarkets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return markets.filter((market) => {
      const matchesSearch = [
        market.name,
        market.slug,
        market.session,
        market.resultString,
        market.openTime,
        market.closeTime,
        market.resultDate,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

      const available = hasResult(market);

      const matchesFilter =
        filter === "all" ||
        (filter === "published" && available) ||
        (filter === "pending" && !available);

      return matchesSearch && matchesFilter;
    });
  }, [markets, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredMarkets.length / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const visibleMarkets = filteredMarkets.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // This chart summarizes the currently fetched dataset.
  // It is not a historical or predictive chart.
  const publishedPercent = markets.length
    ? Math.round((publishedCount / markets.length) * 100)
    : 0;

  const pendingPercent = markets.length
    ? Math.round((pendingCount / markets.length) * 100)
    : 0;

  function changeFilter(value) {
    setFilter(value);
    setPage(1);
  }

  function changeSearch(value) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-[#F8F7FC] text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-violet-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a href="#home" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-700 text-white shadow-lg shadow-violet-200">
              <Activity size={24} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold tracking-tight text-[#291447] sm:text-xl">
                Satta Matka India
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">
                Results &amp; Records
              </p>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <a href="#home" className="text-violet-700">
              Home
            </a>
            <a
              href="#live-results"
              className="transition hover:text-violet-700"
            >
              Live Results
            </a>
            <a href="#charts" className="transition hover:text-violet-700">
              Result Charts
            </a>
            <a href="#about" className="transition hover:text-violet-700">
              About
            </a>
          </nav>

          <button
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
            className="rounded-lg border border-violet-100 p-2 text-violet-800 md:hidden"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <nav className="grid gap-1 border-t border-violet-100 bg-white px-4 py-3 md:hidden">
            {[
              ["Home", "#home"],
              ["Live Results", "#live-results"],
              ["Result Charts", "#charts"],
              ["About", "#about"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-700"
              >
                {label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main id="home" className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {/* Page intro */}
        <section className="mb-7 overflow-hidden rounded-2xl bg-gradient-to-br from-[#291447] via-[#4C1D95] to-[#6D28D9] p-6 text-white shadow-xl shadow-violet-200/60 sm:p-8 lg:p-10">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                RESULTS INFORMATION BOARD
              </div>

              <h2 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Market Results,
                <span className="block text-violet-200">All in One Place.</span>
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-6 text-violet-100 sm:text-base">
                Check published market results, view schedules, and browse
                available result records in one convenient place.
              </p>

              <a
                href="#live-results"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold !text-violet-800 shadow-lg transition hover:bg-violet-50"
              >
                <span>View Results</span>
                <ArrowDownRight size={17} />
              </a>
            </div>

            <div className="hidden w-44 items-center justify-center lg:flex">
              <div className="flex h-36 w-36 items-center justify-center rounded-full border border-white/20 bg-white/10">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/20 bg-white/10">
                  <Activity size={54} strokeWidth={1.4} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Summary cards */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Database size={21} />}
            label="Total market records"
            value={loading ? "—" : markets.length}
            note={`For ${formatDate(selectedDate)}`}
            color="violet"
          />

          <StatCard
            icon={<CheckCircle2 size={21} />}
            label="Published results"
            value={loading ? "—" : publishedCount}
            note="Results returned by the API"
            color="green"
          />

          <StatCard
            icon={<Clock3 size={21} />}
            label="Awaiting results"
            value={loading ? "—" : pendingCount}
            note="Records without a result"
            color="amber"
          />
        </section>

        {/* Live results table */}
        <section
          id="live-results"
          className="mb-8 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm shadow-violet-100/50"
        >
          <div className="border-b border-violet-100 p-5 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-violet-600" />
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
                    Market board
                  </p>
                </div>

                <h3 className="text-2xl font-extrabold tracking-tight text-[#291447]">
                  Daily Market Results
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Search markets and view their published results.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[490px]">
                <div>
                  <label
                    htmlFor="result-date"
                    className="mb-1.5 block text-xs font-bold text-slate-600"
                  >
                    Select date
                  </label>
                  <input
                    id="result-date"
                    type="date"
                    value={selectedDate}
                    max={getLocalDateValue()}
                    onChange={(event) => {
                      if (event.target.value) {
                        setSelectedDate(event.target.value);
                        setPage(1);
                      }
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="market-search"
                    className="mb-1.5 block text-xs font-bold text-slate-600"
                  >
                    Search markets
                  </label>
                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="market-search"
                      type="search"
                      value={search}
                      onChange={(event) => changeSearch(event.target.value)}
                      placeholder="Search by market or result..."
                      className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {[
                ["all", "All markets"],
                ["published", "Published"],
                ["pending", "Upcoming / pending"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => changeFilter(value)}
                  className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                    filter === value
                      ? "bg-violet-700 text-white shadow-md shadow-violet-200"
                      : "bg-violet-50 text-violet-800 hover:bg-violet-100"
                  }`}
                >
                  {label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                <span
                  className={`h-2 w-2 rounded-full ${
                    error
                      ? "bg-red-500"
                      : loading
                        ? "bg-amber-400"
                        : "bg-emerald-500"
                  }`}
                />
                {error
                  ? "Connection issue"
                  : loading
                    ? "Loading..."
                    : "Data fetched"}
              </div>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="m-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 sm:m-6"
            >
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-bold">Unable to load results</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => fetchResults(true)}
                className="text-sm font-bold underline"
              >
                Retry
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3 bg-violet-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm font-semibold text-[#291447]">
              {formatDate(selectedDate)}{" "}
              <span className="font-normal text-slate-500">
                · {filteredMarkets.length} matching records
              </span>
            </p>

            <button
              type="button"
              disabled={loading || refreshing}
              onClick={() => fetchResults(true)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-800 transition hover:bg-violet-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh results"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-[#F5F1FC] text-xs uppercase tracking-wider text-violet-900">
                <tr>
                  <th className="px-5 py-4 font-extrabold">Market name</th>
                  <th className="px-5 py-4 font-extrabold">Timing</th>
                  <th className="px-5 py-4 font-extrabold">Result</th>
                  <th className="px-5 py-4 font-extrabold">Date</th>
                  <th className="px-5 py-4 font-extrabold">Status</th>
                  <th className="px-5 py-4 text-right font-extrabold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && markets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <RefreshCw
                        size={25}
                        className="mx-auto animate-spin text-violet-600"
                      />
                      <p className="mt-3 font-semibold text-slate-700">
                        Loading market results...
                      </p>
                    </td>
                  </tr>
                ) : visibleMarkets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <Search size={26} className="mx-auto text-violet-300" />
                      <p className="mt-3 font-bold text-slate-800">
                        No matching markets
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Try another date or search term.
                      </p>
                    </td>
                  </tr>
                ) : (
                  visibleMarkets.map((market, index) => {
                    const status = marketStatus(market);

                    return (
                      <tr
                        key={`${market.slug || market.name}-${market.resultDate}-${index}`}
                        className="transition hover:bg-violet-50/60"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-[#291447]">
                            {market.name}
                          </p>
                          <p className="mt-1 text-xs capitalize text-slate-500">
                            {market.session || "Market results"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 whitespace-nowrap text-slate-600">
                            <Clock3 size={15} className="text-violet-500" />
                            {market.openTime || "—"}
                          </div>
                          <p className="mt-1 pl-[23px] text-xs text-slate-400">
                            Closes {market.closeTime || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {hasResult(market) ? (
                            <span className="inline-flex whitespace-nowrap rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 font-mono font-extrabold tracking-wide text-violet-800">
                              {market.resultString}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">
                              Awaiting result
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {formatDate(market.resultDate)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${status.style}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedMarket(market)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-800 transition hover:border-violet-500 hover:bg-violet-50"
                          >
                            <Eye size={15} />
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-violet-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-slate-500">
              {filteredMarkets.length
                ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(
                    currentPage * PAGE_SIZE,
                    filteredMarkets.length,
                  )} of ${filteredMarkets.length}`
                : "Showing 0 records"}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-sm font-semibold text-slate-600">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {/* Results overview chart */}
        <section id="charts" className="mb-8">
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2">
              <History size={17} className="text-violet-700" />
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
                Result overview
              </p>
            </div>

            <h3 className="text-2xl font-extrabold tracking-tight text-[#291447]">
              Market Results Chart
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              A summary of the results returned for {formatDate(selectedDate)}.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-[#291447]">
                    Publication status
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Published versus pending records
                  </p>
                </div>

                <div className="rounded-xl bg-violet-50 p-3 text-violet-700">
                  <Activity size={21} />
                </div>
              </div>

              <div className="mt-7">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-600">
                    Published results
                  </span>
                  <span className="font-extrabold text-emerald-700">
                    {publishedCount}
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${publishedPercent}%` }}
                  />
                </div>

                <div className="mb-2 mt-6 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-600">
                    Awaiting results
                  </span>
                  <span className="font-extrabold text-amber-700">
                    {pendingCount}
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${pendingPercent}%` }}
                  />
                </div>
              </div>

              <p className="mt-6 text-xs leading-5 text-slate-500">
                {markets.length
                  ? `${publishedPercent}% of the returned records contain a result.`
                  : "No data available to summarize."}
              </p>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-[#291447]">
                    Latest available results
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Result breakdown from the selected day's records
                  </p>
                </div>

                <div className="rounded-xl bg-violet-50 p-3 text-violet-700">
                  <CalendarDays size={21} />
                </div>
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {markets
                  .filter(hasResult)
                  .slice(0, 6)
                  .map((market, index) => (
                    <button
                      key={`${market.slug || market.name}-${market.resultDate}-${index}`}
                      type="button"
                      onClick={() => setSelectedMarket(market)}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:bg-violet-50/70"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-800">
                          {market.name}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {market.openTime || "Time unavailable"}
                        </span>
                      </span>

                      <span className="shrink-0 rounded-lg bg-violet-50 px-3 py-2 font-mono text-sm font-extrabold text-violet-800">
                        {market.resultString}
                      </span>
                    </button>
                  ))}

                {!loading && markets.filter(hasResult).length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No published results for this date.
                  </p>
                )}

                {loading && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    Loading results...
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Informational disclaimer */}
        <section
          id="about"
          className="mb-8 rounded-2xl border border-violet-100 bg-white p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-50 p-3 text-violet-700">
              <ShieldCheck size={23} />
            </div>
            <div>
              <h3 className="font-extrabold text-[#291447]">
                About Satta Matka India
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This website displays market results and related records for
                informational purposes. Data availability and accuracy depend on
                the source provider. Please check the applicable local laws and
                the provider's information before relying on any result. This
                website does not provide betting transactions.
              </p>
            </div>
          </div>
        </section>

        <footer className="border-t border-violet-100 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-extrabold text-[#291447]">Satta Matka India</p>
              <p className="mt-1 text-xs text-slate-500">
                Market results and records
              </p>
            </div>

            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
              <a href="#about" className="hover:text-violet-700">
                About
              </a>
              <a href="#about" className="hover:text-violet-700">
                Disclaimer
              </a>
              <a href="#home" className="hover:text-violet-700">
                Back to top
              </a>
            </nav>
          </div>

          <div className="mt-5 flex flex-col gap-2 border-t border-violet-100 pt-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Satta Matka India.</p>
            <p>
              {lastUpdated
                ? `Last fetched ${lastUpdated.toLocaleTimeString()}`
                : "Waiting for results"}
            </p>
          </div>
        </footer>
      </main>

      {/* Market details modal */}
      {selectedMarket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#180C2B]/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedMarket(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="market-detail-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-[#291447] to-violet-700 p-5 text-white sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-200">
                  Market details
                </p>
                <h2
                  id="market-detail-title"
                  className="mt-2 text-2xl font-extrabold"
                >
                  {selectedMarket.name}
                </h2>
                <p className="mt-1 text-sm text-violet-200">
                  {formatDate(selectedMarket.resultDate)}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close details"
                onClick={() => setSelectedMarket(null)}
                className="rounded-lg p-2 text-white hover:bg-white/10"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <div className="rounded-xl bg-violet-50 p-5 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
                  Published result
                </p>
                <p className="mt-3 break-words font-mono text-3xl font-extrabold tracking-wider text-[#291447] sm:text-4xl">
                  {hasResult(selectedMarket)
                    ? selectedMarket.resultString
                    : "Result Pending"}
                </p>
                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                    hasResult(selectedMarket)
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {hasResult(selectedMarket) ? "Published" : "Awaiting result"}
                </span>
              </div>

              <h3 className="mb-3 mt-6 font-extrabold text-[#291447]">
                Result breakdown
              </h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  ["Open Pana", selectedMarket.openPana],
                  ["Open Ank", selectedMarket.openAnk],
                  ["Jodi", selectedMarket.jodi],
                  ["Close Ank", selectedMarket.closeAnk],
                  ["Close Pana", selectedMarket.closePana],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-violet-100 bg-white p-4"
                  >
                    <p className="text-xs font-semibold text-slate-500">
                      {label}
                    </p>
                    <p className="mt-2 font-mono text-xl font-extrabold text-violet-800">
                      {value !== null && value !== undefined && value !== ""
                        ? value
                        : "—"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-100">
                {[
                  ["Opening time", selectedMarket.openTime],
                  ["Closing time", selectedMarket.closeTime],
                  ["Session", selectedMarket.session],
                  ["Result date", formatDate(selectedMarket.resultDate)],
                  [
                    "Provider verification",
                    selectedMarket.verified === true
                      ? "Verified by provider"
                      : "Not verified",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-right text-sm font-bold text-slate-800">
                      {value || "—"}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSelectedMarket(null)}
                className="mt-5 w-full rounded-xl bg-violet-700 px-5 py-3 font-bold text-white transition hover:bg-violet-800"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, note, color }) {
  const styles = {
    violet: {
      icon: "bg-violet-50 text-violet-700",
      value: "text-[#291447]",
      trend: <ArrowUpRight size={17} />,
    },
    green: {
      icon: "bg-emerald-50 text-emerald-700",
      value: "text-emerald-700",
      trend: <CheckCircle2 size={17} />,
    },
    amber: {
      icon: "bg-amber-50 text-amber-700",
      value: "text-amber-700",
      trend: <ArrowDownRight size={17} />,
    },
  };

  const style = styles[color];

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-violet-100/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p
            className={`mt-3 text-3xl font-extrabold tracking-tight ${style.value}`}
          >
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{note}</p>
        </div>

        <div className={`rounded-xl p-3 ${style.icon}`}>{icon}</div>
      </div>
    </div>
  );
}
