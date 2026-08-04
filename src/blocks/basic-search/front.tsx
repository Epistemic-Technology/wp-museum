/**
 * WordPress dependencies
 */
import { useState, useEffect, createRoot } from "@wordpress/element";

/**
 * Internal dependencies
 */
import { attributesFromJSON, searchObjects } from "../../javascript/util";

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

  // NOTE(wp-types): the initial state is an empty ARRAY that is then
  // treated as a params object; cast preserves the existing literal.
  const [currentSearchParams, setCurrentSearchParams] =
    useState<MuseumObjectSearchParams>([] as unknown as MuseumObjectSearchParams);
  const [searchResults, setSearchResults] = useState<MuseumObject[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [currentSearchText, setCurrentSearchText] = useState(searchText);

  const onSearch = (searchParams: MuseumObjectSearchParams) => {
    for (const [key, value] of Object.entries(searchParams)) {
      if (key != "page" && value != currentSearchParams[key]) {
        searchParams["page"] = 1;
        break;
      }
    }
    searchParams["per_page"] = resultsPerPage;
    if (searchParams["searchText"]) {
      searchObjects(searchParams)
        .then((results) => {
          setSearchResults(results.objects);
          setCurrentPage(results.currentPage);
          setTotalPages(results.totalPages);
        })
        .catch((error) => {
          console.error("Search request failed:", error);
          setSearchResults([]);
          setCurrentPage(1);
          setTotalPages(0);
        });
    } else {
      setSearchResults([]);
      setCurrentPage(1);
      setTotalPages(0);
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
