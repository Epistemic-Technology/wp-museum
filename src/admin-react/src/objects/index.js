import apiFetch from "@wordpress/api-fetch";
import { useState, useEffect, useCallback } from "@wordpress/element";
import { Button } from "@wordpress/components";

import Edit from "./edit";
import {
  getCurrentView,
  getParam,
  navigateTo,
  navigateToMain,
  useRouter,
} from "../router";

const ObjectAdminControl = () => {
  const [selectedPage, setSelectedPage] = useState(getCurrentView());
  const [kindItem, setKindItem] = useState(null);
  const [newKindCount, updateNewKindCount] = useState(1);
  const [navigateToNewKind, setNavigateToNewKind] = useState(false);
  const [existingKindIds, setExistingKindIds] = useState(new Set());

  const baseRestPath = "/wp-museum/v1";
  const [objectKinds, updateObjectKinds] = useState(null);
  const [kindIds, setKindIds] = useState(null);

  // Define functions with proper dependency management
  const refreshKindData = useCallback(() => {
    apiFetch({ path: `${baseRestPath}/mobject_kinds` }).then((result) => {
      updateObjectKinds(result);
    });
  }, []);

  const saveKindData = useCallback(() => {
    if (!objectKinds) return;
    return apiFetch({
      path: `${baseRestPath}/mobject_kinds`,
      method: "POST",
      data: objectKinds,
    }).then(() => {
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
        (kind) => kind.kind_id > 0 && !existingKindIds.has(kind.kind_id),
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
    const handleKeyDown = (event) => {
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
      const kindId = parseInt(getParam("kind_id"));
      if (kindId) {
        const foundKind = objectKinds.find((kind) => kind.kind_id === kindId);
        if (foundKind) {
          setKindItem(foundKind);
        }
      }
    }
  }, [objectKinds]);

  const updateKind = (kindId, field, event) => {
    const kindIndex = objectKinds.findIndex(
      (kindItem) => kindItem.kind_id == kindId,
    );
    if (kindIndex === -1) return;

    const newKindArray = objectKinds.concat([]);
    if (event.target.type === "checkbox") {
      if (objectKinds[kindIndex][field] != event.target.checked) {
        newKindArray[kindIndex][field] = event.target.checked;
        setObjectKinds(newKindArray);
      }
      return;
    }

    if (objectKinds[kindIndex][field] != event.target.value) {
      newKindArray[kindIndex][field] = event.target.value;
      if (newKindArray[kindIndex][field] == "") {
        newKindArray[kindIndex][field] = null;
      }
      setObjectKinds(newKindArray);
    }
  };

  const defaultKind = {
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
  };

  const setObjectKinds = (newKindArray) => {
    updateObjectKinds(newKindArray);
  };

  const newKind = () => {
    // Track existing kind IDs before creating new one
    const currentKindIds = new Set(
      objectKinds
        .filter((kind) => kind.kind_id > 0)
        .map((kind) => kind.kind_id),
    );
    setExistingKindIds(currentKindIds);

    const newKind = Object.assign({}, defaultKind);
    const newObjectKinds = objectKinds.concat([newKind]);
    setObjectKinds(newObjectKinds);
    setNavigateToNewKind(true);
    saveKindData();
  };

  const deleteKind = (kindItem) => {
    // TODO: Replace with accessible modal dialog for better accessibility
    let confirmDelete = confirm(
      "Really delete kind? Objects associated with this kind will remain in database but will be inaccessible.",
    );
    if (confirmDelete) {
      const kindIndex = objectKinds.findIndex(
        (item) => item.kind_id == kindItem.kind_id,
      );
      if (kindIndex !== -1) {
        const newKindArray = objectKinds.concat([]);
        newKindArray[kindIndex].delete = true;
        setObjectKinds(newKindArray);
        saveKindData();
      }
    }
  };

  const editKind = (newKindItem) => {
    setKindItem(newKindItem);
    navigateTo("edit", { kind_id: newKindItem.kind_id });
    setSelectedPage("edit");
  };

  const handleKindDoubleClick = (kindItem) => {
    editKind(kindItem);
  };

  const exportKind = async (kindItem) => {
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
          handleKindDoubleClick={handleKindDoubleClick}
        />
      );
    case "edit":
      if (kindItem) {
        return (
          <Edit
            kinds={objectKinds}
            kindItem={kindItem}
            updateKind={updateKind}
            saveKindData={saveKindData}
          />
        );
      } else {
        return null;
      }
  }
};

const Main = (props) => {
  const {
    objectKinds,
    editKind,
    newKind,
    deleteKind,
    exportKind,
    handleKindDoubleClick,
  } = props;

  const handleExportCSV = (kindItem) => {
    const nonce = window.wpmAdminData?.csvExportNonce;
    if (!nonce) {
      console.error('CSV export nonce not available');
      return;
    }
    
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('wpm_ot_csv', kindItem.kind_id);
    url.searchParams.set('wpm-objects-admin-nonce', nonce);
    url.searchParams.set('sort_col', 'post_title');
    url.searchParams.set('sort_dir', 'asc');
    window.location.href = url.toString();
  };

  if (objectKinds) {
    const kindRows = objectKinds
      .filter(
        (kindItem) =>
          typeof kindItem.delete === "undefined" || !kindItem.delete,
      )
      .map((kindItem, index) => (
        <div
          key={index}
          className="kind-item"
          onDoubleClick={() => handleKindDoubleClick(kindItem)}
          title="Double-click to edit"
        >
          <div className="kind-label">{kindItem.label}</div>
          <div className="object-action-buttons">
            <Button onClick={() => editKind(kindItem)} isLarge isSecondary>
              Edit
            </Button>
            <Button isLarge isSecondary onClick={() => deleteKind(kindItem)}>
              Delete
            </Button>
            <Button
              isLarge
              isSecondary
              onClick={() => handleExportCSV(kindItem)}
            >
              Export CSV
            </Button>
            <Button isLarge isSecondary>
              Import CSV
            </Button>
            <Button isLarge isSecondary onClick={() => exportKind(kindItem)}>
              Export Kind
            </Button>
          </div>
        </div>
      ));

    return (
      <div className="museum-admin-main">
        <h1>Museum Administration</h1>
        <div className="help-text">
          <p>
            Manage your museum object types and their fields.{" "}
            <strong>Tip:</strong> Double-click any object type to edit it
            quickly.
          </p>
        </div>
        <div className="kinds-list">{kindRows}</div>
        <div className="main-actions">
          <Button onClick={newKind} isLarge isPrimary>
            Add New Object Type
          </Button>
        </div>
      </div>
    );
  } else {
    return <div></div>;
  }
};

export { ObjectAdminControl as ObjectPage };
