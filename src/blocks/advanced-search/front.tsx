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
 * TODO(ts-migration): pre-existing bug — the server ignores posts_per_page,
 * selectedFlags, selectedKind, and searchFields (only per_page, page, status,
 * s/searchText, onlyTitle, post_title, post_content, tilde-prefixed field
 * slugs, selectedCollections, and selectedTags are read); shape preserved
 * as-is.
 */
interface AdvancedSearchParams {
  page?: number;
  per_page?: number;
  posts_per_page?: number;
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

  // TODO(ts-migration): the initial state is an empty OBJECT while the
  // fetched value (and AdvancedSearchUI's prop type) is an array; cast
  // preserves the existing literal.
  const [collectionData, setCollectionData] = useState<Collection[]>(
    {} as unknown as Collection[],
  );
  const [kindsData, setKindsData] = useState<ObjectKind[]>([]);
  const [searchResults, setSearchResults] = useState<MuseumObject[]>([]);
  // TODO(ts-migration): the initial state is an empty ARRAY that is then
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
    // TODO(strict): `undefined > 0` is false at runtime, so the cast
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
        return response.json();
      })
      .then((data) => {
        setSearchResults(data);
      })
      .catch((error) => {
        console.error("Search request failed:", error);
        setSearchResults([]); // Reset to empty state on error
      });
  };

  let currentPage = 1;
  let totalPages = 0;
  // TODO(ts-migration): pre-existing bug — `query_data` never exists on the
  // wire (schema-stripped); pagination info actually arrives via X-WP-*
  // headers, so this branch never runs. Casts preserve current behavior.
  if (
    searchResults.length > 0 &&
    typeof (searchResults[0] as any).query_data !== "undefined"
  ) {
    currentPage = (searchResults[0] as any).query_data.current_page;
    totalPages = (searchResults[0] as any).query_data.num_pages;
  }

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
          /* TODO(ts-migration): AdvancedSearchParams carries extra keys
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
