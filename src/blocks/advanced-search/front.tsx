import { useState, useEffect, createRoot } from "@wordpress/element";

import apiFetch from "@wordpress/api-fetch";

import { AdvancedSearchUI, ObjectGrid, withPagination } from "../../components";

import { searchObjects } from "../../javascript/util";

import { toSearchRequest } from "./search-params";

import type { AdvancedSearchValues } from "./search-params";

import type {
  Collection,
  MuseumObject,
  ObjectFieldsResponse,
  ObjectKind,
} from "../../types";

const PaginatedObjectGrid = withPagination(ObjectGrid);

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [currentSearchParams, setCurrentSearchParams] =
    useState<AdvancedSearchValues>({});

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

  const onSearch = (searchParams: AdvancedSearchValues) => {
    setCurrentSearchParams(searchParams);
    // resultsPerPage of -1 means unlimited/all results.
    searchObjects(toSearchRequest(searchParams, resultsPerPage))
      .then((results) => {
        setSearchResults(results.objects);
        setCurrentPage(results.currentPage);
        setTotalPages(results.totalPages);
      })
      .catch((error) => {
        console.error("Search request failed:", error);
        // Reset to empty state on error.
        setSearchResults([]);
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
          /* withPagination sets `page` on these and hands them back to
             onSearch, which turns them into a request; they are the block's
             working values, not the wire shape. */
          searchParams={currentSearchParams}
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
