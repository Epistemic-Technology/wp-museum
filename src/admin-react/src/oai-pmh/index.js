import React, { useState, useEffect } from "@wordpress/element";
import apiFetch from "@wordpress/api-fetch";

import { baseRestPath } from "../util";

const DUBLIN_CORE_FIELDS = [
  { id: "title", label: "Title", description: "A name given to the resource" },
  {
    id: "creator",
    label: "Creator",
    description: "An entity primarily responsible for making the resource",
  },
  { id: "subject", label: "Subject", description: "The topic of the resource" },
  {
    id: "description",
    label: "Description",
    description: "An account of the resource",
  },
  {
    id: "publisher",
    label: "Publisher",
    description: "An entity responsible for making the resource available",
  },
  {
    id: "contributor",
    label: "Contributor",
    description:
      "An entity responsible for making contributions to the resource",
  },
  {
    id: "date",
    label: "Date",
    description:
      "A point or period of time associated with an event in the lifecycle of the resource",
  },
  {
    id: "type",
    label: "Type",
    description: "The nature or genre of the resource",
  },
  {
    id: "format",
    label: "Format",
    description:
      "The file format, physical medium, or dimensions of the resource",
  },
  {
    id: "identifier",
    label: "Identifier",
    description:
      "An unambiguous reference to the resource within a given context",
  },
  {
    id: "source",
    label: "Source",
    description:
      "A related resource from which the described resource is derived",
  },
  {
    id: "language",
    label: "Language",
    description: "A language of the resource",
  },
  { id: "relation", label: "Relation", description: "A related resource" },
  {
    id: "coverage",
    label: "Coverage",
    description: "The spatial or temporal topic of the resource",
  },
  {
    id: "rights",
    label: "Rights",
    description: "Information about rights held in and over the resource",
  },
];

const DublinCoreFieldMapping = ({
  dcField,
  kindFields,
  mapping,
  onMappingChange,
  identifierPrefix,
  onIdentifierPrefixChange,
}) => {
  const handleFieldChange = (field) => {
    onMappingChange(dcField.id, {
      field,
      staticValue: "",
    });
  };

  const handleStaticValueChange = (value) => {
    onMappingChange(dcField.id, {
      field: "",
      staticValue: value,
    });
  };

  return (
    <div className="dc-field-mapping">
      <div className="dc-field-info">
        <label className="dc-field-label">
          <strong>{dcField.label}</strong>
        </label>
        <p className="dc-field-description">{dcField.description}</p>
      </div>

      <div className="mapping-controls">
        <div className="field-dropdown">
          <label htmlFor={`field-${dcField.id}`}>Map to Kind Field:</label>
          <select
            id={`field-${dcField.id}`}
            value={mapping?.field || ""}
            onChange={(e) => handleFieldChange(e.target.value)}
            disabled={(mapping?.staticValue || "").trim() !== ""}
          >
            <option value="">-- Select Field --</option>
            {kindFields.map((field) => (
              <option key={field.id} value={field.slug}>
                {field.name}
              </option>
            ))}
          </select>
        </div>

        <div className="static-value">
          <label htmlFor={`static-${dcField.id}`}>Or Static Value:</label>
          <input
            type="text"
            id={`static-${dcField.id}`}
            value={mapping?.staticValue || ""}
            onChange={(e) => handleStaticValueChange(e.target.value)}
            placeholder="Enter static value..."
          />
        </div>
      </div>

      {dcField.id === "identifier" && (
        <div className="identifier-prefix">
          <label htmlFor="identifier-prefix">Identifier Prefix:</label>
          <input
            type="text"
            id="identifier-prefix"
            value={identifierPrefix || ""}
            onChange={(e) => onIdentifierPrefixChange(e.target.value)}
            placeholder="Enter prefix to prepend to identifiers..."
          />
          <p className="prefix-description">
            This prefix will be prepended to all identifiers (e.g., "library:" →
            "library:12345")
          </p>
        </div>
      )}
    </div>
  );
};

const KindSelector = ({ kinds, selectedKind, onKindChange }) => {
  return (
    <div className="kind-selector">
      <label htmlFor="kind-select">Select Museum Kind:</label>
      <select
        id="kind-select"
        value={selectedKind}
        onChange={(e) => onKindChange(e.target.value)}
      >
        <option value="">-- Select Kind --</option>
        {kinds.map((kind) => (
          <option key={kind.kind_id} value={kind.kind_id}>
            {kind.label || kind.name}
          </option>
        ))}
      </select>
    </div>
  );
};

const OmiPmhAdmin = () => {
  const [kinds, setKinds] = useState([]);
  const [selectedKind, setSelectedKind] = useState("");
  const [kindFields, setKindFields] = useState([]);
  const [dcMappings, setDcMappings] = useState({});
  const [identifierPrefix, setIdentifierPrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Calculate mapping statistics
  const mappingStats = {
    total: DUBLIN_CORE_FIELDS.length,
    configured: Object.values(dcMappings).filter(
      (mapping) => mapping?.field || mapping?.staticValue,
    ).length,
  };

  // Load kinds data from API
  useEffect(() => {
    const fetchKinds = async () => {
      try {
        const kindsData = await apiFetch({
          path: `${baseRestPath}/mobject_kinds/`,
        });
        setKinds(kindsData);

        // Auto-select the first kind if available
        if (kindsData && kindsData.length > 0) {
          setSelectedKind(kindsData[0].kind_id.toString());
        }
      } catch (err) {
        setError("Failed to load kinds: " + err.message);
      }
    };

    fetchKinds();
  }, []);

  // Function to get default identifier prefix
  const getDefaultIdentifierPrefix = () => {
    try {
      const siteUrl = window.location.origin;
      const parsedUrl = new URL(siteUrl);
      let domain = parsedUrl.hostname;

      // Remove www. prefix if present
      if (domain.startsWith("www.")) {
        domain = domain.substring(4);
      }

      // Replace dots with hyphens and ensure it's URL-safe
      const prefix = domain
        .replace(/\./g, "-")
        .replace(/[^a-zA-Z0-9\-]/g, "")
        .replace(/^-+|-+$/g, "");

      return prefix + ":";
    } catch (err) {
      return "site:";
    }
  };

  // Load kind fields and DC mappings when kind is selected
  useEffect(() => {
    if (selectedKind) {
      setLoading(true);
      setError("");

      const fetchKindData = async () => {
        try {
          // Find the selected kind object
          const kind = kinds.find((k) => k.kind_id.toString() === selectedKind);
          if (!kind) {
            throw new Error("Selected kind not found");
          }

          // Use available_fields_for_oai_pmh from kind data
          if (kind.available_fields_for_oai_pmh) {
            setKindFields(kind.available_fields_for_oai_pmh);
          } else {
            // Fallback to fetching fields separately if not available
            const fieldsData = await apiFetch({
              path: `${baseRestPath}/${kind.type_name}/fields`,
            });

            // Convert fields object to array format expected by component
            const fieldsArray = Object.values(fieldsData).map((field) => ({
              id: field.field_id,
              slug: field.slug,
              name: field.name,
              type: "kind_field",
            }));
            setKindFields(fieldsArray);
          }

          // Extract Dublin Core mappings from kind data
          if (kind.oai_pmh_mappings) {
            setDcMappings(kind.oai_pmh_mappings);
            setIdentifierPrefix(kind.oai_pmh_mappings.identifier_prefix || "");
          } else {
            // Set default mappings when none exist
            const defaultMappings = {
              title: { field: "wp_post_title", staticValue: "" },
              creator: { field: "wp_post_author", staticValue: "" },
              description: { field: "wp_post_excerpt", staticValue: "" },
              date: { field: "wp_post_date", staticValue: "" },
              source: { field: "wp_post_permalink", staticValue: "" },
              identifier: { field: "wp_post_id", staticValue: "" },
            };
            setDcMappings(defaultMappings);

            // Set default identifier prefix
            const defaultPrefix = getDefaultIdentifierPrefix();
            setIdentifierPrefix(defaultPrefix);
          }
        } catch (err) {
          setError("Failed to load kind data: " + err.message);
          setKindFields([]);
          // Set default mappings when there's an error
          const defaultMappings = {
            title: { field: "wp_post_title", staticValue: "" },
            creator: { field: "wp_post_author", staticValue: "" },
            description: { field: "wp_post_excerpt", staticValue: "" },
            date: { field: "wp_post_date", staticValue: "" },
            source: { field: "wp_post_permalink", staticValue: "" },
            identifier: { field: "wp_post_id", staticValue: "" },
          };
          setDcMappings(defaultMappings);

          // Set default identifier prefix even on error
          const defaultPrefix = getDefaultIdentifierPrefix();
          setIdentifierPrefix(defaultPrefix);
        } finally {
          setLoading(false);
        }
      };

      fetchKindData();
    } else {
      setKindFields([]);
      setDcMappings({});
      setIdentifierPrefix("");
    }
  }, [selectedKind, kinds]);

  const handleMappingChange = (dcFieldId, mapping) => {
    setDcMappings((prev) => ({
      ...prev,
      [dcFieldId]: mapping,
    }));
  };

  const handleIdentifierPrefixChange = (prefix) => {
    setIdentifierPrefix(prefix);
  };

  const handleSave = async () => {
    if (!selectedKind) return;

    // Validate mappings - with defaults, there should always be mappings
    const hasAnyMapping = Object.values(dcMappings).some(
      (mapping) => mapping?.field || mapping?.staticValue,
    );

    if (!hasAnyMapping) {
      setError("No mappings found. Please check your configuration.");
      return;
    }

    // Check for conflicts (both field and static value set)
    const conflicts = Object.entries(dcMappings).filter(
      ([, mapping]) => mapping?.field && mapping?.staticValue,
    );

    if (conflicts.length > 0) {
      const conflictFields = conflicts.map(([field]) => field).join(", ");
      setError(
        `These fields have both field mapping and static value set: ${conflictFields}. Please choose one or the other.`,
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      // Find the selected kind object
      const kind = kinds.find((k) => k.kind_id.toString() === selectedKind);
      if (!kind) {
        throw new Error("Selected kind not found");
      }

      // Prepare the updated kind data with new DC mappings
      const updatedKind = {
        ...kind,
        oai_pmh_mappings: {
          ...dcMappings,
          identifier_prefix: identifierPrefix,
        },
      };

      // Update the kind via the API
      await apiFetch({
        path: `${baseRestPath}/mobject_kinds/`,
        method: "POST",
        data: [updatedKind],
      });

      // Update local kinds state
      setKinds((prevKinds) =>
        prevKinds.map((k) =>
          k.kind_id.toString() === selectedKind
            ? {
                ...k,
                oai_pmh_mappings: {
                  ...dcMappings,
                  identifier_prefix: identifierPrefix,
                },
              }
            : k,
        ),
      );

      setSuccessMessage("Dublin Core mappings saved successfully!");
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError("Failed to save mappings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (Object.keys(dcMappings).length > 0 || identifierPrefix) {
      if (
        confirm(
          "Are you sure you want to reset to default mappings? This action cannot be undone.",
        )
      ) {
        const defaultMappings = {
          title: { field: "wp_post_title", staticValue: "" },
          creator: { field: "wp_post_author", staticValue: "" },
          description: { field: "wp_post_excerpt", staticValue: "" },
          date: { field: "wp_post_date", staticValue: "" },
          source: { field: "wp_post_permalink", staticValue: "" },
          identifier: { field: "wp_post_id", staticValue: "" },
        };
        setDcMappings(defaultMappings);

        // Reset to default identifier prefix
        const defaultPrefix = getDefaultIdentifierPrefix();
        setIdentifierPrefix(defaultPrefix);
        setError("");
        setSuccessMessage("");
      }
    }
  };

  return (
    <div className="oai-pmh-admin">
      <div className="admin-header">
        <h1>OAI-PMH Administration</h1>
        <p>
          Configure Dublin Core metadata mappings for museum object kinds.
          Default mappings are automatically applied for new object kinds to
          provide zero-configuration OAI-PMH support. The identifier field
          defaults to the post ID with a sanitized domain prefix.
        </p>
      </div>

      <div className="config-panel">
        {error && (
          <div className="error-notice">
            <p>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="success-notice">
            <p>{successMessage}</p>
          </div>
        )}

        <KindSelector
          kinds={kinds}
          selectedKind={selectedKind}
          onKindChange={setSelectedKind}
        />

        {selectedKind && (
          <div className="dc-mappings-section">
            <div className="section-header">
              <h2>Dublin Core Metadata Mappings</h2>
              <p>
                Map each Dublin Core field to a kind field or specify a static
                value. Default mappings are automatically applied for essential
                fields: Title → Post Title, Creator → Post Author, Description →
                Post Excerpt, Date → Post Date, Source → Post Permalink,
                Identifier → Post ID.
              </p>
              <div className="mapping-status">
                <span className="mapping-count">
                  {mappingStats.configured} of {mappingStats.total} fields
                  configured
                </span>
                {mappingStats.configured > 0 && (
                  <span className="mapping-progress">
                    (
                    {Math.round(
                      (mappingStats.configured / mappingStats.total) * 100,
                    )}
                    % complete)
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="loading">Loading kind fields...</div>
            ) : (
              <div className="dc-fields-list">
                {DUBLIN_CORE_FIELDS.map((dcField) => (
                  <DublinCoreFieldMapping
                    key={dcField.id}
                    dcField={dcField}
                    kindFields={kindFields}
                    mapping={dcMappings[dcField.id]}
                    onMappingChange={handleMappingChange}
                    identifierPrefix={identifierPrefix}
                    onIdentifierPrefixChange={handleIdentifierPrefixChange}
                  />
                ))}
              </div>
            )}

            <div className="action-buttons">
              <button
                type="button"
                className="button button-primary"
                onClick={handleSave}
                disabled={loading || saving}
              >
                {saving ? "Saving..." : "Save Mappings"}
              </button>
              <button
                type="button"
                className="button"
                onClick={handleReset}
                disabled={loading || saving}
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .oai-pmh-admin {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .admin-header {
          margin-bottom: 30px;
        }

        .admin-header h1 {
          margin-bottom: 10px;
        }

        .admin-header p {
          color: #666;
          font-size: 14px;
        }

        .config-panel {
          background: #fff;
          border: 1px solid #ccd0d4;
          border-radius: 4px;
          padding: 20px;
        }

        .kind-selector {
          margin-bottom: 30px;
        }

        .kind-selector label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .kind-selector select {
          width: 300px;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .error-notice {
          background: #ffebee;
          border: 1px solid #f44336;
          border-radius: 4px;
          padding: 15px;
          margin-bottom: 20px;
        }

        .error-notice p {
          margin: 0;
          color: #c62828;
          font-weight: 500;
        }

        .success-notice {
          background: #e8f5e8;
          border: 1px solid #4caf50;
          border-radius: 4px;
          padding: 15px;
          margin-bottom: 20px;
        }

        .success-notice p {
          margin: 0;
          color: #2e7d32;
          font-weight: 500;
        }

        .dc-mappings-section {
          border-top: 1px solid #eee;
          padding-top: 30px;
        }

        .section-header {
          margin-bottom: 25px;
        }

        .section-header h2 {
          margin-bottom: 8px;
        }

        .section-header p {
          color: #666;
          font-size: 14px;
          margin-bottom: 10px;
        }

        .mapping-status {
          display: flex;
          gap: 10px;
          align-items: center;
          font-size: 13px;
        }

        .mapping-count {
          font-weight: 600;
          color: #333;
        }

        .mapping-progress {
          color: #666;
        }

        .dc-fields-list {
          margin-bottom: 30px;
        }

        .dc-field-mapping {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 20px;
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 15px;
          background: #fbfbfb;
          transition: border-color 0.2s ease;
        }

        .dc-field-mapping:hover {
          border-color: #d0d0d0;
        }

        .dc-field-info {
          padding-right: 20px;
        }

        .dc-field-label {
          display: block;
          margin-bottom: 8px;
          color: #2c3e50;
          font-size: 15px;
        }

        .dc-field-description {
          font-size: 13px;
          color: #666;
          margin: 0;
          line-height: 1.5;
          font-style: italic;
        }

        .mapping-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .field-dropdown label,
        .static-value label {
          display: block;
          font-weight: 600;
          margin-bottom: 6px;
          font-size: 13px;
          color: #34495e;
        }

        .field-dropdown select,
        .static-value input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .field-dropdown select:focus,
        .static-value input:focus {
          outline: none;
          border-color: #0073aa;
          box-shadow: 0 0 0 2px rgba(0, 115, 170, 0.1);
        }

        .field-dropdown select:disabled {
          background-color: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }

        .static-value input:disabled {
          background-color: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }

        .identifier-prefix {
          grid-column: 1 / -1;
          margin-top: 15px;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
        }

        .identifier-prefix label {
          display: block;
          font-weight: 600;
          margin-bottom: 6px;
          font-size: 13px;
          color: #34495e;
        }

        .identifier-prefix input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .identifier-prefix input:focus {
          outline: none;
          border-color: #0073aa;
          box-shadow: 0 0 0 2px rgba(0, 115, 170, 0.1);
        }

        .prefix-description {
          margin: 8px 0 0 0;
          font-size: 12px;
          color: #666;
          font-style: italic;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          padding-top: 25px;
          border-top: 1px solid #e0e0e0;
        }

        .button {
          padding: 12px 24px;
          border: 1px solid #ccc;
          border-radius: 4px;
          background: #f7f7f7;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .button:hover {
          background: #f0f0f0;
          border-color: #999;
        }

        .button-primary {
          background: #0073aa;
          color: white;
          border-color: #0073aa;
        }

        .button-primary:hover {
          background: #005a87;
          border-color: #004a6b;
        }

        .button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .button:disabled:hover {
          background: #f7f7f7;
          border-color: #ccc;
        }

        .button-primary:disabled:hover {
          background: #0073aa;
          border-color: #0073aa;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        @media (max-width: 768px) {
          .dc-field-mapping {
            grid-template-columns: 1fr;
            gap: 15px;
          }

          .mapping-controls {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default OmiPmhAdmin;
