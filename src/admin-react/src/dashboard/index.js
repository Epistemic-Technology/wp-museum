import apiFetch from "@wordpress/api-fetch";
import { useState, useEffect } from "@wordpress/element";
import { Spinner } from "@wordpress/components";
import { baseRestPath, wordPressRestBase } from "../util";

/**
 * Statistics Card Component
 */
const StatCard = ({ title, value, subtitle, loading, href, onClick }) => {
  const CardContent = () => (
    <>
      <div className="stat-card-header">{title}</div>
      {loading ? (
        <div className="stat-card-loading">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="stat-card-value">{value}</div>
          {subtitle && <div className="stat-card-subtitle">{subtitle}</div>}
        </>
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} className="stat-card stat-card-clickable">
        <CardContent />
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        className="stat-card stat-card-clickable"
        onClick={onClick}
      >
        <CardContent />
      </button>
    );
  }

  return (
    <div className="stat-card">
      <CardContent />
    </div>
  );
};

/**
 * Statistics Panel Component
 */
const StatisticsPanel = () => {
  const [objectKinds, setObjectKinds] = useState(null);
  const [collections, setCollections] = useState(null);
  const [remoteClients, setRemoteClients] = useState(null);
  const [objectsByKind, setObjectsByKind] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all data in parallel
        const [kindsRes, collectionsRes, clientsRes] = await Promise.all([
          apiFetch({ path: `${baseRestPath}/mobject_kinds` }),
          apiFetch({ path: `${baseRestPath}/collections` }),
          apiFetch({ path: `${baseRestPath}/remote_clients` }),
        ]);

        setObjectKinds(kindsRes);
        setCollections(collectionsRes);
        setRemoteClients(clientsRes);

        // Fetch object counts by kind and status
        const kindCounts = {};
        for (const kind of kindsRes) {
          try {
            // Fetch counts for each status
            const [publishedRes, pendingRes, draftRes] = await Promise.all([
              apiFetch({
                path: `${baseRestPath}/${kind.type_name}?per_page=1&status=publish`,
                parse: false,
              }),
              apiFetch({
                path: `${baseRestPath}/${kind.type_name}?per_page=1&status=pending`,
                parse: false,
              }),
              apiFetch({
                path: `${baseRestPath}/${kind.type_name}?per_page=1&status=draft`,
                parse: false,
              }),
            ]);

            kindCounts[kind.type_name] = {
              label: kind.label,
              published: parseInt(publishedRes.headers.get("X-WP-Total")) || 0,
              pending: parseInt(pendingRes.headers.get("X-WP-Total")) || 0,
              draft: parseInt(draftRes.headers.get("X-WP-Total")) || 0,
            };
          } catch (error) {
            kindCounts[kind.type_name] = {
              label: kind.label,
              published: 0,
              pending: 0,
              draft: 0,
            };
          }
        }
        setObjectsByKind(kindCounts);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalCollections = collections?.length || 0;
  const totalKinds = objectKinds?.length || 0;
  const activeClients = remoteClients?.filter((c) => !c.blocked).length || 0;

  // Build status subtitle for object kinds
  const getStatusSubtitle = (counts) => {
    const parts = [];
    if (counts.published > 0) parts.push(`${counts.published} published`);
    if (counts.pending > 0) parts.push(`${counts.pending} pending`);
    if (counts.draft > 0) parts.push(`${counts.draft} draft`);
    return parts.length > 0 ? parts.join(", ") : "No objects";
  };

  return (
    <div className="dashboard-section">
      <h2>At a Glance</h2>
      <div className="stats-grid">
        {/* Cards for each object kind */}
        {objectKinds &&
          objectKinds.map((kind) => {
            const counts = objectsByKind[kind.type_name] || {
              published: 0,
              pending: 0,
              draft: 0,
            };
            const total = counts.published + counts.pending + counts.draft;

            return (
              <StatCard
                key={kind.kind_id}
                title={kind.label}
                value={total}
                subtitle={getStatusSubtitle(counts)}
                loading={loading}
                href={`edit.php?post_type=${kind.type_name}`}
              />
            );
          })}

        {/* Collections Card */}
        <StatCard
          title="Collections"
          value={totalCollections}
          loading={loading}
          href="edit.php?post_type=wpm_collection"
        />

        {/* Remote Clients Card */}
        <StatCard
          title="Remote Clients"
          value={activeClients}
          subtitle={
            remoteClients && remoteClients.length > 0
              ? `${remoteClients.filter((c) => c.blocked).length} blocked`
              : "None registered"
          }
          loading={loading}
          href="admin.php?page=museum_remote"
        />
      </div>
    </div>
  );
};

/**
 * Recent Activity Feed Component
 */
const RecentActivity = () => {
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        // Fetch recent objects and collections
        const [recentObjects, recentCollections] = await Promise.all([
          apiFetch({
            path: `${wordPressRestBase}/posts?per_page=5&orderby=modified&order=desc&_embed`,
          }).catch(() => []),
          apiFetch({
            path: `${baseRestPath}/collections?per_page=5&orderby=modified&order=desc`,
          }).catch(() => []),
        ]);

        // Combine and sort by modified date
        const combined = [
          ...(recentObjects || []).map((item) => ({
            ...item,
            type: "object",
            modified: item.modified,
          })),
          ...(recentCollections || []).map((item) => ({
            ...item,
            type: "collection",
            modified: item.post_modified,
          })),
        ];

        combined.sort((a, b) => new Date(b.modified) - new Date(a.modified));

        setRecentItems(combined.slice(0, 10));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching recent activity:", error);
        setLoading(false);
      }
    };

    fetchRecentActivity();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getEditUrl = (item) => {
    if (item.type === "collection") {
      return `post.php?post=${item.ID}&action=edit`;
    } else {
      return `post.php?post=${item.id}&action=edit`;
    }
  };

  const getTitle = (item) => {
    if (item.type === "collection") {
      return item.post_title;
    } else {
      return item.title?.rendered || item.title;
    }
  };

  return (
    <div className="dashboard-section">
      <h2>Recent Activity</h2>
      {loading ? (
        <div className="loading-container">
          <Spinner />
        </div>
      ) : recentItems.length === 0 ? (
        <p className="empty-message">No recent activity</p>
      ) : (
        <div className="activity-feed">
          {recentItems.map((item, index) => (
            <div key={index} className="activity-item">
              <div className="activity-type-badge">
                {item.type === "collection" ? "Collection" : "Object"}
              </div>
              <div className="activity-content">
                <a href={getEditUrl(item)} className="activity-title">
                  {getTitle(item)}
                </a>
                <div className="activity-meta">
                  Modified {formatDate(item.modified)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Pending Objects Component
 */
const PendingObjects = () => {
  const [pendingObjects, setPendingObjects] = useState([]);
  const [objectKinds, setObjectKinds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendingObjects = async () => {
      try {
        // First, fetch all object kinds
        const kinds = await apiFetch({
          path: `${baseRestPath}/mobject_kinds`,
        });
        setObjectKinds(kinds);

        // Fetch pending objects for each kind
        const allPendingObjects = [];
        for (const kind of kinds) {
          try {
            const objects = await apiFetch({
              path: `${wordPressRestBase}/${kind.type_name}?status=pending&per_page=100`,
            });
            if (objects && objects.length > 0) {
              allPendingObjects.push(
                ...objects.map((obj) => ({
                  ...obj,
                  kind_label: kind.label,
                  kind_name: kind.type_name,
                })),
              );
            }
          } catch (error) {
            console.error(
              `Error fetching pending objects for ${kind.type_name}:`,
              error,
            );
          }
        }

        // Sort by modified date (most recent first)
        allPendingObjects.sort(
          (a, b) => new Date(b.modified) - new Date(a.modified),
        );

        setPendingObjects(allPendingObjects);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching pending objects:", error);
        setLoading(false);
      }
    };

    fetchPendingObjects();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="dashboard-section">
      <h2>Pending Review</h2>
      {loading ? (
        <div className="loading-container">
          <Spinner />
        </div>
      ) : pendingObjects.length === 0 ? (
        <p className="empty-message">No objects pending review</p>
      ) : (
        <div className="pending-objects-list">
          {pendingObjects.map((object) => (
            <div key={object.id} className="pending-object-item">
              <div className="pending-object-type-badge">
                {object.kind_label}
              </div>
              <div className="pending-object-content">
                <a
                  href={`post.php?post=${object.id}&action=edit`}
                  className="pending-object-title"
                >
                  {object.title?.rendered || "Untitled"}
                </a>
                <div className="pending-object-meta">
                  Last modified {formatDate(object.modified)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * System Status Component
 */
const SystemStatus = () => {
  const pluginVersion = window.wpmAdminData?.pluginVersion || "Unknown";
  const wpVersion = window.wpmAdminData?.wpVersion || "Unknown";
  const phpVersion = window.wpmAdminData?.phpVersion || "Unknown";
  const phpMemoryLimit = window.wpmAdminData?.phpMemoryLimit || "Unknown";

  return (
    <div className="dashboard-section">
      <h2>System Information</h2>
      <div className="system-status">
        <div className="status-item">
          <span className="status-label">Plugin Version:</span>
          <span className="status-value">{pluginVersion}</span>
        </div>
        <div className="status-item">
          <span className="status-label">WordPress Version:</span>
          <span className="status-value">{wpVersion}</span>
        </div>
        <div className="status-item">
          <span className="status-label">PHP Version:</span>
          <span className="status-value">{phpVersion}</span>
        </div>
        <div className="status-item">
          <span className="status-label">PHP Memory Limit:</span>
          <span className="status-value">{phpMemoryLimit}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Database Tables:</span>
          <span className="status-value status-success">Active</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Placeholder Component
 */
const PlaceholderSection = ({ title, description }) => {
  return (
    <div className="dashboard-section placeholder-section">
      <h2>{title}</h2>
      <div className="placeholder-content">
        <p className="placeholder-message">Coming Soon</p>
        {description && (
          <p className="placeholder-description">{description}</p>
        )}
      </div>
    </div>
  );
};

/**
 * Main Dashboard Component
 */
const Dashboard = (props) => {
  return (
    <div className="museum-admin-dashboard">
      <div className="admin-header">
        <h1>Museum Dashboard</h1>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-main-column">
          <StatisticsPanel />
          <RecentActivity />
          <PendingObjects />
        </div>

        <div className="dashboard-side-column">
          <PlaceholderSection
            title="Quick Actions"
            description="Quick links to common tasks will appear here."
          />
          <SystemStatus />
          <PlaceholderSection
            title="Warnings & Notifications"
            description="System checks and validation warnings will appear here."
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
