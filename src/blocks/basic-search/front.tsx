/**
 * WordPress dependencies
 */
import { useState, useEffect, createRoot } from "@wordpress/element";

import apiFetch from "@wordpress/api-fetch";

/**
 * Internal dependencies
 */
import { baseRestPath, attributesFromJSON } from "../../javascript/util";

import { EmbeddedSearch, ObjectGrid, withPagination } from "../../components";

import type { MuseumObject, MuseumObjectSearchParams } from "../../types";

const PaginatedObjectGrid = withPagination(ObjectGrid);

interface BasicSearchFrontAttributes {
  searchText?: string;
  onlyTitle?: boolean;
  resultsPerPage?: number;
  advancedSearchLink?: string;
  acceptGETRequest?: boolean;
  columns?: number;
}

interface BasicSearchFrontProps {
  attributes: BasicSearchFrontAttributes;
}

const BasicSearchFront = (props: BasicSearchFrontProps) => {
  const { attributes } = props;

  const {
    searchText = "",
    onlyTitle = true,
    resultsPerPage = 20,
    advancedSearchLink = "",
    acceptGETRequest = true,
    columns = 3,
  } = attributes;

  // TODO(ts-migration): the initial state is an empty ARRAY that is then
  // treated as a params object; cast preserves the existing literal.
  const [currentSearchParams, setCurrentSearchParams] =
    useState<MuseumObjectSearchParams>([] as unknown as MuseumObjectSearchParams);
  const [searchResults, setSearchResults] = useState<MuseumObject[]>([]);
  const [currentSearchText, setCurrentSearchText] = useState(searchText);

  const onSearch = (searchParams: MuseumObjectSearchParams) => {
    for (const [key, value] of Object.entries(searchParams)) {
      if (key != "page" && value != currentSearchParams[key]) {
        searchParams["page"] = 1;
        break;
      }
    }
    // TODO(ts-migration): pre-existing bug — the server ignores `numberposts`
    // (only per_page, page, etc. are read); preserved as-is.
    searchParams["numberposts"] = resultsPerPage;
    if (searchParams["searchText"]) {
      apiFetch<MuseumObject[]>({
        path: `${baseRestPath}/search`,
        method: "POST",
        data: searchParams,
      }).then((result) => {
        setSearchResults(result);
      });
    } else {
      setSearchResults([]);
    }
  };

  useEffect(() => {
    if (acceptGETRequest) {
      const newSearchParams = {
        ...currentSearchParams,
        searchText: searchText,
        onlyTitle: onlyTitle,
      };
      setCurrentSearchParams(newSearchParams);
      onSearch(newSearchParams);
    } else {
      setCurrentSearchParams({
        searchText: "",
        onlyTitle: onlyTitle,
      });
    }
  }, []);

  let currentPage = 1;
  let totalPages = 0;
  // TODO(ts-migration): pre-existing bug — `query_data` never exists on the
  // wire (schema-stripped); pagination info actually arrives via X-WP-*
  // headers, so this branch never runs. Casts preserve current behavior.
  if (
    searchResults.length > 0 &&
    typeof (searchResults[0] as any).query_data != "undefined"
  ) {
    currentPage = (searchResults[0] as any).query_data.current_page;
    totalPages = (searchResults[0] as any).query_data.num_pages;
  }

  return (
    <div className="wpm-basic-search-block">
      <EmbeddedSearch
        searchDefaults={currentSearchParams}
        runSearch={onSearch}
        updateSearchText={setCurrentSearchText}
        showReset={false}
        showTitleToggle={true}
        onlyTitleDefault={onlyTitle}
      />
      {!!advancedSearchLink && (
        <a
          href={`${advancedSearchLink}?searchText=${currentSearchText}`}
          aria-label={`Go to advanced search page${currentSearchText ? ` with search term: ${currentSearchText}` : ''}`}
        >
          Advanced Search
        </a>
      )}
      {searchResults && (
        <PaginatedObjectGrid
          currentPage={currentPage}
          totalPages={totalPages}
          searchCallback={onSearch}
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
    </div>
  );
};

const basicSearchElements = document.getElementsByClassName(
  "wpm-basic-search-block-frontend",
);
if (!!basicSearchElements) {
  for (let i = 0; i < basicSearchElements.length; i++) {
    const basicSearchElement = basicSearchElements[i] as HTMLElement;
    // TODO(strict): dataset.attributes may be undefined at runtime if the
    // data attribute is missing; cast preserves existing behavior.
    const attributes = attributesFromJSON(
      basicSearchElement.dataset.attributes as string,
    ) as BasicSearchFrontAttributes;
    const root = createRoot(basicSearchElement);
    root.render(<BasicSearchFront attributes={attributes} />);
  }
}
