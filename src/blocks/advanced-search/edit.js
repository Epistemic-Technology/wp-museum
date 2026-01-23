/**
 * WordPress dependencies
 */
import { useState, useEffect } from "@wordpress/element";

import { InspectorControls, useBlockProps } from "@wordpress/block-editor";

import {
  PanelBody,
  CheckboxControl,
  SelectControl,
} from "@wordpress/components";

import apiFetch from "@wordpress/api-fetch";

//import './editor.scss';

/**
 * Internal dependencies
 */
import { AdvancedSearchUI, ObjectGrid, withPagination } from "../../components";

const PaginatedObjectGrid = withPagination(ObjectGrid);

const AdvancedSearchEdit = (props) => {
  const { attributes, setAttributes } = props;

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

  const [collectionData, setCollectionData] = useState({});
  const [kindsData, setKindsData] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchParams, setCurrentSearchParams] = useState({});

  const baseRestPath = "/wp-museum/v1";

  useEffect(() => {
    updateCollectionData();
    updateKindsData();
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
    for (const [key, value] of Object.entries(searchParams)) {
      if (key != "page" && value != currentSearchParams[key]) {
        searchParams["page"] = 1;
        break;
      }
    }
    // Use resultsPerPage setting (-1 means unlimited/all results)
    searchParams["posts_per_page"] = resultsPerPage;
    setCurrentSearchParams(searchParams);
    apiFetch({
      path: `${baseRestPath}/search`,
      method: "POST",
      data: searchParams,
    }).then((result) => {
      setSearchResults(result);
    });
  };

  const blockProps = useBlockProps();

  return (
    <div {...blockProps}>
      <InspectorControls>
        <PanelBody title="Search Options">
          <CheckboxControl
            label="Fix Search"
            checked={fixSearch}
            onChange={(val) => setAttributes({ fixSearch: val })}
          />
          <CheckboxControl
            label="Run Search on Load"
            checked={runOnLoad}
            onChange={(val) => setAttributes({ runOnLoad: val })}
          />
        </PanelBody>
        <PanelBody title="Search Sections">
          <CheckboxControl
            label="Show Object Type"
            checked={showObjectType}
            onChange={(val) => setAttributes({ showObjectType: val })}
          />
          <CheckboxControl
            label="Show Title Toggle"
            checked={showTitleToggle}
            onChange={(val) => setAttributes({ showTitleToggle: val })}
          />
          <CheckboxControl
            label="Show Flags"
            checked={showFlags}
            onChange={(val) => setAttributes({ showFlags: val })}
          />
          <CheckboxControl
            label="Show Collections"
            checked={showCollections}
            onChange={(val) => setAttributes({ showCollections: val })}
          />
          <CheckboxControl
            label="Show Tags"
            checked={showTags}
            onChange={(val) => setAttributes({ showTags: val })}
          />
          <CheckboxControl
            label="Show Fields"
            checked={showFields}
            onChange={(val) => setAttributes({ showFields: val })}
          />
        </PanelBody>
        <PanelBody title="Results">
          <SelectControl
            label="Results per Page"
            value={resultsPerPage}
            onChange={(val) => setAttributes({ resultsPerPage: parseInt(val) })}
            options={[
              { value: 20, label: "20" },
              { value: 40, label: "40" },
              { value: 60, label: "60" },
              { value: 80, label: "80" },
              { value: 100, label: "100" },
              { value: -1, label: "Unlimited" },
            ]}
          />
          <SelectControl
            label="Grid Columns"
            value={columns}
            onChange={(val) => setAttributes({ columns: parseInt(val) })}
            options={[
              { value: 1, label: "1" },
              { value: 2, label: "2" },
              { value: 3, label: "3" },
              { value: 4, label: "4" },
              { value: 5, label: "5" },
              { value: 6, label: "6" },
            ]}
          />
        </PanelBody>
      </InspectorControls>
      <AdvancedSearchUI
        defaultSearch={defaultSearch}
        showFlags={showFlags}
        showCollections={showCollections}
        showTags={showTags}
        showFields={showFields}
        showObjectType={showObjectType}
        fixSearch={fixSearch}
        showTitleToggle={showTitleToggle}
        collectionData={collectionData}
        kindsData={kindsData}
        getFieldData={getFieldData}
        inEditor={true}
        setAttributes={setAttributes}
        onSearch={onSearch}
      />
      {searchResults && searchResults.length > 0 && (
        <PaginatedObjectGrid
          currentPage={searchResults[0]?.query_data?.current_page || 1}
          totalPages={searchResults[0]?.query_data?.num_pages || 0}
          searchCallback={onSearch}
          searchParams={currentSearchParams}
          mObjects={searchResults}
          columns={columns}
          displayTitle={true}
          displayDate={false}
          displayExcerpt={true}
          linkToObjects={false}
          doObjectModal={true}
        />
      )}
    </div>
  );
};

export default AdvancedSearchEdit;
