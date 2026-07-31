import apiFetch from "@wordpress/api-fetch";
import { useState, useEffect, useCallback, useRef } from "@wordpress/element";
import { Button } from "@wordpress/components";
import type { ChangeEvent } from "react";

import Edit from "./edit";
import {
  getCurrentView,
  getParam,
  navigateTo,
  navigateToMain,
  useRouter,
} from "../router";
import type { ObjectKind } from "../../../types";

/**
 * The kind shape managed client-side by this admin screen: a wire
 * `ObjectKind` whose server-computed properties (`oai_pmh_mappings`,
 * `available_fields_for_oai_pmh`, `children`) may be absent on locally
 * created kinds, plus the client-side `delete` flag sent back to the
 * kinds endpoint.
 */
type AdminKind = Omit<
  ObjectKind,
  "oai_pmh_mappings" | "available_fields_for_oai_pmh" | "children"
> &
  Partial<
    Pick<
      ObjectKind,
      "oai_pmh_mappings" | "available_fields_for_oai_pmh" | "children"
    >
  > & {
    delete?: boolean;
  };

const ObjectAdminControl = () => {
  const [selectedPage, setSelectedPage] = useState<string>(getCurrentView());
  const [kindItem, setKindItem] = useState<AdminKind | null>(null);
  const [newKindCount, updateNewKindCount] = useState(1);
  const [navigateToNewKind, setNavigateToNewKind] = useState(false);
  const [existingKindIds, setExistingKindIds] = useState<Set<number>>(
    new Set(),
  );

  const baseRestPath = "/wp-museum/v1";
  const [objectKinds, updateObjectKinds] = useState<AdminKind[] | null>(null);
  const [kindIds, setKindIds] = useState<string | null>(null);

  // Define functions with proper dependency management
  const refreshKindData = useCallback(() => {
    apiFetch<AdminKind[]>({ path: `${baseRestPath}/mobject_kinds` }).then(
      (result) => {
        updateObjectKinds(result);
      },
    );
  }, []);

  const saveKindData = useCallback(() => {
    if (!objectKinds) return;
    return apiFetch({
      path: `${baseRestPath}/mobject_kinds`,
      method: "POST",
      data: objectKinds,
    })
      .then(() => {
        refreshKindData();
      })
      .catch((err) => {
        // Surface the server error (e.g., 409 when a kind still has posts)
        // and re-sync from the server so local state matches reality.
        alert(err?.message || "Failed to save object kinds.");
        refreshKindData();
      });
  }, [objectKinds, refreshKindData]);

  useEffect(() => {
    if (!objectKinds) {
      refreshKindData();
    }
  }, [objectKinds, refreshKindData]);

  // Handle navigation to newly created kind
  useEffect(() => {
    if (navigateToNewKind && objectKinds) {
      // Find the kind that wasn't in the original set
      const newKind = objectKinds.find(
        (kind) => kind.kind_id! > 0 && !existingKindIds.has(kind.kind_id!),
      );
      if (newKind) {
        editKind(newKind);
        setNavigateToNewKind(false);
        setExistingKindIds(new Set());
      }
    }
  }, [navigateToNewKind, objectKinds, existingKindIds]);

  // Update kindItem when objectKinds changes
  useEffect(() => {
    if (!kindItem || !objectKinds) return;
    const kindItemIndex = objectKinds.findIndex(
      (item) => item.kind_id == kindItem.kind_id,
    );
    if (kindItemIndex === -1) {
      setKindItem(null);
    } else {
      setKindItem(objectKinds[kindItemIndex]);
    }
  }, [objectKinds, kindItem]);

  // Auto-save when kind structure changes
  useEffect(() => {
    const currentIds = objectKinds
      ? JSON.stringify(objectKinds.map((kindItem) => kindItem.kind_id))
      : null;
    if (kindIds && kindIds !== currentIds && objectKinds) {
      saveKindData();
    }
    setKindIds(currentIds);
  }, [objectKinds, kindIds, saveKindData]);

  // Set up router
  useEffect(() => {
    const cleanup = useRouter((params) => {
      const newView = params.view || "main";
      setSelectedPage(newView);

      if (newView === "edit" && params.kind_id && objectKinds) {
        const kindId = parseInt(params.kind_id);
        const foundKind = objectKinds.find((kind) => kind.kind_id === kindId);
        if (foundKind) {
          setKindItem(foundKind);
        }
      } else if (newView === "main") {
        setKindItem(null);
      }
    });

    return cleanup;
  }, [objectKinds]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key to go back to main view
      if (event.key === "Escape" && selectedPage === "edit") {
        event.preventDefault();
        navigateToMain();
      }

      // Ctrl/Cmd + S to save (when in edit mode)
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "s" &&
        selectedPage === "edit"
      ) {
        event.preventDefault();
        if (kindItem) {
          saveKindData();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedPage, kindItem, saveKindData]);

  // Handle initial load
  useEffect(() => {
    if (selectedPage === "edit" && objectKinds) {
      // NOTE(wp-types): getParam may return null; parseInt(null) yields NaN,
      // which the truthiness check below already handles.
      const kindId = parseInt(getParam("kind_id") as string);
      if (kindId) {
        const foundKind = objectKinds.find((kind) => kind.kind_id === kindId);
        if (foundKind) {
          setKindItem(foundKind);
        }
      }
    }
  }, [objectKinds]);

  const updateKind = (
    kindId: number | null,
    field: string,
    event: { target: { type: string; value: any; checked: any } },
  ) => {
    // TODO(strict): possible null at runtime if called before kinds load
    const kinds = objectKinds!;
    const kindIndex = kinds.findIndex(
      (kindItem) => kindItem.kind_id == kindId,
    );
    if (kindIndex === -1) return;

    const newKindArray = kinds.concat([]);
    const currentKind = kinds[kindIndex] as unknown as Record<string, unknown>;
    const updatedKind = newKindArray[kindIndex] as unknown as Record<
      string,
      unknown
    >;
    if (event.target.type === "checkbox") {
      if (currentKind[field] != event.target.checked) {
        updatedKind[field] = event.target.checked;
        setObjectKinds(newKindArray);
      }
      return;
    }

    if (currentKind[field] != event.target.value) {
      updatedKind[field] = event.target.value;
      if (updatedKind[field] == "") {
        updatedKind[field] = null;
      }
      setObjectKinds(newKindArray);
    }
  };

  const importKind = async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      // Extract kind data and fields
      const { fields, ...kindData } = importedData;

      // Reset IDs for the new kind
      kindData.kind_id = 0 - newKindCount;
      kindData.cat_field_id = null;

      // Add the new kind to the list
      // TODO(strict): possible null at runtime if called before kinds load
      const newObjectKinds = objectKinds!.concat([kindData]);
      setObjectKinds(newObjectKinds);

      // Save the kind first
      await saveKindData();

      // After save, the kind will have a real ID
      // We need to refresh and then add fields
      await refreshKindData();

      // Import fields if present
      if (fields && fields.length > 0) {
        // Wait for the new kind to be created
        setTimeout(async () => {
          const updatedKinds = await apiFetch<AdminKind[]>({
            path: `${baseRestPath}/mobject_kinds`,
          });
          const newKind = updatedKinds.find(
            (k) => k.type_name === kindData.type_name,
          );

          if (newKind && fields) {
            // Update field kind_ids to match the new kind
            const updatedFields = fields.map((field: any) => ({
              ...field,
              field_id: null, // Reset field ID
              kind_id: newKind.kind_id,
            }));

            // Save fields
            await apiFetch({
              path: `${baseRestPath}/${newKind.type_name}/fields`,
              method: "POST",
              data: updatedFields,
            });
          }

          // Refresh to show the imported kind
          refreshKindData();
        }, 1000);
      }

      updateNewKindCount(newKindCount + 1);
      return true;
    } catch (error) {
      console.error("Error importing kind:", error);
      alert("Failed to import kind. Please check the file format.");
      return false;
    }
  };

  const defaultKind: AdminKind = {
    kind_id: 0 - newKindCount,
    cat_field_id: null,
    name: null,
    type_name: null,
    label: "New Object Type",
    label_plural: null,
    description: null,
    categorized: false,
    hierarchical: false,
    must_featured_image: false,
    must_gallery: false,
    strict_checking: false,
    exclude_from_search: false,
    parent_kind_id: null,
    cat_id_auto_generate: false,
    cat_id_prefix: "",
    cat_id_pad_length: 0,
  };

  const setObjectKinds = (newKindArray: AdminKind[]) => {
    updateObjectKinds(newKindArray);
  };

  const newKind = () => {
    // Track existing kind IDs before creating new one
    // TODO(strict): possible null at runtime if called before kinds load
    const currentKindIds = new Set(
      objectKinds!
        .filter((kind) => kind.kind_id! > 0)
        .map((kind) => kind.kind_id!),
    );
    setExistingKindIds(currentKindIds);

    const newKind = Object.assign({}, defaultKind);
    const newObjectKinds = objectKinds!.concat([newKind]);
    setObjectKinds(newObjectKinds);
    setNavigateToNewKind(true);
    saveKindData();
  };

  const deleteKind = (kindItem: AdminKind) => {
    // TODO: Replace with accessible modal dialog for better accessibility
    let confirmDelete = confirm(
      "Really delete this kind? Kinds with associated objects cannot be deleted — delete those objects first.",
    );
    if (confirmDelete) {
      // TODO(strict): possible null at runtime if called before kinds load
      const kindIndex = objectKinds!.findIndex(
        (item) => item.kind_id == kindItem.kind_id,
      );
      if (kindIndex !== -1) {
        const newKindArray = objectKinds!.concat([]);
        newKindArray[kindIndex].delete = true;
        setObjectKinds(newKindArray);
        saveKindData();
      }
    }
  };

  const editKind = (newKindItem: AdminKind) => {
    setKindItem(newKindItem);
    navigateTo("edit", { kind_id: newKindItem.kind_id });
    setSelectedPage("edit");
  };

  const exportKind = async (kindItem: AdminKind) => {
    try {
      // Fetch fields data first
      const fieldsData = await apiFetch({
        path: `${baseRestPath}/${kindItem.type_name}/fields`,
      });

      // Create a new object with fields data included
      const kindItemWithFields = {
        ...kindItem,
        fields: fieldsData,
      };

      // Export the enhanced object
      const kindItemJSON = JSON.stringify(kindItemWithFields, null, 2);
      const blob = new Blob([kindItemJSON], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = `${kindItem.label || "object-kind"}.json`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Error exporting kind:", error);
      alert("Failed to export kind. See console for details.");
    }
  };

  switch (selectedPage) {
    case "main":
      return (
        <Main
          objectKinds={objectKinds}
          editKind={editKind}
          newKind={newKind}
          deleteKind={deleteKind}
          exportKind={exportKind}
          importKind={importKind}
        />
      );
    case "edit":
      if (kindItem) {
        // NOTE(wp-types): Edit's props are typed as the wire `ObjectKind`,
        // but locally created kinds (defaultKind / imported kinds) may lack
        // the server-computed properties (oai_pmh_mappings, children, ...)
        // until the next refresh. Cast to preserve current runtime behavior.
        return (
          <Edit
            kinds={objectKinds as ObjectKind[]}
            kindItem={kindItem as ObjectKind}
            updateKind={updateKind}
            saveKindData={saveKindData}
          />
        );
      } else {
        return null;
      }
  }
};

interface MainProps {
  objectKinds: AdminKind[] | null;
  editKind: (kindItem: AdminKind) => void;
  newKind: () => void;
  deleteKind: (kindItem: AdminKind) => void;
  exportKind: (kindItem: AdminKind) => Promise<void>;
  importKind: (file: File) => Promise<boolean>;
}

const Main = (props: MainProps) => {
  const {
    objectKinds,
    editKind,
    newKind,
    deleteKind,
    exportKind,
    importKind,
  } = props;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importKind(file);
      // Reset the input so the same file can be selected again
      event.target.value = "";
    }
  };

  const handleExportCSV = (kindItem: AdminKind) => {
    const nonce = (
      window as Window & {
        wpmAdminData?: { csvExportNonce?: string };
      }
    ).wpmAdminData?.csvExportNonce;
    if (!nonce) {
      console.error("CSV export nonce not available");
      return;
    }

    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set(
      "wpm_ot_csv",
      kindItem.kind_id as unknown as string,
    );
    url.searchParams.set("wpm-objects-admin-nonce", nonce);
    url.searchParams.set("sort_col", "post_title");
    url.searchParams.set("sort_dir", "asc");
    window.location.href = url.toString();
  };

  if (objectKinds) {
    const kindRows = objectKinds
      .filter(
        (kindItem) =>
          typeof kindItem.delete === "undefined" || !kindItem.delete,
      )
      .map((kindItem, index) => (
        <div key={index} className="kind-item">
          <div className="kind-label">{kindItem.label}</div>
          <div className="object-action-buttons">
            <Button
              onClick={() => editKind(kindItem)}
              variant="secondary"
            >
              Edit
            </Button>
            <Button
              variant="secondary"
              onClick={() => deleteKind(kindItem)}
            >
              Delete
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleExportCSV(kindItem)}
            >
              Export CSV
            </Button>
            <Button variant="secondary">
              Import CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => exportKind(kindItem)}
            >
              Export Kind
            </Button>
          </div>
        </div>
      ));

    return (
      <div className="museum-admin-main">
        <div className="admin-header">
          <h1>Museum Administration</h1>
          <p>Manage your museum object types and their fields.</p>
        </div>
        <div className="kinds-list">{kindRows}</div>
        <div className="main-actions">
          <Button onClick={newKind} variant="primary">
            Add New Object Type
          </Button>
          <Button onClick={handleImportClick} variant="secondary">
            Import Object Type
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
        </div>
      </div>
    );
  } else {
    return <div></div>;
  }
};

export { ObjectAdminControl as ObjectPage };
