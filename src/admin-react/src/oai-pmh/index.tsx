import React, { useState, useEffect } from "@wordpress/element";
import apiFetch from "@wordpress/api-fetch";

import { baseRestPath } from "../../../javascript/util";
import type {
  ObjectKind,
  OaiPmhMappings,
  OaiPmhFieldMapping,
  OaiPmhAvailableField,
  ObjectFieldsResponse,
} from "../../../types";

interface DublinCoreField {
  id: string;
  label: string;
  description: string;
}

const DUBLIN_CORE_FIELDS: DublinCoreField[] = [
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

interface DublinCoreFieldMappingProps {
  dcField: DublinCoreField;
  kindFields: OaiPmhAvailableField[];
  mapping: OaiPmhFieldMapping | undefined;
  onMappingChange: (dcFieldId: string, mapping: OaiPmhFieldMapping) => void;
  identifierPrefix: string;
  onIdentifierPrefixChange: (prefix: string) => void;
}

const DublinCoreFieldMapping = ({
  dcField,
  kindFields,
  mapping,
  onMappingChange,
  identifierPrefix,
  onIdentifierPrefixChange,
}: DublinCoreFieldMappingProps) => {
  const handleFieldChange = (field: string) => {
    onMappingChange(dcField.id, {
      field,
      staticValue: "",
    });
  };

  const handleStaticValueChange = (value: string) => {
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

interface KindSelectorProps {
  kinds: ObjectKind[];
  selectedKind: string;
  onKindChange: (kindId: string) => void;
}

const KindSelector = ({ kinds, selectedKind, onKindChange }: KindSelectorProps) => {
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
          <option key={kind.kind_id} value={kind.kind_id as number}>
            {kind.label || kind.name}
          </option>
        ))}
      </select>
    </div>
  );
};

const OmiPmhAdmin = () => {
  const [kinds, setKinds] = useState<ObjectKind[]>([]);
  const [selectedKind, setSelectedKind] = useState<string>("");
  const [kindFields, setKindFields] = useState<OaiPmhAvailableField[]>([]);
  const [dcMappings, setDcMappings] = useState<
    Record<string, OaiPmhFieldMapping>
  >({});
  const [identifierPrefix, setIdentifierPrefix] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

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
        const kindsData = await apiFetch<ObjectKind[]>({
          path: `${baseRestPath}/mobject_kinds/`,
        });
        setKinds(kindsData);

        // Auto-select the first kind if available
        if (kindsData && kindsData.length > 0) {
          // TODO(strict): possible null at runtime if kind_id is unset
          setSelectedKind(kindsData[0].kind_id!.toString());
        }
      } catch (err) {
        setError("Failed to load kinds: " + (err as Error).message);
      }
    };

    fetchKinds();
  }, []);

  // Function to get default identifier prefix
  const getDefaultIdentifierPrefix = (): string => {
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
          // TODO(strict): possible null at runtime if kind_id is unset
          const kind = kinds.find(
            (k) => k.kind_id!.toString() === selectedKind,
          );
          if (!kind) {
            throw new Error("Selected kind not found");
          }

          // Use available_fields_for_oai_pmh from kind data
          if (kind.available_fields_for_oai_pmh) {
            setKindFields(kind.available_fields_for_oai_pmh);
          } else {
            // Fallback to fetching fields separately if not available
            const fieldsData = await apiFetch<ObjectFieldsResponse>({
              path: `${baseRestPath}/${kind.type_name}/fields`,
            });

            // Convert fields object to array format expected by component
            const fieldsArray = Object.values(fieldsData).map((field) => ({
              id: field.field_id,
              slug: field.slug,
              name: field.name,
              type: "kind_field",
            }));
            // TODO(ts-migration): this fallback puts the numeric field_id
            // into `id`, whereas OaiPmhAvailableField.id is a string on the
            // wire; it is only used as a React key, so behavior is preserved
            // via assertion.
            setKindFields(fieldsArray as unknown as OaiPmhAvailableField[]);
          }

          // Extract Dublin Core mappings from kind data
          if (kind.oai_pmh_mappings) {
            // TODO(ts-migration): kind.oai_pmh_mappings also carries
            // identifier_prefix (a string) alongside the per-field mapping
            // objects; it is stored in dcMappings state as-is and later
            // overwritten on save. Assertion preserves current behavior.
            setDcMappings(
              kind.oai_pmh_mappings as unknown as Record<
                string,
                OaiPmhFieldMapping
              >,
            );
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
          setError("Failed to load kind data: " + (err as Error).message);
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

  const handleMappingChange = (
    dcFieldId: string,
    mapping: OaiPmhFieldMapping,
  ) => {
    setDcMappings((prev) => ({
      ...prev,
      [dcFieldId]: mapping,
    }));
  };

  const handleIdentifierPrefixChange = (prefix: string) => {
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
      // TODO(strict): possible null at runtime if kind_id is unset
      const kind = kinds.find((k) => k.kind_id!.toString() === selectedKind);
      if (!kind) {
        throw new Error("Selected kind not found");
      }

      // Prepare the updated kind data with new DC mappings
      const updatedKind = {
        ...kind,
        oai_pmh_mappings: {
          ...dcMappings,
          identifier_prefix: identifierPrefix,
        } as OaiPmhMappings,
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
          // TODO(strict): possible null at runtime if kind_id is unset
          k.kind_id!.toString() === selectedKind
            ? {
                ...k,
                oai_pmh_mappings: {
                  ...dcMappings,
                  identifier_prefix: identifierPrefix,
                } as OaiPmhMappings,
              }
            : k,
        ),
      );

      setSuccessMessage("Dublin Core mappings saved successfully!");
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError("Failed to save mappings: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (Object.keys(dcMappings).length > 0 || identifierPrefix) {
      if (
        // TODO: Replace with accessible modal dialog for better accessibility
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
                {saving ? "Saving..." : "Save Settings"}
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
    </div>
  );
};

export default OmiPmhAdmin;
