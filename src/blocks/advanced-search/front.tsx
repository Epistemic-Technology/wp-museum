import { useState, useEffect, createRoot } from "@wordpress/element";

import apiFetch from "@wordpress/api-fetch";

import { AdvancedSearchUI, ObjectGrid, withPagination } from "../../components";

import type {
  Collection,
  MuseumObject,
  MuseumObjectSearchParams,
  ObjectFieldsResponse,
  ObjectKind,
} from "../../types";

const PaginatedObjectGrid = withPagination(ObjectGrid);

/** One entry of the `searchFields` array assembled by AdvancedSearchUI. */
interface SearchFieldEntry {
  field?: string | null;
  search?: string | null;
}

/**
 * Search params handled by this block: the values assembled by
 * AdvancedSearchUI plus the pagination/limit keys added here and by
 * withPagination.
 *
 * `Objects_Controller::get_items()` (the /search callback) reads per_page,
 * page, status, s/searchText, onlyTitle, post_title, post_content,
 * tilde-prefixed field slugs, selectedCollections and selectedTags.
 * `selectedFlags` and `searchFields` are not read directly — onSearch below
 * expands them into the field-slug params the server does read.
 *
 * TODO(ts-migration): `selectedKind` is still ignored by the server; /search
 * always queries every kind, and there is no request param for restricting it
 * (the per-kind routes are GET-only). Fixing it needs a server-side change.
 */
interface AdvancedSearchParams {
  page?: number;
  per_page?: number;
  searchText?: string;
  onlyTitle?: boolean;
  selectedFlags?: string[];
  selectedCollections?: string[] | number[];
  selectedTags?: string[];
  selectedKind?: number | string;
  searchFields?: SearchFieldEntry[];
}

interface AdvancedSearchAttributes {
  defaultSearch?: string;
  fixSearch?: boolean;
  runOnLoad?: boolean;
  showObjectType?: boolean;
  showTitleToggle?: boolean;
  showFlags?: boolean;
  showCollections?: boolean;
  showTags?: boolean;
  showFields?: boolean;
  gridRows?: number;
  columns?: number;
  resultsPerPage?: number;
}

interface AdvancedSearchFrontProps {
  attributes: AdvancedSearchAttributes;
}

window.addEventListener("DOMContentLoaded", () => {
  const advancedSearchElements = document.getElementsByClassName(
    "wpm-advanced-search-block-frontend",
  );
  if (!!advancedSearchElements) {
    for (let i = 0; i < advancedSearchElements.length; i++) {
      const advancedSearchElement = advancedSearchElements[i] as HTMLElement;
      const attribuesJSON = advancedSearchElement.dataset.attributes;
      const attributes = JSON.parse(attribuesJSON ? attribuesJSON : "{}");
      if (typeof attributes["defaultSearch"] != "string") {
        attributes["defaultSearch"] = JSON.stringify(
          attributes["defaultSearch"],
        );
      }
      const root = createRoot(advancedSearchElement);
      root.render(<AdvancedSearchFront attributes={attributes} />);
    }
  }
});

const AdvancedSearchFront = (props: AdvancedSearchFrontProps) => {
  const { attributes } = props;

  const {
    defaultSearch,
    fixSearch,
    runOnLoad,
    showObjectType,
    showTitleToggle,
    showFlags,
    showCollections,
    showTags,
    showFields,
    gridRows,
    columns,
    resultsPerPage,
  } = attributes;

  // NOTE(wp-types): the initial state is an empty OBJECT while the
  // fetched value (and AdvancedSearchUI's prop type) is an array; cast
  // preserves the existing literal.
  const [collectionData, setCollectionData] = useState<Collection[]>(
    {} as unknown as Collection[],
  );
  const [kindsData, setKindsData] = useState<ObjectKind[]>([]);
  const [searchResults, setSearchResults] = useState<MuseumObject[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  // NOTE(wp-types): the initial state is an empty ARRAY that is then
  // treated as a params object; cast preserves the existing literal.
  const [currentSearchParams, setCurrentSearchParams] =
    useState<AdvancedSearchParams>([] as unknown as AdvancedSearchParams);

  const baseRestPath = "/wp-museum/v1";

  useEffect(() => {
    updateCollectionData();
    updateKindsData();

    if (runOnLoad && defaultSearch) {
      onSearch(JSON.parse(defaultSearch));
    }
  }, []);

  const updateCollectionData = () => {
    apiFetch<Collection[]>({ path: `${baseRestPath}/collections` }).then(
      (result) => setCollectionData(result),
    );
  };

  const updateKindsData = () => {
    apiFetch<ObjectKind[]>({ path: `${baseRestPath}/mobject_kinds` }).then(
      (result) => setKindsData(result),
    );
  };

  const getFieldData = (postType: string) => {
    return apiFetch<ObjectFieldsResponse>({
      path: `${baseRestPath}/${postType}/fields`,
    });
  };

  const onSearch = (searchParams: AdvancedSearchParams) => {
    // NOTE(wp-types): `undefined > 0` is false at runtime, so the cast
    // preserves the existing comparison; inside the branch searchFields is
    // guaranteed non-empty, so the non-null assertion is safe.
    if ((searchParams.searchFields?.length as number) > 0) {
      for (const field of searchParams.searchFields!) {
        if (field.search) {
          if (!field.search.startsWith("~")) {
            (searchParams as Record<string, unknown>)[field.field as string] =
              `~${field.search}`;
          } else {
            (searchParams as Record<string, unknown>)[field.field as string] =
              field.search;
          }
        }
      }
    }
    if (searchParams.selectedFlags?.length) {
      for (const flag of searchParams.selectedFlags) {
        (searchParams as Record<string, unknown>)[flag] = true;
      }
    }
    // Use resultsPerPage setting (-1 means unlimited/all results)
    searchParams.per_page = resultsPerPage;
    setCurrentSearchParams(searchParams);
    apiFetch({
      path: `${baseRestPath}/search`,
      method: "POST",
      data: searchParams,
      parse: false,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setCurrentPage(parseInt(response.headers.get("X-WP-Page") ?? "") || 1);
        setTotalPages(
          parseInt(response.headers.get("X-WP-TotalPages") ?? "") || 0,
        );
        return response.json();
      })
      .then((data) => {
        setSearchResults(data);
      })
      .catch((error) => {
        console.error("Search request failed:", error);
        setSearchResults([]); // Reset to empty state on error
        setCurrentPage(1);
        setTotalPages(0);
      });
  };

  return (
    <>
      {!fixSearch && (
        <AdvancedSearchUI
          defaultSearch={defaultSearch}
          showFlags={showFlags}
          showCollections={showCollections}
          showTags={showTags}
          showFields={showFields}
          showObjectType={showObjectType}
          showTitleToggle={showTitleToggle}
          collectionData={collectionData}
          kindsData={kindsData}
          getFieldData={getFieldData}
          inEditor={false}
          onSearch={onSearch}
        />
      )}
      {searchResults && (
        <PaginatedObjectGrid
          currentPage={currentPage}
          totalPages={totalPages}
          searchCallback={onSearch}
          /* NOTE(wp-types): AdvancedSearchParams carries extra keys
             (searchFields, selectedFlags, …) beyond MuseumObjectSearchParams'
             index signature; cast preserves what is sent today. */
          searchParams={currentSearchParams as MuseumObjectSearchParams}
          mObjects={searchResults}
          columns={columns}
          displayTitle={true}
          displayDate={false}
          displayExcerpt={false}
          linkToObjects={true}
          doObjectModal={false}
        />
      )}
    </>
  );
};

export default AdvancedSearchFront;
