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
const PaginatedObjectGrid = withPagination(ObjectGrid);

const BasicSearchFront = (props) => {
  const { attributes } = props;

  const {
    searchText = "",
    onlyTitle = true,
    resultsPerPage = 20,
    advancedSearchLink = "",
    acceptGETRequest = true,
    columns = 3,
  } = attributes;

  const [currentSearchParams, setCurrentSearchParams] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchText, setCurrentSearchText] = useState(searchText);

  const onSearch = (searchParams) => {
    for (const [key, value] of Object.entries(searchParams)) {
      if (key != "page" && value != currentSearchParams[key]) {
        searchParams["page"] = 1;
        break;
      }
    }
    searchParams["numberposts"] = resultsPerPage;
    if (searchParams["searchText"]) {
      apiFetch({
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
  if (
    searchResults.length > 0 &&
    typeof searchResults[0].query_data != "undefined"
  ) {
    currentPage = searchResults[0].query_data.current_page;
    totalPages = searchResults[0].query_data.num_pages;
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
        <a href={`${advancedSearchLink}?searchText=${currentSearchText}`}>
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
    const basicSearchElement = basicSearchElements[i];
    const attributes = attributesFromJSON(
      basicSearchElement.dataset.attributes,
    );
    const root = createRoot(basicSearchElement);
    root.render(<BasicSearchFront attributes={attributes} />);
  }
}
