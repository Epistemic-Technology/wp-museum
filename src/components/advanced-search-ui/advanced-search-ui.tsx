import { useState, useEffect, useRef } from "@wordpress/element";

import { Button, CheckboxControl, SelectControl } from "@wordpress/components";

import apiFetch from "@wordpress/api-fetch";

import { isEmpty, wordPressRestBase } from "../../javascript/util";

import type {
  Collection,
  MObjectField,
  ObjectFieldsResponse,
  ObjectKind,
} from "../../types";

/** One entry of the `searchFields` array of the advanced-search values. */
interface SearchFieldEntry {
  field?: string | null;
  search?: string | null;
}

/**
 * Search values managed by AdvancedSearchUI.
 *
 * `selectedKind` is a number when seeded from kindsData or parsed from the
 * URL, but a string once the user picks a kind in the SelectControl (see the
 * TODO(ts-migration) note on the kind lookup below).
 */
interface AdvancedSearchValues {
  searchText?: string;
  onlyTitle?: boolean;
  selectedFlags?: string[];
  selectedCollections?: string[];
  selectedTags?: string[];
  selectedKind?: number | string;
  searchFields?: SearchFieldEntry[];
}

/**
 * Minimal shape of a WP core tag term from `/wp/v2/tags` (not part of the
 * wp-museum/v1 types in src/types).
 */
interface WPRestTag {
  count: number;
  name: string;
  slug: string;
}

interface FieldSearchElementProps {
  fieldData?: ObjectFieldsResponse;
  searchFieldData: SearchFieldEntry;
  updateSearch: (
    field: string | null | undefined,
    search: string | null | undefined,
  ) => void;
}

const FieldSearchElement = (props: FieldSearchElementProps) => {
  const { fieldData, searchFieldData, updateSearch } = props;

  const { field, search } = searchFieldData;

  const fieldDataArray =
    typeof fieldData === "undefined" ? [] : Object.values(fieldData);

  let selectedFieldData: Partial<MObjectField> =
    fieldDataArray.length > 0 && typeof field !== "undefined"
      ? fieldDataArray.find((fieldItem) => fieldItem.slug === field) || {}
      : {};

  if (isEmpty(selectedFieldData) && fieldDataArray.length > 0) {
    selectedFieldData = fieldDataArray[0];
  }

  const { type = "plain", slug = "" } = selectedFieldData;

  const fieldOptions =
    fieldDataArray.length > 0
      ? fieldDataArray
          .filter(
            (fieldItem) =>
              fieldItem.type !== "flag" && fieldItem.type !== "links",
          )
          .map((fieldItem) => {
            return { label: fieldItem.name, value: fieldItem.slug };
          })
      : [];

  let inputElement;
  if (type === "date") {
    let searchVals;

    try {
      // TODO(strict): search may be null/undefined at runtime; JSON.parse
      // failures are caught below, so the cast preserves existing behavior.
      searchVals = JSON.parse(search as string);
    } catch {
      searchVals = {};
    }

    const { fromDate, toDate } = searchVals;

    const updateDateSearch = (updateObj: { from?: string; to?: string }) => {
      const newDateSearch = { ...searchVals, ...updateObj };

      updateSearch(field, JSON.stringify(newDateSearch));
    };

    inputElement = (
      <>
        <label>
          From:
          <input
            type="date"
            value={fromDate || ""}
            onChange={(event) => updateDateSearch({ from: event.target.value })}
          />
        </label>
        <label>
          To:
          <input
            type="date"
            value={toDate || ""}
            onChange={(event) => updateDateSearch({ to: event.target.value })}
          />
        </label>
      </>
    );
  } else {
    inputElement = (
      <input
        type="text"
        className="field-search-input"
        value={search || ""}
        onChange={(event) => updateSearch(field, event.target.value)}
      />
    );
  }

  return (
    <div className="field-search-element">
      <SelectControl
        value={slug}
        onChange={(val) => updateSearch(val, search)}
        options={fieldOptions}
      />
      {inputElement}
    </div>
  );
};

interface AdvancedSearchUIProps {
  defaultSearch?: string;
  showFlags?: boolean;
  showCollections?: boolean;
  showTags?: boolean;
  showFields?: boolean;
  showObjectType?: boolean;
  showTitleToggle?: boolean;
  getFieldData: (typeName: string) => Promise<ObjectFieldsResponse>;
  kindsData: ObjectKind[];
  collectionData: Collection[];
  onSearch: (values: AdvancedSearchValues) => void;
  inEditor?: boolean;
  setAttributes?: (attributes: { defaultSearch: string }) => void;
  fixSearch?: boolean;
}

const AdvancedSearchUI = (props: AdvancedSearchUIProps) => {
  const {
    defaultSearch,
    showFlags,
    showCollections,
    showTags,
    showFields,
    showObjectType,
    showTitleToggle,
    getFieldData,
    kindsData,
    collectionData,
    onSearch,
    inEditor,
    setAttributes,
    fixSearch,
  } = props;

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchValues, setSearchValues] = useState<AdvancedSearchValues>({});
  const [fieldData, setFieldData] = useState<ObjectFieldsResponse>({});
  const [numberFieldSearches, setNumberFieldSearches] = useState(3);
  const [tagsData, setTagsData] = useState<WPRestTag[]>([]);

  const {
    searchText,
    onlyTitle,
    selectedFlags,
    selectedCollections,
    selectedTags,
    selectedKind,
    searchFields,
  } = searchValues;

  // Function to serialize search values to URL parameters
  const serializeSearchToUrl = (values: AdvancedSearchValues) => {
    const params = new URLSearchParams();

    if (values.searchText) params.set("search", values.searchText);
    if (values.onlyTitle) params.set("titleOnly", "true");
    if (values.selectedKind) params.set("kind", values.selectedKind as string);
    if (values.selectedFlags?.length)
      params.set("flags", values.selectedFlags.join(","));
    if (values.selectedCollections?.length)
      params.set("collections", values.selectedCollections.join(","));
    if (values.searchFields?.length) {
      params.set("fields", JSON.stringify(values.searchFields));
    }
    if (values.selectedTags?.length) {
      params.set("tags", values.selectedTags.join(","));
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, "", newUrl);
  };

  // Function to deserialize URL parameters to search values
  const deserializeUrlToSearch = () => {
    const params = new URLSearchParams(window.location.search);
    const values: AdvancedSearchValues = {};

    if (params.has("search")) values.searchText = params.get("search")!;
    if (params.has("titleOnly"))
      values.onlyTitle = params.get("titleOnly") === "true";
    if (params.has("kind")) values.selectedKind = parseInt(params.get("kind")!);
    if (params.has("flags"))
      values.selectedFlags = params.get("flags")!.split(",");
    if (params.has("collections"))
      values.selectedCollections = params.get("collections")!.split(",");
    if (params.has("tags"))
      values.selectedTags = params.get("tags")!.split(",");
    if (params.has("fields")) {
      try {
        values.searchFields = JSON.parse(params.get("fields")!);
      } catch (e) {
        console.error("Failed to parse fields from URL:", e);
      }
    }

    return values;
  };

  useEffect(() => {
    // Fetch tags data ordered by count (frequency)
    const fetchTags = async () => {
      try {
        const tags = await apiFetch<WPRestTag[]>({
          path: `${wordPressRestBase}/tags?orderby=count&order=desc&per_page=100`,
        });
        // Filter out tags with zero count
        const filteredTags = tags.filter((tag) => tag.count > 0);
        setTagsData(filteredTags);
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };

    fetchTags();

    // First try to get values from URL
    const urlValues = deserializeUrlToSearch();

    // If URL has values, use those, otherwise fall back to defaultSearch
    if (Object.keys(urlValues).length > 0) {
      setSearchValues(urlValues);
      // Automatically trigger search when URL parameters are present
      handleSearch(urlValues);
    } else if (defaultSearch) {
      const defaultValues = JSON.parse(defaultSearch);
      setSearchValues(defaultValues);
    }

    // Focus the search input when component mounts
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (
      typeof selectedKind !== "undefined" &&
      !!kindsData &&
      kindsData.length > 0
    ) {
      // TODO(ts-migration): pre-existing bug — selectedKind is a string once
      // the user picks a kind in the SelectControl, while kind_id is a number,
      // so this strict comparison never matches after user selection.
      // Preserved as-is.
      const selectedKindData = kindsData.find(
        (kindItem) => kindItem.kind_id === selectedKind,
      );
      // TODO(strict): possible null at runtime — see TODO(ts-migration) above;
      // find() can return undefined and type_name can be null.
      getFieldData(selectedKindData!.type_name!).then((result) =>
        setFieldData(result),
      );
    }
  }, [selectedKind, kindsData]);

  useEffect(() => {
    if (!selectedKind && !!kindsData && kindsData.length > 0) {
      setSearchValues({
        ...searchValues,
        // NOTE(wp-types): kind_id is typed number | null; preserved as-is.
        selectedKind: kindsData[0].kind_id as number,
      });
    }
  }, [kindsData]);

  const updateSearchValues = (updatedValues: Partial<AdvancedSearchValues>) => {
    setSearchValues({ ...searchValues, ...updatedValues });
  };

  const updateFieldSearch = (
    index: number,
    field: string | null = null,
    search: string | null = null,
  ) => {
    const newSearchFields = !!searchFields ? [...searchFields] : [];
    let fieldValue: string | null | undefined = field;
    let searchValue: string | null | undefined = search;
    if (fieldValue === null) {
      if (
        typeof newSearchFields[index] !== "undefined" &&
        newSearchFields[index].field !== null
      ) {
        fieldValue = newSearchFields[index].field;
      } else {
        fieldValue = Object.values(fieldData)[0].slug;
      }
    }
    if (searchValue === null && typeof newSearchFields[index] !== "undefined") {
      searchValue = newSearchFields[index].search;
    }
    newSearchFields[index] = { field: fieldValue, search: searchValue };
    updateSearchValues({ searchFields: newSearchFields });
  };

  const flagOptions = () => {
    const opts: { value: string; label: string }[] = [];
    let optionIndex = 0;
    Object.entries(fieldData).forEach(([index, field]) => {
      if (field.type === "flag") {
        opts[optionIndex] = { value: field.slug, label: field.name };
        optionIndex++;
      }
    });
    return opts;
  };

  const collectionOptions = () => {
    const opts: { value: number; label: string }[] = [];
    Object.entries(collectionData).forEach(([index, collection]) => {
      opts[index as unknown as number] = {
        value: collection.ID,
        label: collection.post_title,
      };
    });
    return opts;
  };

  const tagOptions = () => {
    return tagsData.map((tag) => ({
      value: tag.slug,
      label: tag.name,
    }));
  };

  const kindOptions = () => {
    const opts: { value: number | null; label: string | null }[] = [];
    kindsData.forEach((kindItem, index) => {
      opts[index] = { value: kindItem.kind_id, label: kindItem.label };
    });
    return opts;
  };

  let searchFieldElements = [];
  for (let index = 0; index < numberFieldSearches; index++) {
    searchFieldElements[index] = (
      <FieldSearchElement
        key={index}
        fieldData={fieldData}
        searchFieldData={
          !!searchFields && !!searchFields[index] ? searchFields[index] : {}
        }
        updateSearch={(field, search) =>
          updateFieldSearch(index, field, search)
        }
      />
    );
  }

  const handleSearch = (values: AdvancedSearchValues) => {
    // Serialize search values to URL
    serializeSearchToUrl(values);
    // Call the original onSearch handler
    onSearch(values);
  };

  return (
    <>
      {inEditor && (
        <div className="advanced-search-editor-buttons">
          <Button
            isSecondary
            onClick={() => {
              setSearchValues({});
              // Clear URL parameters when resetting search
              window.history.pushState({}, "", window.location.pathname);
            }}
          >
            Reset Search
          </Button>
          <Button
            isSecondary
            onClick={() =>
              // TODO(strict): possible undefined at runtime if inEditor is set
              // without setAttributes; preserved as-is.
              setAttributes!({ defaultSearch: JSON.stringify(searchValues) })
            }
          >
            Set Defaults
          </Button>
        </div>
      )}
      <div
        className={
          "advanced-search-form-wrapper" +
          (fixSearch ? " search-hidden" : " search-visible")
        }
      >
        {(inEditor || showObjectType) && (
          <div
            className={
              "advanced-search-object-type" +
              (showObjectType ? " search-visible" : " search-hidden")
            }
          >
            {/* NOTE(wp-types): SelectControl's types want string
              value/option values, but kind_id values are numbers at runtime;
              cast to keep the existing behavior. */}
            <SelectControl
              className="advanced-search-object-type-select"
              label="Object Type"
              value={selectedKind as string}
              onChange={(val) => updateSearchValues({ selectedKind: val })}
              options={
                kindOptions() as unknown as { value: string; label: string }[]
              }
            />
          </div>
        )}
        <div className="advanced-search-main-input">
          <input
            ref={searchInputRef}
            type="text"
            value={searchText || ""}
            onChange={(event) =>
              updateSearchValues({ searchText: event.target.value })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch(searchValues);
              }
            }}
          />
          <Button
            isPrimary
            className="advanced-search-search-button"
            onClick={() => handleSearch(searchValues)}
          >
            Search
          </Button>
        </div>
        <div className="advanced-search-toggles">
          {(inEditor || showTitleToggle) && (
            <CheckboxControl
              className={
                "advanced-search-title-toggle-checkbox" +
                (showTitleToggle ? " search-visible" : " search-hidden")
              }
              label="Only search titles"
              checked={!!onlyTitle}
              onChange={(val) => updateSearchValues({ onlyTitle: val })}
            />
          )}
        </div>
        <div className="advanced-search-select-controls">
          {(inEditor || showFlags) && (
            <SelectControl
              className={
                "advanced-search-flags-select" +
                (showFlags ? " search-visible" : " search-hidden")
              }
              multiple
              label="Flags"
              value={selectedFlags ? selectedFlags : []}
              onChange={(val) => updateSearchValues({ selectedFlags: val })}
              options={flagOptions()}
            />
          )}
          {(inEditor || showCollections) && (
            // NOTE(wp-types): SelectControl's types want string option
            // values, but collection IDs are numbers at runtime; cast to keep
            // the existing behavior.
            <SelectControl
              className={
                "advanced-search-collections-select" +
                (showCollections ? " search-visible" : " search-hidden")
              }
              multiple
              label="Within Collections"
              value={selectedCollections ? selectedCollections : []}
              onChange={(val) =>
                updateSearchValues({ selectedCollections: val })
              }
              options={
                collectionOptions() as unknown as {
                  value: string;
                  label: string;
                }[]
              }
            />
          )}
          {(inEditor || showTags) && (
            <SelectControl
              className={
                "advanced-search-tags-select" +
                (showTags ? " search-visible" : " search-hidden")
              }
              multiple
              label="Tags"
              value={selectedTags ? selectedTags : []}
              onChange={(val) => updateSearchValues({ selectedTags: val })}
              options={tagOptions()}
            />
          )}
        </div>
        {(inEditor || showFields) && (
          <div
            className={
              "advanced-search-fields" +
              (showFields ? " search-visible" : " search-hidden")
            }
          >
            <div className="components-base-control">
              <label className="components-base-control__label">
                Search in fields
              </label>
            </div>
            {searchFieldElements}
          </div>
        )}
      </div>
      <Button
        isPrimary
        className="advanced-search-button"
        onClick={() => {
          const resetValues = {};
          setSearchValues(resetValues);
          serializeSearchToUrl(resetValues);
        }}
      >
        Reset Search
      </Button>
    </>
  );
};

export default AdvancedSearchUI;
