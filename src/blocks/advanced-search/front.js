import { useState, useEffect, createRoot } from "@wordpress/element";

import apiFetch from "@wordpress/api-fetch";

import { AdvancedSearchUI, ObjectGrid, withPagination } from "../../components";

const PaginatedObjectGrid = withPagination(ObjectGrid);

window.addEventListener("DOMContentLoaded", () => {
  const advancedSearchElements = document.getElementsByClassName(
    "wpm-advanced-search-block-frontend",
  );
  if (!!advancedSearchElements) {
    for (let i = 0; i < advancedSearchElements.length; i++) {
      const advancedSearchElement = advancedSearchElements[i];
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

const AdvancedSearchFront = (props) => {
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
  } = attributes;

  const [collectionData, setCollectionData] = useState({});
  const [kindsData, setKindsData] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchParams, setCurrentSearchParams] = useState([]);

  const baseRestPath = "/wp-museum/v1";

  useEffect(() => {
    updateCollectionData();
    updateKindsData();

    if (runOnLoad && defaultSearch) {
      onSearch(JSON.parse(defaultSearch));
    }
  }, []);

  const updateCollectionData = () => {
    apiFetch({ path: `${baseRestPath}/collections` }).then((result) =>
      setCollectionData(result),
    );
  };

  const updateKindsData = () => {
    apiFetch({ path: `${baseRestPath}/mobject_kinds` }).then((result) =>
      setKindsData(result),
    );
  };

  const getFieldData = (postType) => {
    return apiFetch({ path: `${baseRestPath}/${postType}/fields` });
  };

  const onSearch = (searchParams) => {
    if (searchParams.searchFields?.length > 0) {
      for (const field of searchParams.searchFields) {
        if (field.search) {
          if (!field.search.startsWith("~")) {
            searchParams[field.field] = `~${field.search}`;
          } else {
            searchParams[field.field] = field.search;
          }
        }
      }
    }
    if (searchParams.selectedFlags?.length) {
      for (const flag of searchParams.selectedFlags) {
        searchParams[flag] = true;
      }
    }
    searchParams.per_page = gridRows * columns;
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
  if (
    searchResults.length > 0 &&
    typeof searchResults[0].query_data !== "undefined"
  ) {
    currentPage = searchResults[0].query_data.current_page;
    totalPages = searchResults[0].query_data.num_pages;
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
