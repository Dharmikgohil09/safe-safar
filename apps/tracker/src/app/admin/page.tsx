'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldAlert,
  Users,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  RotateCcw,
  ExternalLink,
  Info,
  Clock,
  Battery,
  MapPin,
  Lock,
} from 'lucide-react';
import {
  AdminSessionRecord,
  AdminSosRecord,
  AdminSummaryStats,
  CommunityReport,
} from '../../types/community';
import {
  getAdminSummaryStats,
  getAdminSessions,
  getAdminSosEvents,
  getAdminCommunityReports,
} from '../../services/adminDataService';
import { formatRelativeTime, formatTime } from '../../utils/geo';

type AdminTab = 'sessions' | 'sos' | 'reports';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('sessions');
  const [stats, setStats] = useState<AdminSummaryStats>({
    totalSessions: 0,
    activeSosCount: 0,
    resolvedSosCount: 0,
    communityReportsCount: 0,
  });

  // Records Lists
  const [sessions, setSessions] = useState<AdminSessionRecord[]>([]);
  const [sosEvents, setSosEvents] = useState<AdminSosRecord[]>([]);
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initial Load: Compute dynamic summary stats
  useEffect(() => {
    async function loadStats() {
      const summary = await getAdminSummaryStats();
      setStats(summary);
    }
    loadStats();
  }, []);

  // Fetch tab records based on active tab & filters
  useEffect(() => {
    async function loadTabRecords() {
      setIsLoading(true);
      if (activeTab === 'sessions') {
        const data = await getAdminSessions(searchQuery, statusFilter);
        setSessions(data);
      } else if (activeTab === 'sos') {
        const data = await getAdminSosEvents(searchQuery, statusFilter);
        setSosEvents(data);
      } else if (activeTab === 'reports') {
        const data = await getAdminCommunityReports(searchQuery, statusFilter);
        setCommunityReports(data);
      }
      setIsLoading(false);
    }

    loadTabRecords();
  }, [activeTab, searchQuery, statusFilter]);

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setStatusFilter('all');
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  return (
    <div className="admin-page-layout">
      {/* Top Header */}
      <header className="admin-top-header" role="banner">
        <div className="header-brand-group">
          <Link href="/" className="header-brand-link" title="SafeSafar Home">
            <div className="header-logo-icon">
              <Shield size={18} strokeWidth={2.2} />
            </div>
            <div className="header-brand-titles">
              <span className="brand-title">SafeSafar</span>
              <span className="brand-subtitle">Admin Demonstration Overview</span>
            </div>
          </Link>
        </div>

        <nav className="header-nav-group" aria-label="Navigation">
          <Link href="/heatmap" className="nav-link">
            Safety Heatmap
          </Link>
          <Link href="/track/safesafar-live-session-2026" className="nav-link">
            Live Tracker
          </Link>
          <span className="header-demo-tag" title="Demonstration View">
            READ-ONLY DEMO
          </span>
        </nav>
      </header>

      {/* Security & Access Notice */}
      <aside className="admin-security-notice" role="note">
        <div className="notice-content">
          <Lock size={15} className="notice-icon" />
          <div className="notice-text">
            <strong>Demonstration Notice:</strong> This dashboard is an illustrative read-only view designed for the SafeSafar IEEE demonstration. No production authorization or authentication gate is currently active. Personal phone numbers, full names, and complete private access tokens are deliberately masked or redacted.
          </div>
        </div>
      </aside>

      <div className="admin-container">
        {/* Summary Metric Cards (Dynamically computed from underlying data) */}
        <section className="summary-cards-grid" aria-label="System Metrics Summary">
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Total Tracking Sessions</span>
              <Users size={18} className="metric-icon text-blue" />
            </div>
            <div className="metric-value">{stats.totalSessions}</div>
            <div className="metric-sub">Active &amp; completed trips</div>
          </div>

          <div className="metric-card alert-card">
            <div className="metric-header">
              <span className="metric-label">Active SOS Alerts</span>
              <ShieldAlert size={18} className="metric-icon text-red" />
            </div>
            <div className="metric-value text-red">{stats.activeSosCount}</div>
            <div className="metric-sub">Emergency alerts requiring attention</div>
          </div>

          <div className="metric-card success-card">
            <div className="metric-header">
              <span className="metric-label">Resolved SOS Events</span>
              <CheckCircle2 size={18} className="metric-icon text-green" />
            </div>
            <div className="metric-value text-green">{stats.resolvedSosCount}</div>
            <div className="metric-sub">Confirmed all-clear signals</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Community Reports</span>
              <AlertTriangle size={18} className="metric-icon text-amber" />
            </div>
            <div className="metric-value">{stats.communityReportsCount}</div>
            <div className="metric-sub">Reported safety concerns</div>
          </div>
        </section>

        {/* Dashboard Navigation Tabs */}
        <div className="admin-tabs-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sessions'}
            onClick={() => handleTabChange('sessions')}
            className={`admin-tab-btn ${activeTab === 'sessions' ? 'is-active' : ''}`}
          >
            <span>Tracking Sessions</span>
            <span className="tab-badge">{stats.totalSessions}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sos'}
            onClick={() => handleTabChange('sos')}
            className={`admin-tab-btn ${activeTab === 'sos' ? 'is-active' : ''}`}
          >
            <span>SOS Events</span>
            <span className={`tab-badge ${stats.activeSosCount > 0 ? 'badge-urgent' : ''}`}>
              {stats.activeSosCount + stats.resolvedSosCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'reports'}
            onClick={() => handleTabChange('reports')}
            className={`admin-tab-btn ${activeTab === 'reports' ? 'is-active' : ''}`}
          >
            <span>Community Reports</span>
            <span className="tab-badge">{stats.communityReportsCount}</span>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="admin-toolbar-row">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder={`Search in ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="toolbar-search-input"
            />
          </div>

          <div className="filter-dropdown-wrap">
            <label htmlFor="admin-filter" className="sr-only">
              Filter by status or category:
            </label>
            <select
              id="admin-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="toolbar-select"
            >
              <option value="all">All Statuses / Categories</option>
              {activeTab === 'sessions' && (
                <>
                  <option value="active">Active Trip</option>
                  <option value="sos">SOS Emergency</option>
                  <option value="resolved">Resolved</option>
                  <option value="expired">Expired</option>
                </>
              )}
              {activeTab === 'sos' && (
                <>
                  <option value="active">Active SOS Only</option>
                  <option value="resolved">Resolved SOS Only</option>
                </>
              )}
              {activeTab === 'reports' && (
                <>
                  <option value="poor-lighting">Poor Lighting</option>
                  <option value="harassment">Harassment</option>
                  <option value="isolated-area">Isolated / Unsafe Area</option>
                  <option value="other">Other Safety Concern</option>
                </>
              )}
            </select>
          </div>

          {(searchQuery || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn-clear-toolbar"
            >
              <RotateCcw size={12} />
              <span>Clear Filter</span>
            </button>
          )}
        </div>

        {/* TAB 1: Tracking Sessions */}
        {activeTab === 'sessions' && (
          <section className="table-card" aria-label="Tracking Sessions Table">
            <div className="table-header-meta">
              <span>Showing {sessions.length} of {stats.totalSessions} sessions</span>
            </div>

            {sessions.length === 0 ? (
              <div className="empty-table-state">
                <AlertTriangle size={20} className="empty-icon" />
                <p>No tracking sessions found matching &quot;{searchQuery}&quot;</p>
                <button type="button" onClick={handleClearFilters} className="btn-empty-reset">
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="table-responsive-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Masked Session Token</th>
                      <th>User</th>
                      <th>Status</th>
                      <th>Destination</th>
                      <th>Battery</th>
                      <th>Last Update</th>
                      <th>Safe View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((sess) => (
                      <tr key={sess.tokenMasked}>
                        <td>
                          <code className="token-code">{sess.tokenMasked}</code>
                        </td>
                        <td>{sess.userNameMasked}</td>
                        <td>
                          {sess.status === 'sos' ? (
                            <span className="status-badge badge-sos">SOS ACTIVE</span>
                          ) : sess.status === 'resolved' ? (
                            <span className="status-badge badge-resolved">RESOLVED</span>
                          ) : sess.status === 'expired' ? (
                            <span className="status-badge badge-expired">EXPIRED</span>
                          ) : (
                            <span className="status-badge badge-normal">ACTIVE</span>
                          )}
                        </td>
                        <td>
                          <span className="dest-cell-text">{sess.destinationName}</span>
                        </td>
                        <td>
                          {sess.batteryLevel !== null && sess.batteryLevel !== undefined ? (
                            <span className="battery-cell">
                              <Battery size={13} />
                              {sess.batteryLevel}%
                            </span>
                          ) : (
                            <span className="text-muted">N/A</span>
                          )}
                        </td>
                        <td>{formatRelativeTime(sess.lastUpdated)}</td>
                        <td>
                          <Link
                            href={`/track/${encodeURIComponent(sess.rawToken)}`}
                            className="table-action-link"
                            title="Inspect tracking view"
                          >
                            <span>Open Tracker</span>
                            <ExternalLink size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: SOS Emergency Events */}
        {activeTab === 'sos' && (
          <section className="table-card" aria-label="SOS Events Table">
            <div className="table-header-meta">
              <span>Showing {sosEvents.length} of {stats.activeSosCount + stats.resolvedSosCount} SOS events</span>
            </div>

            {sosEvents.length === 0 ? (
              <div className="empty-table-state">
                <AlertTriangle size={20} className="empty-icon" />
                <p>No SOS events found matching your filter</p>
                <button type="button" onClick={handleClearFilters} className="btn-empty-reset">
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="table-responsive-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Event ID</th>
                      <th>Session Token</th>
                      <th>User</th>
                      <th>State</th>
                      <th>Triggered</th>
                      <th>Approximate Location</th>
                      <th>Emergency Action Status</th>
                      <th>Safe View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sosEvents.map((evt) => (
                      <tr key={evt.id}>
                        <td>
                          <code className="token-code">{evt.id}</code>
                        </td>
                        <td>
                          <code className="token-code">{evt.sessionTokenMasked}</code>
                        </td>
                        <td>{evt.userNameMasked}</td>
                        <td>
                          {evt.sosState === 'active' ? (
                            <span className="status-badge badge-sos">SOS ACTIVE</span>
                          ) : (
                            <span className="status-badge badge-resolved">RESOLVED</span>
                          )}
                        </td>
                        <td>{formatRelativeTime(evt.triggeredAt)}</td>
                        <td>
                          <span className="location-cell-text">
                            <MapPin size={12} />
                            {evt.approximateLocation}
                          </span>
                        </td>
                        <td>
                          <span className="contact-status-tag">{evt.emergencyContactStatus}</span>
                        </td>
                        <td>
                          <Link
                            href={`/track/${encodeURIComponent(evt.rawToken)}`}
                            className="table-action-link text-red"
                            title="Inspect SOS session"
                          >
                            <span>View Alert</span>
                            <ExternalLink size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: Community Safety Reports */}
        {activeTab === 'reports' && (
          <section className="table-card" aria-label="Community Reports Table">
            <div className="table-header-meta">
              <span>Showing {communityReports.length} of {stats.communityReportsCount} reports</span>
            </div>

            {communityReports.length === 0 ? (
              <div className="empty-table-state">
                <AlertTriangle size={20} className="empty-icon" />
                <p>No community safety reports found matching your filter</p>
                <button type="button" onClick={handleClearFilters} className="btn-empty-reset">
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="table-responsive-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Report ID</th>
                      <th>Category</th>
                      <th>Severity</th>
                      <th>Title &amp; Description</th>
                      <th>Approximate Location</th>
                      <th>Reported</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {communityReports.map((rep) => (
                      <tr key={rep.id}>
                        <td>
                          <code className="token-code">{rep.id}</code>
                        </td>
                        <td>
                          <span className="category-pill">{rep.categoryLabel}</span>
                        </td>
                        <td>
                          <span className={`severity-tag sev-${rep.severity}`}>
                            {rep.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="report-desc-cell">
                          <strong>{rep.title}</strong>
                          <p>{rep.description}</p>
                        </td>
                        <td>
                          <span className="location-cell-text">
                            <MapPin size={12} />
                            {rep.approximateLocation}
                          </span>
                        </td>
                        <td>{formatRelativeTime(rep.reportedAt)}</td>
                        <td>
                          <span className={`report-status-tag status-${rep.status}`}>
                            {rep.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
