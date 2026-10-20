'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield,
  Filter,
  AlertTriangle,
  RotateCcw,
  Search,
  MapPin,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
} from 'lucide-react';
import SafetyHeatmap from '../../components/Heatmap/SafetyHeatmap';
import { CommunityReport, CommunityReportFilter, ReportCategory, ReportSeverity } from '../../types/community';
import { getCommunityReports } from '../../services/communityReportsService';
import { formatRelativeTime, formatTime } from '../../utils/geo';
import { config } from '../../config/env';

export default function HeatmapPage() {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters State
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<ReportSeverity | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Report for Details Drawer
  const [selectedReport, setSelectedReport] = useState<CommunityReport | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(true);

  // Fetch reports on filter change
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const filter: CommunityReportFilter = {
        category: categoryFilter,
        severity: severityFilter,
        timePeriod: timeFilter,
        searchQuery,
      };
      const data = await getCommunityReports(filter);
      setReports(data);

      // Keep selected report if still in filtered list, else reset
      if (selectedReport && !data.some((r) => r.id === selectedReport.id)) {
        setSelectedReport(null);
      }
    } catch {
      setErrorMessage('Unable to load community safety reports. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, severityFilter, timeFilter, searchQuery, selectedReport]);

  useEffect(() => {
    fetchReports();
  }, [categoryFilter, severityFilter, timeFilter, searchQuery]);

  const handleResetFilters = () => {
    setCategoryFilter('all');
    setSeverityFilter('all');
    setTimeFilter('all');
    setSearchQuery('');
  };

  const isFilteringActive =
    categoryFilter !== 'all' ||
    severityFilter !== 'all' ||
    timeFilter !== 'all' ||
    searchQuery.trim().length > 0;

  return (
    <main className="heatmap-page-layout">
      {/* Top Header */}
      <header className="heatmap-top-header" role="banner">
        <div className="header-brand-group">
          <Link href="/" className="header-brand-link" title="SafeSafar Home">
            <div className="header-logo-icon">
              <Shield size={18} strokeWidth={2.2} />
            </div>
            <div className="header-brand-titles">
              <span className="brand-title">SafeSafar</span>
              <span className="brand-subtitle">Community Heatmap</span>
            </div>
          </Link>
        </div>

        <nav className="header-nav-group" aria-label="Main Navigation">
          <Link href="/track/safesafar-live-session-2026" className="nav-link">
            Live Tracker
          </Link>
          <Link href="/admin" className="nav-link">
            Admin View
          </Link>
          <span className="header-demo-tag" title="Demonstration Dataset">
            DEMO DATA
          </span>
        </nav>
      </header>

      {/* Demo Disclaimer Notice */}
      <div className="heatmap-demo-banner" role="note">
        <Info size={14} className="banner-info-icon" />
        <span>
          <strong>DEMO DATA:</strong> Reports shown below are illustrative samples for the SafeSafar IEEE demonstration. They do not reflect real-time law enforcement or emergency records.
        </span>
      </div>

      <div className="heatmap-main-container">
        {/* Left Side: Safety Concerns & Filters Panel */}
        <section className="heatmap-control-panel" aria-label="Safety Filters and Reports">
          <div className="panel-header-row">
            <div className="panel-header-title">
              <Filter size={15} />
              <span>Safety Concerns</span>
              <span className="report-count-badge">{reports.length}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className="panel-toggle-btn"
              aria-label={isFilterPanelOpen ? 'Collapse filters' : 'Expand filters'}
            >
              {isFilterPanelOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>

          {isFilterPanelOpen && (
            <div className="panel-content-body">
              {/* Search Input */}
              <div className="search-input-group">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search area, title, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="filter-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="search-clear-btn"
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Filter Dropdowns */}
              <div className="filters-grid">
                <div className="filter-item">
                  <label htmlFor="cat-filter" className="filter-label">
                    Category:
                  </label>
                  <select
                    id="cat-filter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as any)}
                    className="filter-select"
                  >
                    <option value="all">All Categories</option>
                    <option value="poor-lighting">Poor Lighting</option>
                    <option value="harassment">Harassment</option>
                    <option value="isolated-area">Isolated / Unsafe Area</option>
                    <option value="other">Other Safety Concern</option>
                  </select>
                </div>

                <div className="filter-item">
                  <label htmlFor="sev-filter" className="filter-label">
                    Severity:
                  </label>
                  <select
                    id="sev-filter"
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value as any)}
                    className="filter-select"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="filter-item">
                  <label htmlFor="time-filter" className="filter-label">
                    Time Period:
                  </label>
                  <select
                    id="time-filter"
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value as any)}
                    className="filter-select"
                  >
                    <option value="all">All Time</option>
                    <option value="24h">Past 24 Hours</option>
                    <option value="7d">Past 7 Days</option>
                    <option value="30d">Past 30 Days</option>
                  </select>
                </div>
              </div>

              {/* Reset Filters action */}
              {isFilteringActive && (
                <div className="filter-reset-row">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="btn-reset-filters"
                  >
                    <RotateCcw size={13} />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="filter-loading-strip">
                  <span>Updating safety markers...</span>
                </div>
              )}

              {/* Error State */}
              {errorMessage && (
                <div className="filter-error-box" role="alert">
                  <AlertTriangle size={15} />
                  <span>{errorMessage}</span>
                  <button type="button" onClick={fetchReports} className="btn-retry-inline">
                    Retry
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && reports.length === 0 && (
                <div className="filter-empty-box" role="status">
                  <AlertTriangle size={24} className="empty-icon" />
                  <h3 className="empty-title">No safety reports match your filters</h3>
                  <p className="empty-desc">
                    Try selecting &quot;All Categories&quot; or expanding the time window to view reports.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="btn-reset-filters-primary"
                  >
                    <RotateCcw size={13} />
                    <span>Reset Filters</span>
                  </button>
                </div>
              )}

              {/* Reports List Cards */}
              <div className="reports-cards-list">
                {reports.map((report) => {
                  const isSelected = selectedReport?.id === report.id;
                  return (
                    <article
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`report-summary-card ${report.severity} ${
                        isSelected ? 'is-active' : ''
                      }`}
                    >
                      <div className="card-top-row">
                        <span className={`severity-tag sev-${report.severity}`}>
                          {report.severity.toUpperCase()}
                        </span>
                        <span className="card-time">{formatRelativeTime(report.reportedAt)}</span>
                      </div>

                      <h4 className="card-title">{report.title}</h4>

                      <div className="card-location-row">
                        <MapPin size={12} />
                        <span>{report.approximateLocation}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Right Side: Main Map View Area */}
        <div className="heatmap-viewport-section">
          <SafetyHeatmap
            reports={reports}
            selectedReport={selectedReport}
            onSelectReport={(report) => setSelectedReport(report)}
            tileUrl={config.mapTileUrl}
            attribution={config.mapAttribution}
          />

          {/* Selected Report Details Modal / Drawer */}
          {selectedReport && (
            <aside className="selected-report-card" aria-label="Detailed Safety Report">
              <div className="report-detail-header">
                <div className="detail-tags-group">
                  <span className={`severity-tag sev-${selectedReport.severity}`}>
                    {selectedReport.severity.toUpperCase()} SEVERITY
                  </span>
                  <span className="category-pill">{selectedReport.categoryLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="btn-close-detail"
                  aria-label="Close report details"
                >
                  <X size={15} />
                </button>
              </div>

              <h3 className="detail-title">{selectedReport.title}</h3>

              <div className="detail-meta-row">
                <div className="meta-item">
                  <MapPin size={13} />
                  <span>{selectedReport.approximateLocation}</span>
                </div>
                <div className="meta-item">
                  <Clock size={13} />
                  <span>
                    {formatRelativeTime(selectedReport.reportedAt)} ({formatTime(selectedReport.reportedAt)})
                  </span>
                </div>
              </div>

              <p className="detail-description">{selectedReport.description}</p>

              <div className="detail-footer-note">
                <span className="privacy-badge">Verified Privacy:</span>
                <span>Reporter identities and private telephone numbers are excluded to safeguard community privacy.</span>
              </div>
            </aside>
          )}
        </div>
      </div>
    </main>
  );
}
